package com.varalabs.myerp.data.repository

import com.varalabs.myerp.data.local.SessionStore
import com.varalabs.myerp.data.local.TokenManager
import com.varalabs.myerp.data.remote.api.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: MobileApiService,
    private val tokenManager: TokenManager,
    private val sessionStore: SessionStore
) {
    suspend fun login(request: LoginRequest): Result<AuthResponse> {
        return try {
            val response = apiService.login(request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.status == "OK") {
                    saveSession(body.access_token!!, body.refresh_token!!, body.user!!, body.org!!)
                }
                Result.success(body)
            } else {
                val errorCode = response.code()
                val message = when (errorCode) {
                    401 -> "Invalid email or password"
                    403 -> "Account is disabled"
                    404 -> "No account found for this email"
                    else -> "Login failed (${response.code()})"
                }
                Result.failure(Exception(message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun selectOrg(sessionToken: String, orgId: String, deviceId: String): Result<SelectOrgResponse> {
        return try {
            val response = apiService.selectOrg(SelectOrgRequest(sessionToken, orgId, deviceId))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                saveSession(body.access_token, body.refresh_token, body.user, body.org)
                Result.success(body)
            } else {
                val message = when (response.code()) {
                    401 -> "Session expired. Please sign in again."
                    403 -> "Invalid org selection."
                    else -> "Selection failed (${response.code()})"
                }
                Result.failure(Exception(message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(deviceId: String): Result<Unit> {
        return try {
            apiService.logout(LogoutRequest(deviceId))
            clearSession()
            Result.success(Unit)
        } catch (e: Exception) {
            clearSession()
            Result.success(Unit) // Always clear local session
        }
    }

    private fun saveSession(
        accessToken: String,
        refreshToken: String,
        user: UserDto,
        org: OrgDto
    ) {
        tokenManager.saveAccessToken(accessToken)
        tokenManager.saveRefreshToken(refreshToken)
        sessionStore.userId = user.id
        sessionStore.userName = user.name
        sessionStore.userEmail = user.email
        sessionStore.userPhotoUrl = user.photo_url
        sessionStore.userOrgRole = user.org_role
        sessionStore.orgId = org.id
        sessionStore.orgName = org.name
        sessionStore.orgDisplayName = org.display_name ?: org.name
        sessionStore.orgLogoUrl = org.logo_url
        sessionStore.orgThemeColor = org.theme_color ?: "#007AFF"
        sessionStore.activeModules = org.active_modules
    }

    private fun clearSession() {
        tokenManager.clearTokens()
        sessionStore.clear()
    }

    fun isLoggedIn(): Boolean {
        val token = tokenManager.getAccessToken()
        return token != null && token.isNotEmpty()
    }
}
