package com.varalabs.myerp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.varalabs.myerp.MobileClassAttendanceQuery
import com.varalabs.myerp.ui.theme.*
import com.varalabs.myerp.ui.viewmodel.AttendanceViewModel
import com.varalabs.myerp.ui.viewmodel.ClassAttendanceState
import com.varalabs.myerp.ui.viewmodel.MarkResult

private val STATUS_COLORS = mapOf(
    "present" to TeacherGreen,
    "absent" to UrgencyRed,
    "late" to GuardianOrange,
    "excused" to StudentPurple
)

@Composable
fun AttendanceScreen(
    viewModel: AttendanceViewModel = hiltViewModel()
) {
    val classState by viewModel.classState.collectAsState()
    val markDraft by viewModel.markDraft.collectAsState()
    val markResult by viewModel.markResult.collectAsState()

    // Show a snackbar when attendance is saved
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(markResult) {
        if (markResult is MarkResult.Done) {
            snackbarHostState.showSnackbar("Attendance saved successfully")
            viewModel.resetMarkResult()
        } else if (markResult is MarkResult.Error) {
            snackbarHostState.showSnackbar((markResult as MarkResult.Error).message)
            viewModel.resetMarkResult()
        }
    }

    var className by remember { mutableStateOf("") }
    var showClassInput by remember { mutableStateOf(true) }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background,
        floatingActionButton = {
            if (classState is ClassAttendanceState.Success && markDraft.isNotEmpty()) {
                ExtendedFloatingActionButton(
                    onClick = { viewModel.submitAttendance(viewModel.today) },
                    containerColor = TeacherGreen,
                    contentColor = Color.White,
                    icon = { Icon(Icons.Default.Save, contentDescription = null) },
                    text = {
                        if (markResult is MarkResult.Saving) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text("Save Attendance")
                        }
                    }
                )
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Header
            Column(
                modifier = Modifier.padding(horizontal = 20.dp).padding(top = 56.dp, bottom = 16.dp)
            ) {
                Text(
                    text = "Attendance",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Today · ${viewModel.today}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey
                )
            }

            // Class selector
            if (showClassInput) {
                ClassInput(
                    className = className,
                    onClassNameChange = { className = it },
                    onLoad = {
                        if (className.isNotBlank()) {
                            viewModel.loadClassAttendance(className)
                            showClassInput = false
                        }
                    }
                )
            } else {
                // Show loaded class + option to change
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = className,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(onClick = { showClassInput = true; className = "" }) {
                        Text("Change")
                    }
                }
            }

            when (val state = classState) {
                is ClassAttendanceState.Idle -> {
                    if (!showClassInput) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = SynapseBlue)
                        }
                    } else {
                        AttendanceEmptyHint()
                    }
                }
                is ClassAttendanceState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SynapseBlue)
                    }
                }
                is ClassAttendanceState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(state.message, color = UrgencyRed)
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedButton(onClick = { viewModel.loadClassAttendance(className) }) {
                                Text("Retry")
                            }
                        }
                    }
                }
                is ClassAttendanceState.Success -> {
                    AttendanceList(
                        records = state.records,
                        draft = markDraft,
                        onStatusChange = viewModel::setAttendanceStatus
                    )
                }
            }
        }
    }
}

@Composable
fun ClassInput(className: String, onClassNameChange: (String) -> Unit, onLoad: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Enter class name", style = MaterialTheme.typography.labelMedium, color = MutedGrey)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = className,
                onValueChange = onClassNameChange,
                placeholder = { Text("e.g. Class 10A") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onLoad,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = SynapseBlue)
            ) {
                Text("Load Students")
            }
        }
    }
}

@Composable
fun AttendanceEmptyHint() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.Group,
                contentDescription = null,
                tint = LightGrey,
                modifier = Modifier.size(56.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text("Enter a class name to load students", color = MutedGrey)
        }
    }
}

@Composable
fun AttendanceList(
    records: List<MobileClassAttendanceQuery.AttendanceRecord>,
    draft: Map<String, String>,
    onStatusChange: (String, String) -> Unit
) {
    // Count summary
    val presentCount = draft.values.count { it == "present" }
    val absentCount = draft.values.count { it == "absent" }
    val lateCount = draft.values.count { it == "late" }

    LazyColumn(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Summary chips
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AttendanceSummaryChip("Present", presentCount, TeacherGreen)
                AttendanceSummaryChip("Absent", absentCount, UrgencyRed)
                AttendanceSummaryChip("Late", lateCount, GuardianOrange)
            }
        }

        items(records, key = { it.studentId }) { record ->
            val currentStatus = draft[record.studentId] ?: record.status
            AttendanceStudentRow(
                name = record.studentName,
                currentStatus = currentStatus,
                onStatusChange = { status -> onStatusChange(record.studentId, status) }
            )
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

@Composable
fun AttendanceSummaryChip(label: String, count: Int, color: Color) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = "$label: $count", fontSize = 12.sp, color = color, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun AttendanceStudentRow(
    name: String,
    currentStatus: String,
    onStatusChange: (String) -> Unit
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(SynapseBlue.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = name.split(" ").take(2).joinToString("") { it.first().uppercase() },
                    color = SynapseBlue,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = name,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
                maxLines = 1
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("present", "absent", "late").forEach { status ->
                    StatusButton(
                        status = status,
                        selected = currentStatus == status,
                        onClick = { onStatusChange(status) }
                    )
                }
            }
        }
    }
}

@Composable
fun StatusButton(status: String, selected: Boolean, onClick: () -> Unit) {
    val color = STATUS_COLORS[status] ?: MutedGrey
    val label = when (status) {
        "present" -> "P"
        "absent" -> "A"
        "late" -> "L"
        else -> status.first().uppercase()
    }
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(CircleShape)
            .background(if (selected) color else Color.Transparent)
            .border(1.5.dp, color, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = if (selected) Color.White else color,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp
        )
    }
}
