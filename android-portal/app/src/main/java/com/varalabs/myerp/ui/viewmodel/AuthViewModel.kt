package com.varalabs.myerp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.varalabs.myerp.data.local.SessionStore
import com.varalabs.myerp.data.remote.api.OrgBriefDto
import com.varalabs.myerp.data.remote.api.LoginRequest
import com.varalabs.myerp.data.repository.AuthRepository
import com.varalabs.myerp.util.DeviceIdProvider
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionStore: SessionStore,
    private val deviceIdProvider: DeviceIdProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Initial)
    val uiState: StateFlow<AuthUiState> = _uiState

    init {
        checkAuth()
    }

    private fun checkAuth() {
        if (authRepository.isLoggedIn()) {
            _uiState.value = AuthUiState.Authenticated
        } else {
            _uiState.value = AuthUiState.Initial
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val deviceId = deviceIdProvider.getDeviceId()
            authRepository.login(LoginRequest(email = email, password = password, device_id = deviceId))
                .onSuccess { response ->
                    when (response.status) {
                        "OK" -> _uiState.value = AuthUiState.Authenticated
                        "ORG_SELECTION_REQUIRED" -> _uiState.value = AuthUiState.OrgSelectionRequired(
                            sessionToken = response.session_token ?: "",
                            orgs = response.orgs ?: emptyList()
                        )
                        else -> _uiState.value = AuthUiState.Error("Unexpected response")
                    }
                }
                .onFailure { error ->
                    _uiState.value = AuthUiState.Error(error.message ?: "Login failed")
                }
        }
    }

    fun selectOrg(sessionToken: String, orgId: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val deviceId = deviceIdProvider.getDeviceId()
            authRepository.selectOrg(sessionToken, orgId, deviceId)
                .onSuccess { _uiState.value = AuthUiState.Authenticated }
                .onFailure { error ->
                    // If session expired go back to login
                    _uiState.value = AuthUiState.Error(error.message ?: "Selection failed")
                }
        }
    }

    fun logout() {
        viewModelScope.launch {
            val deviceId = deviceIdProvider.getDeviceId()
            authRepository.logout(deviceId)
            _uiState.value = AuthUiState.Initial
        }
    }

    fun resetState() {
        _uiState.value = AuthUiState.Initial
    }

    // Read-only session helpers (for the drawer / profile header)
    val userName: String get() = sessionStore.userName
    val userEmail: String get() = sessionStore.userEmail
    val userPhotoUrl: String? get() = sessionStore.userPhotoUrl
    val userOrgRole: String get() = sessionStore.userOrgRole
    val orgDisplayName: String get() = sessionStore.orgDisplayName.ifEmpty { sessionStore.orgName }
    val orgThemeColor: String get() = sessionStore.orgThemeColor
    val orgLogoUrl: String? get() = sessionStore.orgLogoUrl
    val activeModules: List<String> get() = sessionStore.activeModules
}

sealed class AuthUiState {
    object Initial : AuthUiState()
    object Loading : AuthUiState()
    object Authenticated : AuthUiState()
    data class OrgSelectionRequired(
        val sessionToken: String,
        val orgs: List<OrgBriefDto>
    ) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}
