package com.varalabs.myerp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.varalabs.myerp.MobileDashboardQuery
import com.varalabs.myerp.data.local.SessionStore
import com.varalabs.myerp.data.repository.ErpRepository
import com.varalabs.myerp.data.repository.UnauthenticatedException
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val erpRepository: ErpRepository,
    val sessionStore: SessionStore
) : ViewModel() {

    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            erpRepository.getDashboard()
                .onSuccess { _uiState.value = DashboardUiState.Success(it) }
                .onFailure { error ->
                    if (error is UnauthenticatedException) {
                        // This will be caught by MainActivity or AuthViewModel to redirect to login
                        _uiState.value = DashboardUiState.Error("Session expired")
                    } else {
                        _uiState.value = DashboardUiState.Error(error.message ?: "Load failed")
                    }
                }
        }
    }
}

sealed class DashboardUiState {
    object Loading : DashboardUiState()
    data class Success(val data: MobileDashboardQuery.Dashboard) : DashboardUiState()
    data class Error(val message: String) : DashboardUiState()
}
