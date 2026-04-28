package com.varalabs.myerp.data.repository

import com.apollographql.apollo.ApolloClient
import com.apollographql.apollo.api.Optional
import com.varalabs.myerp.*
import com.varalabs.myerp.type.AttendanceEntryInput
import javax.inject.Inject
import javax.inject.Singleton

/**
 * All GraphQL queries and mutations for the ERP app.
 * Every method returns Result<T> — the ViewModel surfaces errors.
 */
@Singleton
class ErpRepository @Inject constructor(
    private val apolloClient: ApolloClient
) {

    suspend fun getMe(): Result<MobileMeQuery.Me> {
        return try {
            val response = apolloClient.query(MobileMeQuery()).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.me)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getDashboard(): Result<MobileDashboardQuery.Dashboard> {
        return try {
            val response = apolloClient.query(MobileDashboardQuery()).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.dashboard)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getStudents(className: String? = null): Result<List<MobileStudentsQuery.Student>> {
        return try {
            val response = apolloClient.query(
                MobileStudentsQuery(className = Optional.presentIfNotNull(className))
            ).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.students)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getStudentDetail(id: String): Result<MobileStudentDetailQuery.Student> {
        return try {
            val response = apolloClient.query(MobileStudentDetailQuery(id = id)).execute()
            if (response.hasErrors()) return err(response)
            val student = response.data!!.student
                ?: return Result.failure(Exception("Student not found"))
            Result.success(student)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getFeeRecords(studentId: String): Result<List<MobileFeeRecordsQuery.FeeRecord>> {
        return try {
            val response = apolloClient.query(MobileFeeRecordsQuery(studentId = studentId)).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.feeRecords)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getStudentAttendance(
        studentId: String?,
        from: String,
        to: String
    ): Result<List<MobileStudentAttendanceQuery.AttendanceRecord>> {
        return try {
            val response = apolloClient.query(
                MobileStudentAttendanceQuery(
                    studentId = Optional.presentIfNotNull(studentId),
                    from = from,
                    to = to
                )
            ).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.attendanceRecords)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getClassAttendance(
        className: String?,
        date: String?,
        from: String,
        to: String
    ): Result<List<MobileClassAttendanceQuery.AttendanceRecord>> {
        return try {
            val response = apolloClient.query(
                MobileClassAttendanceQuery(
                    className = Optional.presentIfNotNull(className),
                    date = Optional.presentIfNotNull(date),
                    from = from,
                    to = to
                )
            ).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.attendanceRecords)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getNotices(): Result<List<MobileNoticesQuery.Notice>> {
        return try {
            val response = apolloClient.query(MobileNoticesQuery()).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.notices)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getOrgPlugins(): Result<List<MobileOrgPluginsQuery.OrgPlugin>> {
        return try {
            val response = apolloClient.query(MobileOrgPluginsQuery()).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.orgPlugins)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMyPayslips(): Result<List<MobileMyPayslipsQuery.MyPayslip>> {
        return try {
            val response = apolloClient.query(MobileMyPayslipsQuery()).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.myPayslips)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markAttendance(
        date: String,
        entries: List<AttendanceEntryInput>
    ): Result<Boolean> {
        return try {
            val response = apolloClient.mutation(
                MobileMarkAttendanceMutation(date = date, entries = entries)
            ).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.markAttendance)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateMyProfile(
        name: String?,
        phone: String?
    ): Result<MobileUpdateProfileMutation.UpdateMyProfile> {
        return try {
            val response = apolloClient.mutation(
                MobileUpdateProfileMutation(
                    name = Optional.presentIfNotNull(name),
                    phone = Optional.presentIfNotNull(phone)
                )
            ).execute()
            if (response.hasErrors()) return err(response)
            Result.success(response.data!!.updateMyProfile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private fun <T> err(response: com.apollographql.apollo.api.ApolloResponse<*>): Result<T> {
        val code = response.errors?.firstOrNull()?.extensions?.get("code") as? String
        val message = response.errors?.firstOrNull()?.message ?: "GraphQL error"
        return if (code == "UNAUTHENTICATED" || code == "TOKEN_INVALID" || code == "SESSION_EXPIRED") {
            Result.failure(UnauthenticatedException())
        } else {
            Result.failure(Exception(message))
        }
    }
}

class UnauthenticatedException : Exception("Session expired. Please sign in again.")
