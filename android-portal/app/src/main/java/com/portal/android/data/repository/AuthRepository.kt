package com.portal.android.data.repository

import android.content.SharedPreferences
import android.provider.Settings
import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.auth0.android.jwt.JWT
import com.portal.android.data.api.*
import com.portal.android.data.model.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import timber.log.Timber
import java.io.IOException
import javax.inject.Inject
import javax.inject.Named
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "session_prefs")

/**
 * Repository for managing authentication state and token operations
 */
@Singleton
class AuthRepository @Inject constructor(
    private val api: MobileAuthApi,
    @Named("secure_prefs") private val securePrefs: SharedPreferences,
    @ApplicationContext private val context: Context
) {

    companion object {
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_TENANT_ID = "tenant_id"
        private const val KEY_ORG_ID = "org_id"
        private const val KEY_SYSTEM_ROLE = "system_role"
        private const val KEY_USER_INFO = "user_info"
        private const val KEY_ORG_INFO = "org_info"
    }

    /**
     * Get device ID (hashed ANDROID_ID) for mobile auth
     */
    fun getDeviceId(): String {
        val androidId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
        return sha256(androidId)
    }

    /**
     * Login with email and password
     */
    suspend fun login(email: String, password: String): Result<AuthResult> {
        return try {
            val request = LoginRequest(
                email = email,
                password = password,
                device_id = getDeviceId()
            )
            
            val response = api.login(request)
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    saveTokens(body.accessToken, body.refreshToken)
                    saveUserContext(
                        userId = body.user.id,
                        tenantId = body.org.id.substringBefore('-'), // Extract tenant from org
                        orgId = body.org.id,
                        systemRole = body.user.permissions.firstOrNull()?.let { 
                            when {
                                it.contains("superadmin") -> SystemRole.SUPERADMIN.value
                                it.contains("admin") -> SystemRole.TENANT_ADMIN.value
                                else -> SystemRole.USER.value
                            }
                        } ?: SystemRole.USER.value,
                        userInfo = body.user,
                        orgInfo = body.org
                    )
                    Result.success(AuthResult.Success(createUserContext(body)))
                } else {
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(Exception("Login failed: ${response.code()} - $errorBody"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Login failed")
            Result.failure(e)
        }
    }

    /**
     * Select organisation for multi-org users
     */
    suspend fun selectOrg(sessionToken: String, orgId: String): Result<UserContext> {
        return try {
            val request = SelectOrgRequest(
                session_token = sessionToken,
                org_id = orgId,
                device_id = getDeviceId()
            )
            
            val response = api.selectOrg(request)
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    saveTokens(body.accessToken, body.refreshToken)
                    saveUserContext(
                        userId = body.user.id,
                        tenantId = body.org.id.substringBefore('-'),
                        orgId = body.org.id,
                        systemRole = body.user.permissions.firstOrNull()?.let {
                            when {
                                it.contains("superadmin") -> SystemRole.SUPERADMIN.value
                                it.contains("admin") -> SystemRole.TENANT_ADMIN.value
                                else -> SystemRole.USER.value
                            }
                        } ?: SystemRole.USER.value,
                        userInfo = body.user,
                        orgInfo = body.org
                    )
                    Result.success(createUserContext(body))
                } else {
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                Result.failure(Exception("Org selection failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Org selection failed")
            Result.failure(e)
        }
    }

    /**
     * Refresh access token
     */
    suspend fun refreshAccessToken(): Result<String> {
        return try {
            val refreshToken = getRefreshToken() ?: return Result.failure(Exception("No refresh token"))
            
            val request = RefreshRequest(
                refresh_token = refreshToken,
                device_id = getDeviceId()
            )
            
            val response = api.refreshToken(request)
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body != null) {
                    saveTokens(body.accessToken, body.refreshToken)
                    Result.success(body.accessToken)
                } else {
                    Result.failure(Exception("Empty response body"))
                }
            } else {
                // Clear tokens on refresh failure
                clearSession()
                Result.failure(Exception("Refresh failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Token refresh failed")
            Result.failure(e)
        }
    }

    /**
     * Logout and revoke session
     */
    suspend fun logout(): Result<Unit> {
        return try {
            val request = LogoutRequest(device_id = getDeviceId())
            val response = api.logout(request)
            
            clearSession()
            
            if (response.isSuccessful || response.code() == 401) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Logout failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            // Still clear session even if API call fails
            clearSession()
            Timber.e(e, "Logout failed")
            Result.failure(e)
        }
    }

    /**
     * Check if user is authenticated
     */
    fun isAuthenticated(): Boolean {
        return getAccessToken() != null && !isTokenExpired()
    }

    /**
     * Get current user context if authenticated
     */
    fun getCurrentUser(): UserContext? {
        if (!isAuthenticated()) return null
        
        return try {
            val userId = securePrefs.getString(KEY_USER_ID, null) ?: return null
            val tenantId = securePrefs.getString(KEY_TENANT_ID, null) ?: return null
            val orgId = securePrefs.getString(KEY_ORG_ID, null) ?: return null
            val systemRoleStr = securePrefs.getString(KEY_SYSTEM_ROLE, null) ?: return null
            
            val userInfoJson = securePrefs.getString(KEY_USER_INFO, null) ?: return null
            val orgInfoJson = securePrefs.getString(KEY_ORG_INFO, null) ?: return null
            
            // Parse JSON back to objects (simplified - in production use Gson)
            UserContext(
                userId = userId,
                tenantId = tenantId,
                orgId = orgId,
                systemRole = SystemRole.fromValue(systemRoleStr),
                permissions = emptySet(), // Load from stored JSON in production
                roleSlugs = emptyList(),
                userInfo = parseUserInfo(userInfoJson),
                orgInfo = parseOrgInfo(orgInfoJson)
            )
        } catch (e: Exception) {
            Timber.e(e, "Failed to get current user")
            null
        }
    }

    /**
     * Flow of authentication state
     */
    val authState: Flow<Boolean> = context.dataStore.data
        .catch { exception ->
            if (exception is IOException) {
                Timber.e(exception, "Error reading auth state")
                emit(emptyPreferences())
            } else {
                throw exception
            }
        }
        .map { preferences ->
            !preferences[PreferencesKeys.ACCESS_TOKEN].isNullOrEmpty()
        }

    //region Private helper methods

    private suspend fun saveTokens(accessToken: String, refreshToken: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.ACCESS_TOKEN] = accessToken
            preferences[PreferencesKeys.REFRESH_TOKEN] = refreshToken
        }
        
        // Also store in encrypted prefs for quick access
        securePrefs.edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
        }.apply()
    }

    private fun saveUserContext(
        userId: String,
        tenantId: String,
        orgId: String,
        systemRole: String,
        userInfo: UserInfo,
        orgInfo: OrgInfo
    ) {
        securePrefs.edit().apply {
            putString(KEY_USER_ID, userId)
            putString(KEY_TENANT_ID, tenantId)
            putString(KEY_ORG_ID, orgId)
            putString(KEY_SYSTEM_ROLE, systemRole)
            // In production, serialize UserInfo and OrgInfo to JSON
            // For now, storing basic info
        }.apply()
    }

    private fun getAccessToken(): String? {
        return securePrefs.getString(KEY_ACCESS_TOKEN, null)
    }

    private fun getRefreshToken(): String? {
        return securePrefs.getString(KEY_REFRESH_TOKEN, null)
    }

    private fun isTokenExpired(): Boolean {
        val token = getAccessToken() ?: return true
        return try {
            val jwt = JWT(token)
            jwt.expiresAt?.before(java.util.Date()) ?: true
        } catch (e: Exception) {
            Timber.e(e, "Failed to decode JWT")
            true
        }
    }

    private fun clearSession() {
        securePrefs.edit().clear().apply()
    }

    private fun createUserContext(response: LoginResponse): UserContext {
        return UserContext(
            userId = response.user.id,
            tenantId = response.org.id.substringBefore('-'),
            orgId = response.org.id,
            systemRole = SystemRole.fromValue(
                response.user.permissions.firstOrNull()?.let {
                    when {
                        it.contains("superadmin") -> SystemRole.SUPERADMIN.value
                        it.contains("admin") -> SystemRole.TENANT_ADMIN.value
                        else -> SystemRole.USER.value
                    }
                } ?: SystemRole.USER.value
            ),
            permissions = response.user.permissions.toSet(),
            roleSlugs = listOf(response.user.orgRole),
            userInfo = response.user,
            orgInfo = response.org
        )
    }

    private fun sha256(input: String): String {
        val bytes = java.security.MessageDigest.getInstance("SHA-256")
            .digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun parseUserInfo(json: String): UserInfo {
        // In production, use Gson to parse
        return UserInfo("", "", "", null, "", emptyList())
    }

    private fun parseOrgInfo(json: String): OrgInfo {
        // In production, use Gson to parse
        return OrgInfo("", "", null, emptyList())
    }

    //endregion
}

/**
 * Sealed class for auth result
 */
sealed class AuthResult {
    data class Success(val userContext: UserContext) : AuthResult()
    data class OrgSelectionRequired(
        val sessionToken: String,
        val orgs: List<OrgOption>
    ) : AuthResult()
}

/**
 * Preferences keys for DataStore
 */
object PreferencesKeys {
    val ACCESS_TOKEN = stringPreferencesKey("access_token")
    val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
}
