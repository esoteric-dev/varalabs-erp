package com.varalabs.myerp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.varalabs.myerp.MobileMeQuery
import com.varalabs.myerp.MobileMyPayslipsQuery
import com.varalabs.myerp.data.local.SessionStore
import com.varalabs.myerp.data.repository.ErpRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val erpRepository: ErpRepository,
    val sessionStore: SessionStore
) : ViewModel() {

    private val _profileState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val profileState: StateFlow<ProfileUiState> = _profileState

    private val _payslipState = MutableStateFlow<PayslipUiState>(PayslipUiState.Idle)
    val payslipState: StateFlow<PayslipUiState> = _payslipState

    private val _updateState = MutableStateFlow<UpdateState>(UpdateState.Idle)
    val updateState: StateFlow<UpdateState> = _updateState

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _profileState.value = ProfileUiState.Loading
            erpRepository.getMe()
                .onSuccess { _profileState.value = ProfileUiState.Success(it) }
                .onFailure { _profileState.value = ProfileUiState.Error(it.message ?: "Load failed") }
        }
    }

    fun loadPayslips() {
        viewModelScope.launch {
            _payslipState.value = PayslipUiState.Loading
            erpRepository.getMyPayslips()
                .onSuccess { _payslipState.value = PayslipUiState.Success(it) }
                .onFailure { _payslipState.value = PayslipUiState.Error(it.message ?: "Load failed") }
        }
    }

    fun updateProfile(name: String?, phone: String?) {
        viewModelScope.launch {
            _updateState.value = UpdateState.Saving
            erpRepository.updateMyProfile(name, phone)
                .onSuccess {
                    sessionStore.userName = it.name
                    sessionStore.userPhotoUrl = it.photoUrl
                    _updateState.value = UpdateState.Done
                    loadProfile()
                }
                .onFailure { _updateState.value = UpdateState.Error(it.message ?: "Update failed") }
        }
    }

    fun resetUpdateState() {
        _updateState.value = UpdateState.Idle
    }
}

sealed class ProfileUiState {
    object Loading : ProfileUiState()
    data class Success(val user: MobileMeQuery.Me) : ProfileUiState()
    data class Error(val message: String) : ProfileUiState()
}

sealed class PayslipUiState {
    object Idle : PayslipUiState()
    object Loading : PayslipUiState()
    data class Success(val payslips: List<MobileMyPayslipsQuery.MyPayslip>) : PayslipUiState()
    data class Error(val message: String) : PayslipUiState()
}

sealed class UpdateState {
    object Idle : UpdateState()
    object Saving : UpdateState()
    object Done : UpdateState()
    data class Error(val message: String) : UpdateState()
}
