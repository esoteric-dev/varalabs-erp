package com.varalabs.myerp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.varalabs.myerp.MobileNoticesQuery
import com.varalabs.myerp.data.repository.ErpRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NoticesViewModel @Inject constructor(
    private val erpRepository: ErpRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<NoticesUiState>(NoticesUiState.Loading)
    val uiState: StateFlow<NoticesUiState> = _uiState

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = NoticesUiState.Loading
            erpRepository.getNotices()
                .onSuccess { _uiState.value = NoticesUiState.Success(it) }
                .onFailure { _uiState.value = NoticesUiState.Error(it.message ?: "Load failed") }
        }
    }
}

sealed class NoticesUiState {
    object Loading : NoticesUiState()
    data class Success(val notices: List<MobileNoticesQuery.Notice>) : NoticesUiState()
    data class Error(val message: String) : NoticesUiState()
}
