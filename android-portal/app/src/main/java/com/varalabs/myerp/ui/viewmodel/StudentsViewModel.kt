package com.varalabs.myerp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.varalabs.myerp.MobileFeeRecordsQuery
import com.varalabs.myerp.MobileStudentDetailQuery
import com.varalabs.myerp.MobileStudentsQuery
import com.varalabs.myerp.data.repository.ErpRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StudentsViewModel @Inject constructor(
    private val erpRepository: ErpRepository
) : ViewModel() {

    // ── List state ───────────────────────────────────────────────────────────
    private val _listState = MutableStateFlow<StudentsListState>(StudentsListState.Loading)
    val listState: StateFlow<StudentsListState> = _listState

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery

    private val _selectedClass = MutableStateFlow<String?>(null)
    val selectedClass: StateFlow<String?> = _selectedClass

    private var allStudents: List<MobileStudentsQuery.Student> = emptyList()

    // ── Detail state ─────────────────────────────────────────────────────────
    private val _detailState = MutableStateFlow<StudentDetailState>(StudentDetailState.Idle)
    val detailState: StateFlow<StudentDetailState> = _detailState

    private val _feeState = MutableStateFlow<FeeRecordsState>(FeeRecordsState.Idle)
    val feeState: StateFlow<FeeRecordsState> = _feeState

    init {
        loadStudents()
    }

    fun loadStudents(className: String? = null) {
        viewModelScope.launch {
            _listState.value = StudentsListState.Loading
            erpRepository.getStudents(className)
                .onSuccess { students ->
                    allStudents = students
                    _listState.value = StudentsListState.Success(applyFilter(students))
                }
                .onFailure {
                    _listState.value = StudentsListState.Error(it.message ?: "Load failed")
                }
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
        _listState.value = StudentsListState.Success(applyFilter(allStudents))
    }

    fun onClassFilter(className: String?) {
        _selectedClass.value = className
        loadStudents(className)
    }

    private fun applyFilter(list: List<MobileStudentsQuery.Student>): List<MobileStudentsQuery.Student> {
        val q = _searchQuery.value.trim().lowercase()
        return if (q.isEmpty()) list
        else list.filter {
            it.name.lowercase().contains(q) ||
                    it.admissionNumber?.lowercase()?.contains(q) == true ||
                    it.className.lowercase().contains(q)
        }
    }

    // ── Detail ───────────────────────────────────────────────────────────────
    fun loadStudentDetail(id: String) {
        viewModelScope.launch {
            _detailState.value = StudentDetailState.Loading
            erpRepository.getStudentDetail(id)
                .onSuccess { _detailState.value = StudentDetailState.Success(it) }
                .onFailure { _detailState.value = StudentDetailState.Error(it.message ?: "Not found") }
        }
        loadFeeRecords(id)
    }

    private fun loadFeeRecords(studentId: String) {
        viewModelScope.launch {
            _feeState.value = FeeRecordsState.Loading
            erpRepository.getFeeRecords(studentId)
                .onSuccess { _feeState.value = FeeRecordsState.Success(it) }
                .onFailure { _feeState.value = FeeRecordsState.Error(it.message ?: "Load failed") }
        }
    }
}

sealed class StudentsListState {
    object Loading : StudentsListState()
    data class Success(val students: List<MobileStudentsQuery.Student>) : StudentsListState()
    data class Error(val message: String) : StudentsListState()
}

sealed class StudentDetailState {
    object Idle : StudentDetailState()
    object Loading : StudentDetailState()
    data class Success(val student: MobileStudentDetailQuery.Student) : StudentDetailState()
    data class Error(val message: String) : StudentDetailState()
}

sealed class FeeRecordsState {
    object Idle : FeeRecordsState()
    object Loading : FeeRecordsState()
    data class Success(val records: List<MobileFeeRecordsQuery.FeeRecord>) : FeeRecordsState()
    data class Error(val message: String) : FeeRecordsState()
}
