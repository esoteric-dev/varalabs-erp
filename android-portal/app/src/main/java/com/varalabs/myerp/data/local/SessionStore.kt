package com.varalabs.myerp.data.local

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Stores non-sensitive session data (org info, active modules, user display fields)
 * in plain SharedPreferences. Tokens live in TokenManager (EncryptedSharedPreferences).
 */
@Singleton
class SessionStore @Inject constructor(@ApplicationContext context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("session_prefs", Context.MODE_PRIVATE)

    // --- Org ---
    var orgId: String?
        get() = prefs.getString(KEY_ORG_ID, null)
        set(v) = prefs.edit().putString(KEY_ORG_ID, v).apply()

    var orgName: String
        get() = prefs.getString(KEY_ORG_NAME, "Varalabs ERP") ?: "Varalabs ERP"
        set(v) = prefs.edit().putString(KEY_ORG_NAME, v).apply()

    var orgDisplayName: String
        get() = prefs.getString(KEY_ORG_DISPLAY_NAME, "") ?: ""
        set(v) = prefs.edit().putString(KEY_ORG_DISPLAY_NAME, v).apply()

    var orgLogoUrl: String?
        get() = prefs.getString(KEY_ORG_LOGO_URL, null)
        set(v) = prefs.edit().putString(KEY_ORG_LOGO_URL, v).apply()

    var orgThemeColor: String
        get() = prefs.getString(KEY_ORG_THEME_COLOR, "#007AFF") ?: "#007AFF"
        set(v) = prefs.edit().putString(KEY_ORG_THEME_COLOR, v).apply()

    // Stored as comma-separated string, e.g. "students,fees,attendance"
    var activeModules: List<String>
        get() {
            val raw = prefs.getString(KEY_ACTIVE_MODULES, "") ?: ""
            return if (raw.isEmpty()) emptyList() else raw.split(",")
        }
        set(v) = prefs.edit().putString(KEY_ACTIVE_MODULES, v.joinToString(",")).apply()

    // --- User display ---
    var userId: String?
        get() = prefs.getString(KEY_USER_ID, null)
        set(v) = prefs.edit().putString(KEY_USER_ID, v).apply()

    var userName: String
        get() = prefs.getString(KEY_USER_NAME, "") ?: ""
        set(v) = prefs.edit().putString(KEY_USER_NAME, v).apply()

    var userEmail: String
        get() = prefs.getString(KEY_USER_EMAIL, "") ?: ""
        set(v) = prefs.edit().putString(KEY_USER_EMAIL, v).apply()

    var userPhotoUrl: String?
        get() = prefs.getString(KEY_USER_PHOTO_URL, null)
        set(v) = prefs.edit().putString(KEY_USER_PHOTO_URL, v).apply()

    var userOrgRole: String
        get() = prefs.getString(KEY_USER_ORG_ROLE, "") ?: ""
        set(v) = prefs.edit().putString(KEY_USER_ORG_ROLE, v).apply()

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_ORG_ID = "org_id"
        private const val KEY_ORG_NAME = "org_name"
        private const val KEY_ORG_DISPLAY_NAME = "org_display_name"
        private const val KEY_ORG_LOGO_URL = "org_logo_url"
        private const val KEY_ORG_THEME_COLOR = "org_theme_color"
        private const val KEY_ACTIVE_MODULES = "active_modules"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_PHOTO_URL = "user_photo_url"
        private const val KEY_USER_ORG_ROLE = "user_org_role"
    }
}
