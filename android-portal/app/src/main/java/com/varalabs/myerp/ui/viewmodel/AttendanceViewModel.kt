package com.varalabs.myerp.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.varalabs.myerp.MobileClassAttendanceQuery
import com.varalabs.myerp.MobileStudentAttendanceQuery
import com.varalabs.myerp.data.repository.ErpRepository
import com.varalabs.myerp.type.AttendanceEntryInput
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

@HiltViewModel
class AttendanceViewModel @Inject constructor(
    private val erpRepository: ErpRepository
) : ViewModel() {

    private val isoFmt = DateTimeFormatter.ISO_LOCAL_DATE

    // Today for mark-attendance view
    val today: String = LocalDate.now().format(isoFmt)

    // Class attendance for teacher (mark / view)
    private val _classState = MutableStateFlow<ClassAttendanceState>(ClassAttendanceState.Idle)
    val classState: StateFlow<ClassAttendanceState> = _classState

    // Mark-attendance draft: studentId → status
    private val _markDraft = MutableStateFlow<Map<String, String>>(emptyMap())
    val markDraft: StateFlow<Map<String, String>> = _markDraft

    private val _markResult = MutableStateFlow<MarkResult>(MarkResult.Idle)
    val markResult: StateFlow<MarkResult> = _markResult

    // Student attendance history
    private val _studentState = MutableStateFlow<StudentAttendanceState>(StudentAttendanceState.Idle)
    val studentState: StateFlow<StudentAttendanceState> = _studentState

    fun loadClassAttendance(className: String, date: String = today) {
        viewModelScope.launch {
            _classState.value = ClassAttendanceState.Loading
            val from = date
            val to = date
            erpRepository.getClassAttendance(className, date, from, to)
                .onSuccess { records ->
                    _classState.value = ClassAttendanceState.Success(records)
                    // Pre-populate draft from existing records
                    _markDraft.value = records.associate { it.studentId to it.status }
                }
                .onFailure {
                    _classState.value = ClassAttendanceState.Error(it.message ?: "Load failed")
                }
        }
    }

    fun loadStudentAttendance(studentId: String, from: String, to: String) {
        viewModelScope.launch {
            _studentState.value = StudentAttendanceState.Loading
            erpRepository.getStudentAttendance(studentId, from, to)
                .onSuccess { _studentState.value = StudentAttendanceState.Success(it) }
                .onFailure { _studentState.value = StudentAttendanceState.Error(it.message ?: "Load failed") }
        }
    }

    fun setAttendanceStatus(studentId: String, status: String) {
        _markDraft.value = _markDraft.value.toMutableMap().also { it[studentId] = status }
    }

    fun submitAttendance(date: String) {
        val entries = _markDraft.value.map { (sid, status) ->
            AttendanceEntryInput(studentId = sid, status = status)
        }
        if (entries.isEmpty()) return

        viewModelScope.launch {
            _markResult.value = MarkResult.Saving
            erpRepository.markAttendance(date, entries)
                .onSuccess { _markResult.value = MarkResult.Done }
                .onFailure { _markResult.value = MarkResult.Error(it.message ?: "Submit failed") }
        }
    }

    fun resetMarkResult() {
        _markResult.value = MarkResult.Idle
    }
}

sealed class ClassAttendanceState {
    object Idle : ClassAttendanceState()
    object Loading : ClassAttendanceState()
    data class Success(val records: List<MobileClassAttendanceQuery.AttendanceRecord>) : ClassAttendanceState()
    data class Error(val message: String) : ClassAttendanceState()
}

sealed class StudentAttendanceState {
    object Idle : StudentAttendanceState()
    object Loading : StudentAttendanceState()
    data class Success(val records: List<MobileStudentAttendanceQuery.AttendanceRecord>) : StudentAttendanceState()
    data class Error(val message: String) : StudentAttendanceState()
}

sealed class MarkResult {
    object Idle : MarkResult()
    object Saving : MarkResult()
    object Done : MarkResult()
    data class Error(val message: String) : MarkResult()
}
