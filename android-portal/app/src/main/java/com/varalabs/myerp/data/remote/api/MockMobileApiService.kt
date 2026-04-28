package com.varalabs.myerp.data.remote.api

import kotlinx.coroutines.delay
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.ResponseBody.Companion.toResponseBody
import retrofit2.Response

class MockMobileApiService : MobileApiService {

    override suspend fun login(request: LoginRequest): Response<AuthResponse> {
        delay(900)

        if (request.password.isEmpty()) {
            return Response.error(
                401,
                """{"error":"INVALID_CREDENTIALS"}""".toResponseBody("application/json".toMediaTypeOrNull())
            )
        }

        val role = when {
            request.email.startsWith("admin") -> "Admin"
            request.email.startsWith("teacher") -> "Teacher"
            request.email.startsWith("student") -> "Student"
            request.email.startsWith("guardian") -> "Guardian"
            else -> "Teacher"
        }

        val permissions = when (role) {
            "Admin" -> listOf(
                "dashboard.view", "students.view", "students.manage",
                "fees.view", "fees.manage", "attendance.view", "attendance.manage",
                "notices.view", "notices.manage"
            )
            "Teacher" -> listOf(
                "dashboard.view", "students.view", "attendance.view",
                "attendance.manage", "notices.view"
            )
            else -> listOf("dashboard.view", "notices.view")
        }

        return Response.success(
            AuthResponse(
                status = "OK",
                access_token = "mock-access-token-${System.currentTimeMillis()}",
                refresh_token = "mock-refresh-token",
                expires_in = 900,
                user = UserDto(
                    id = "user-mock-001",
                    name = "$role User",
                    email = request.email,
                    photo_url = null,
                    org_role = role,
                    permissions = permissions
                ),
                org = OrgDto(
                    id = "org-mock-001",
                    name = "Varalabs Demo School",
                    display_name = "Varalabs",
                    logo_url = null,
                    active_modules = listOf("dashboard", "students", "fees", "attendance", "noticeboard"),
                    theme_color = "#007AFF"
                )
            )
        )
    }

    override suspend fun selectOrg(request: SelectOrgRequest): Response<SelectOrgResponse> {
        delay(600)
        return Response.success(
            SelectOrgResponse(
                access_token = "mock-access-token-${System.currentTimeMillis()}",
                refresh_token = "mock-refresh-token",
                expires_in = 900,
                user = UserDto(
                    id = "user-mock-001",
                    name = "Admin User",
                    email = "admin@example.com",
                    photo_url = null,
                    org_role = "Admin",
                    permissions = listOf("dashboard.view", "students.view", "fees.view")
                ),
                org = OrgDto(
                    id = request.org_id,
                    name = "Selected Campus",
                    display_name = "Campus",
                    logo_url = null,
                    active_modules = listOf("dashboard", "students", "fees", "attendance", "noticeboard"),
                    theme_color = "#007AFF"
                )
            )
        )
    }

    override suspend fun refresh(request: RefreshRequest): Response<RefreshResponse> {
        delay(300)
        return Response.success(
            RefreshResponse(
                access_token = "mock-refreshed-token-${System.currentTimeMillis()}",
                expires_in = 900
            )
        )
    }

    override suspend fun logout(request: LogoutRequest): Response<Unit> {
        delay(200)
        return Response.success(Unit)
    }
}
