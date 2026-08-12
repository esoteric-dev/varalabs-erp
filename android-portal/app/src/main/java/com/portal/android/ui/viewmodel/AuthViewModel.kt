package com.portal.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.portal.android.data.model.*
import com.portal.android.data.repository.AuthRepository
import com.portal.android.data.repository.AuthResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI State for authentication screens
 */
sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    data class Success(val userContext: UserContext) : AuthUiState()
    data class OrgSelectionRequired(
        val sessionToken: String,
        val orgs: List<OrgOption>
    ) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

/**
 * ViewModel for authentication flow
 */
@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val _currentUser = MutableStateFlow<UserContext?>(null)
    val currentUser: StateFlow<UserContext?> = _currentUser.asStateFlow()

    init {
        // Check if user is already logged in
        if (authRepository.isAuthenticated()) {
            _currentUser.value = authRepository.getCurrentUser()
            if (_currentUser.value != null) {
                _uiState.value = AuthUiState.Success(_currentUser.value!!)
            }
        }
    }

    /**
     * Login with email and password
     */
    fun login(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            
            authRepository.login(email, password).fold(
                onSuccess = { result ->
                    when (result) {
                        is AuthResult.Success -> {
                            _currentUser.value = result.userContext
                            _uiState.value = AuthUiState.Success(result.userContext)
                        }
                        is AuthResult.OrgSelectionRequired -> {
                            _uiState.value = AuthUiState.OrgSelectionRequired(
                                result.sessionToken,
                                result.orgs
                            )
                        }
                    }
                },
                onFailure = { error ->
                    _uiState.value = AuthUiState.Error(
                        error.message ?: "Login failed"
                    )
                }
            )
        }
    }

    /**
     * Select organisation for multi-org users
     */
    fun selectOrg(sessionToken: String, orgId: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            
            authRepository.selectOrg(sessionToken, orgId).fold(
                onSuccess = { userContext ->
                    _currentUser.value = userContext
                    _uiState.value = AuthUiState.Success(userContext)
                },
                onFailure = { error ->
                    _uiState.value = AuthUiState.Error(
                        error.message ?: "Organisation selection failed"
                    )
                }
            )
        }
    }

    /**
     * Logout user
     */
    fun logout() {
        viewModelScope.launch {
            authRepository.logout().fold(
                onSuccess = {
                    _currentUser.value = null
                    _uiState.value = AuthUiState.Idle
                },
                onFailure = { error ->
                    // Still clear state even if API call fails
                    _currentUser.value = null
                    _uiState.value = AuthUiState.Idle
                }
            )
        }
    }

    /**
     * Get current user role for dashboard customization
     */
    fun getUserRole(): SystemRole {
        return _currentUser.value?.systemRole ?: SystemRole.USER
    }

    /**
     * Check if user has specific permission
     */
    fun hasPermission(permission: String): Boolean {
        return _currentUser.value?.permissions?.contains(permission) == true
    }

    /**
     * Clear error state
     */
    fun clearError() {
        if (_uiState.value is AuthUiState.Error) {
            _uiState.value = AuthUiState.Idle
        }
    }
}
