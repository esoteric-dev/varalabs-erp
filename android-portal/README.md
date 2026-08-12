# Android Portal App - README

## Overview
This Android application connects to your existing Rust backend using the same JWT authentication system. It implements role-based access control (RBAC) that bifurcates users into different dashboards based on their system role extracted from the JWT token.

## Architecture

### Backend Integration
The app uses the mobile-specific endpoints defined in `/workspace/app-gateway/src/mobile.rs`:
- `POST /api/mobile/auth` - Login with email/password
- `POST /api/mobile/auth/select-org` - Select organisation for multi-org users
- `POST /api/mobile/refresh` - Refresh access token
- `DELETE /api/mobile/logout` - Logout and revoke session

### Authentication Flow
1. User enters email/password
2. App sends credentials to `/api/mobile/auth` with device_id (SHA-256 hashed ANDROID_ID)
3. Backend validates credentials and returns:
   - **Single org user**: Access token + Refresh token + User info
   - **Multi-org user**: Session token + List of organisations
4. App decodes JWT to extract `system_role` claim
5. Dashboard is customized based on role:
   - **Superadmin**: Full system access
   - **TenantAdmin**: Tenant-level management
   - **User**: Limited access to assigned features

### Role-Based Dashboard
The dashboard dynamically shows/hides features based on:
- `system_role` from JWT claims
- `permissions` array from login response
- `active_modules` from organisation info

## Project Structure

```
android-portal/
├── app/
│   ├── src/main/java/com/portal/android/
│   │   ├── data/
│   │   │   ├── api/           # Retrofit API interfaces
│   │   │   ├── model/         # Data classes matching backend structs
│   │   │   └── repository/    # Auth repository with token management
│   │   ├── di/                # Hilt dependency injection modules
│   │   ├── ui/
│   │   │   ├── screens/       # Compose UI screens
│   │   │   ├── theme/         # Material 3 theme
│   │   │   ├── navigation/    # Navigation graph
│   │   │   └── viewmodel/     # ViewModels
│   │   ├── util/              # Utility classes
│   │   ├── MainActivity.kt    # Entry point
│   │   └── PortalApplication.kt # Application class
│   └── build.gradle.kts       # App-level dependencies
└── build.gradle.kts           # Project-level configuration
```

## Key Files

### Data Models (`AuthModels.kt`)
- `JwtClaims` - Matches backend `Claims` struct
- `SystemRole` - Enum matching backend `SystemRole`
- `UserContext` - Complete user state with role and permissions
- `LoginResponse` - Response from mobile auth endpoint

### API Interface (`MobileAuthApi.kt`)
Retrofit interface defining all mobile endpoints with proper request/response types.

### Auth Repository (`AuthRepository.kt`)
- Secure token storage using EncryptedSharedPreferences
- JWT expiration checking
- Device ID generation (SHA-256 of ANDROID_ID)
- Token refresh logic

### Navigation (`NavGraph.kt`)
Role-aware navigation that routes users to appropriate dashboard after login.

## Setup Instructions

### 1. Configure Backend URL
Edit `/workspace/android-portal/app/src/main/java/com/portal/android/di/AppModule.kt`:
```kotlin
private const val BASE_URL = "https://your-backend-url.com/"
```

### 2. Build Configuration
The app uses:
- Kotlin 1.9.20
- Jetpack Compose with Material 3
- Hilt for dependency injection
- Retrofit for networking
- DataStore + EncryptedSharedPreferences for secure storage

### 3. Build & Run
```bash
cd android-portal
./gradlew assembleDebug
```

Or open in Android Studio Arctic Fox or later.

## Security Features

1. **Encrypted Storage**: Tokens stored in Android Keystore-backed EncryptedSharedPreferences
2. **Device Fingerprinting**: SHA-256 hash of ANDROID_ID sent with each request
3. **Token Refresh**: Automatic refresh before expiration
4. **Secure Logout**: Session revocation on backend
5. **HTTPS Only**: Cleartext traffic disabled

## Extending for Your Use Case

### Add Role-Specific Features
In `DashboardScreen.kt`, customize the `RoleBasedContent` composable:
```kotlin
when (userRole) {
    SystemRole.SUPERADMIN -> { /* Add superadmin widgets */ }
    SystemRole.TENANT_ADMIN -> { /* Add tenant admin widgets */ }
    SystemRole.USER -> { /* Add user widgets */ }
}
```

### Add Permission Checks
Use the `hasPermission()` method in ViewModel:
```kotlin
if (viewModel.hasPermission("students.read")) {
    // Show student list
}
```

### Add More Endpoints
1. Define new API methods in `MobileAuthApi.kt`
2. Add repository methods in `AuthRepository.kt`
3. Create new screens in `ui/screens/`

## Testing

Run unit tests:
```bash
./gradlew test
```

Run instrumented tests:
```bash
./gradlew connectedAndroidTest
```

## Next Steps

1. **Update BASE_URL** to point to your backend
2. **Add GraphQL client** if you need to use the GraphQL endpoint
3. **Implement push notifications** using the `push_token` parameter
4. **Add biometric authentication** for quicker re-login
5. **Implement offline mode** with local caching
6. **Add analytics** for user behavior tracking

## Troubleshooting

### Login fails with 401
- Check backend URL is correct
- Verify backend is running and accessible
- Check network permissions in manifest

### Token not persisting
- Ensure EncryptedSharedPreferences is initialized correctly
- Check device supports Android Keystore

### Role not showing correctly
- Verify JWT contains `system_role` claim
- Check `SystemRole.fromValue()` mapping

## License
Internal use only - matches backend licensing.
