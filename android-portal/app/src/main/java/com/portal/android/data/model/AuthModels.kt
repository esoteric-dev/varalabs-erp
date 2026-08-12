package com.portal.android.data.model

import com.google.gson.annotations.SerializedName

/**
 * JWT Claims structure matching the backend Claims struct in auth.rs
 */
data class JwtClaims(
    @SerializedName("sub") val sub: String,
    @SerializedName("tenant_id") val tenantId: String,
    @SerializedName("org_id") val orgId: String,
    @SerializedName("system_role") val systemRole: String,
    @SerializedName("exp") val exp: Long
)

/**
 * User information returned from login
 */
data class UserInfo(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String,
    @SerializedName("photo_url") val photoUrl: String?,
    @SerializedName("org_role") val orgRole: String,
    @SerializedName("permissions") val permissions: List<String>
)

/**
 * Organisation information
 */
data class OrgInfo(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("logo_url") val logoUrl: String?,
    @SerializedName("active_modules") val activeModules: List<String>
)

/**
 * Login response for single-org users
 */
data class LoginResponse(
    @SerializedName("status") val status: String,
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    @SerializedName("expires_in") val expiresIn: Int,
    @SerializedName("user") val user: UserInfo,
    @SerializedName("org") val org: OrgInfo
)

/**
 * Org selection response for multi-org users
 */
data class OrgSelectionResponse(
    @SerializedName("status") val status: String,
    @SerializedName("session_token") val sessionToken: String,
    @SerializedName("orgs") val orgs: List<OrgOption>
)

data class OrgOption(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("logo_url") val logoUrl: String?
)

/**
 * Refresh token response
 */
data class RefreshResponse(
    @SerializedName("status") val status: String,
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    @SerializedName("expires_in") val expiresIn: Int
)

/**
 * Error response from backend
 */
data class ErrorResponse(
    @SerializedName("error") val error: String,
    @SerializedName("message") val message: String?
)

/**
 * System role enum matching backend SystemRole
 */
enum class SystemRole(val value: String) {
    SUPERADMIN("superadmin"),
    TENANT_ADMIN("tenant_admin"),
    USER("user");
    
    companion object {
        fun fromValue(value: String): SystemRole {
            return values().find { it.value == value } ?: USER
        }
    }
}

/**
 * Authenticated user context with decoded role
 */
data class UserContext(
    val userId: String,
    val tenantId: String,
    val orgId: String,
    val systemRole: SystemRole,
    val permissions: Set<String>,
    val roleSlugs: List<String>,
    val userInfo: UserInfo,
    val orgInfo: OrgInfo
)
