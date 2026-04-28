package com.varalabs.myerp.di

import com.apollographql.apollo.ApolloClient
import com.apollographql.apollo.network.okHttpClient
import com.varalabs.myerp.data.local.TokenManager
import com.varalabs.myerp.data.remote.api.MobileApiService
import com.varalabs.myerp.data.remote.api.RefreshRequest
import com.varalabs.myerp.util.DeviceIdProvider
import dagger.Lazy
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.*
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private const val BASE_URL = "https://api.varalabs.dev"
    private val tokenRefreshMutex = Mutex()

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BODY }

    /** Paths that authenticate via request body, not Bearer token. */
    private val UNAUTHENTICATED_PATHS = listOf(
        "/api/mobile/auth",      // login + select-org (body: email+password / session_token)
        "/api/mobile/refresh",   // token refresh (body: refresh_token + device_id)
    )

    @Provides
    @Singleton
    fun provideAuthInterceptor(tokenManager: TokenManager): Interceptor =
        Interceptor { chain ->
            val original = chain.request()
            val path = original.url.encodedPath

            // Login and refresh authenticate via their request body, not Bearer.
            // Attaching an expired access token would cause the backend auth
            // middleware to reject the request with 401 before the handler runs.
            val skipBearer = UNAUTHENTICATED_PATHS.any { path.startsWith(it) }

            val token = if (!skipBearer) tokenManager.getAccessToken() else null
            val request = if (token != null) {
                original.newBuilder()
                    .header("Authorization", "Bearer $token")
                    .build()
            } else {
                original
            }
            chain.proceed(request)
        }

    @Provides
    @Singleton
    fun provideAuthenticator(
        tokenManager: TokenManager,
        apiService: Lazy<MobileApiService>,
        deviceIdProvider: DeviceIdProvider
    ): Authenticator = Authenticator { _, response ->
        // Don't try to refresh for endpoints that don't use Bearer auth.
        // A 401 on login/refresh means bad credentials, not an expired token.
        val path = response.request.url.encodedPath
        if (UNAUTHENTICATED_PATHS.any { path.startsWith(it) }) {
            return@Authenticator null
        }

        // Only try to refresh if we have a refresh token
        val refreshToken = tokenManager.getRefreshToken() ?: return@Authenticator null

        runBlocking {
            tokenRefreshMutex.withLock {
                val currentAccessToken = tokenManager.getAccessToken()
                val requestAccessToken = response.request.header("Authorization")?.removePrefix("Bearer ")

                // If the token has already been changed, retry with the new token
                if (currentAccessToken != null && currentAccessToken != requestAccessToken) {
                    return@runBlocking response.request.newBuilder()
                        .header("Authorization", "Bearer $currentAccessToken")
                        .build()
                }

                // Call refresh endpoint
                val deviceId = deviceIdProvider.getDeviceId()
                try {
                    val refreshResponse = apiService.get().refresh(RefreshRequest(refreshToken, deviceId))
                    if (refreshResponse.isSuccessful && refreshResponse.body() != null) {
                        val newAccessToken = refreshResponse.body()!!.access_token
                        tokenManager.saveAccessToken(newAccessToken)

                        response.request.newBuilder()
                            .header("Authorization", "Bearer $newAccessToken")
                            .build()
                    } else {
                        tokenManager.clearTokens()
                        null
                    }
                } catch (e: Exception) {
                    null
                }
            }
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor,
        authInterceptor: Interceptor,
        authenticator: Authenticator
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor(authInterceptor)
        .authenticator(authenticator)
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    @Provides
    @Singleton
    fun provideMobileApiService(retrofit: Retrofit): MobileApiService =
        retrofit.create(MobileApiService::class.java)

    @Provides
    @Singleton
    fun provideApolloClient(okHttpClient: OkHttpClient): ApolloClient =
        ApolloClient.Builder()
            .serverUrl("$BASE_URL/graphql")
            .okHttpClient(okHttpClient)
            .build()
}
