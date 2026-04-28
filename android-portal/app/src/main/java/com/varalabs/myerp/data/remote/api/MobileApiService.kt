package com.varalabs.myerp.data.remote.api

import retrofit2.Response
import retrofit2.http.*

interface MobileApiService {
    @POST("/api/mobile/auth")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("/api/mobile/auth/select-org")
    suspend fun selectOrg(@Body request: SelectOrgRequest): Response<SelectOrgResponse>

    @POST("/api/mobile/refresh")
    suspend fun refresh(@Body request: RefreshRequest): Response<RefreshResponse>

    @DELETE("/api/mobile/logout")
    suspend fun logout(@Body request: LogoutRequest): Response<Unit>
}

// ── Request types ────────────────────────────────────────────────────────────

data class LoginRequest(
    val email: String,
    val password: String,
    val device_id: String,
    val push_token: String? = null
)

data class SelectOrgRequest(
    val session_token: String,
    val org_id: String,
    val device_id: String
)

data class RefreshRequest(
    val refresh_token: String,
    val device_id: String
)

data class LogoutRequest(val device_id: String)

// ── Response types ───────────────────────────────────────────────────────────

/**
 * The /auth response can be:
 *  - status == "OK"                    → access_token, refresh_token, user, org
 *  - status == "ORG_SELECTION_REQUIRED" → session_token, orgs
 */
data class AuthResponse(
    val status: String,
    // OK fields
    val access_token: String? = null,
    val refresh_token: String? = null,
    val expires_in: Int? = null,
    val user: UserDto? = null,
    val org: OrgDto? = null,
    // ORG_SELECTION_REQUIRED fields
    val session_token: String? = null,
    val orgs: List<OrgBriefDto>? = null
)

/** Full org payload returned after successful login. */
data class OrgDto(
    val id: String,
    val name: String,
    val display_name: String? = null,
    val logo_url: String?,
    val active_modules: List<String>,
    val theme_color: String? = null
)

/** Lightweight org entry for the org-selection screen. */
data class OrgBriefDto(
    val id: String,
    val name: String,
    val display_name: String? = null,
    val logo_url: String?,
    val theme_color: String? = null
)

/** Returned by /auth/select-org — same shape as the OK path of /auth. */
data class SelectOrgResponse(
    val access_token: String,
    val refresh_token: String,
    val expires_in: Int,
    val user: UserDto,
    val org: OrgDto
)

data class UserDto(
    val id: String,
    val name: String,
    val email: String,
    val photo_url: String?,
    val org_role: String,
    val permissions: List<String>
)

data class RefreshResponse(
    val access_token: String,
    val expires_in: Int
)
