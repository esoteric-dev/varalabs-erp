package com.portal.android.data.api

import com.portal.android.data.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface matching the mobile endpoints in mobile.rs
 * 
 * Endpoints:
 * - POST /api/mobile/auth
 * - POST /api/mobile/auth/select-org
 * - POST /api/mobile/refresh
 * - DELETE /api/mobile/logout
 */
interface MobileAuthApi {

    /**
     * Initial login with email/password
     * Returns either LoginResponse (single org) or OrgSelectionResponse (multiple orgs)
     */
    @POST("api/mobile/auth")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    /**
     * Select organisation for multi-org users
     */
    @POST("api/mobile/auth/select-org")
    suspend fun selectOrg(
        @Body request: SelectOrgRequest
    ): Response<LoginResponse>

    /**
     * Refresh access token using refresh token
     */
    @POST("api/mobile/refresh")
    suspend fun refreshToken(
        @Body request: RefreshRequest
    ): Response<RefreshResponse>

    /**
     * Logout and revoke session
     */
    @DELETE("api/mobile/logout")
    suspend fun logout(
        @Body request: LogoutRequest
    ): Response<Unit>
}

/**
 * Login request body
 */
data class LoginRequest(
    val email: String,
    val password: String,
    val device_id: String,
    val push_token: String? = null
)

/**
 * Select organisation request body
 */
data class SelectOrgRequest(
    val session_token: String,
    val org_id: String,
    val device_id: String
)

/**
 * Refresh token request body
 */
data class RefreshRequest(
    val refresh_token: String,
    val device_id: String
)

/**
 * Logout request body
 */
data class LogoutRequest(
    val device_id: String
)
