package com.varalabs.myerp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.varalabs.myerp.MobileFeeRecordsQuery
import com.varalabs.myerp.MobileStudentDetailQuery
import com.varalabs.myerp.ui.theme.*
import com.varalabs.myerp.ui.viewmodel.FeeRecordsState
import com.varalabs.myerp.ui.viewmodel.StudentDetailState
import com.varalabs.myerp.ui.viewmodel.StudentsViewModel

private enum class DetailTab { PROFILE, FEES, ATTENDANCE }

@Composable
fun StudentDetailScreen(
    studentId: String,
    onBack: () -> Unit,
    viewModel: StudentsViewModel = hiltViewModel()
) {
    val detailState by viewModel.detailState.collectAsState()
    val feeState by viewModel.feeState.collectAsState()
    var selectedTab by remember { mutableStateOf(DetailTab.PROFILE) }

    LaunchedEffect(studentId) {
        viewModel.loadStudentDetail(studentId)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        when (val state = detailState) {
            is StudentDetailState.Idle, is StudentDetailState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SynapseBlue)
                }
            }
            is StudentDetailState.Error -> {
                Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(state.message, color = UrgencyRed)
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedButton(onClick = { viewModel.loadStudentDetail(studentId) }) { Text("Retry") }
                }
            }
            is StudentDetailState.Success -> {
                val student = state.student
                DetailHeader(student = student, onBack = onBack)
                TabRow(
                    selectedTabIndex = selectedTab.ordinal,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = SynapseBlue
                ) {
                    DetailTab.entries.forEach { tab ->
                        Tab(
                            selected = selectedTab == tab,
                            onClick = { selectedTab = tab },
                            text = { Text(tab.name.lowercase().replaceFirstChar { it.uppercase() }, fontWeight = FontWeight.Medium) }
                        )
                    }
                }

                when (selectedTab) {
                    DetailTab.PROFILE -> ProfileTab(student)
                    DetailTab.FEES -> FeesTab(feeState)
                    DetailTab.ATTENDANCE -> AttendanceTab(studentId)
                }
            }
        }
    }
}

@Composable
fun DetailHeader(student: MobileStudentDetailQuery.Student, onBack: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(SynapseBlue)
            .padding(20.dp)
            .padding(top = 32.dp)
    ) {
        IconButton(
            onClick = onBack,
            modifier = Modifier.align(Alignment.TopStart)
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            StudentAvatar(name = student.name, photoUrl = student.photoUrl, size = 72)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = student.name,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp
            )
            Text(
                text = student.className,
                color = Color.White.copy(alpha = 0.8f),
                style = MaterialTheme.typography.bodyMedium
            )
            if (student.admissionNumber != null) {
                Text(
                    text = student.admissionNumber,
                    color = Color.White.copy(alpha = 0.6f),
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

@Composable
fun ProfileTab(student: MobileStudentDetailQuery.Student) {
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Personal info
        item {
            InfoSection(title = "Personal Information") {
                InfoRow(Icons.Default.Person, "Gender", student.gender ?: "—")
                InfoRow(Icons.Default.Cake, "Date of Birth", student.dateOfBirth ?: "—")
                InfoRow(Icons.Default.Bloodtype, "Blood Group", student.bloodGroup ?: "—")
                if (student.email != null)
                    InfoRow(Icons.Default.Email, "Email", student.email)
                if (student.phone != null)
                    InfoRow(Icons.Default.Phone, "Phone", student.phone)
            }
        }

        // Admission
        item {
            InfoSection(title = "Admission Details") {
                InfoRow(Icons.Default.Numbers, "Admission No.", student.admissionNumber ?: "—")
                InfoRow(Icons.Default.CalendarToday, "Admission Date", student.admissionDate ?: "—")
            }
        }

        // Parents
        val parents = student.parents
        if (parents != null) {
            item {
                InfoSection(title = "Parents / Guardians") {
                    if (parents.fatherName != null) {
                        InfoRow(Icons.Default.Person, "Father", buildString {
                            append(parents.fatherName)
                            if (parents.fatherPhone != null) append(" • ${parents.fatherPhone}")
                        })
                    }
                    if (parents.motherName != null) {
                        InfoRow(Icons.Default.Person, "Mother", buildString {
                            append(parents.motherName)
                            if (parents.motherPhone != null) append(" • ${parents.motherPhone}")
                        })
                    }
                    if (parents.guardianName != null) {
                        InfoRow(Icons.Default.SupervisedUserCircle, "Guardian", buildString {
                            append(parents.guardianName)
                            if (parents.guardianPhone != null) append(" • ${parents.guardianPhone}")
                        })
                    }
                }
            }
        }

        // Address
        if (student.addresses.isNotEmpty()) {
            item {
                InfoSection(title = "Address") {
                    student.addresses.forEach { addr ->
                        InfoRow(
                            Icons.Default.Home,
                            addr.addressType.replaceFirstChar { it.uppercase() },
                            listOfNotNull(
                                addr.address, addr.city, addr.state, addr.zipCode, addr.country
                            ).joinToString(", ")
                        )
                    }
                }
            }
        }

        // Medical
        val med = student.medicalHistory
        if (med != null && listOf(med.allergies, med.medications, med.pastConditions).any { it != null }) {
            item {
                InfoSection(title = "Medical History") {
                    if (med.allergies != null)
                        InfoRow(Icons.Default.MedicalServices, "Allergies", med.allergies)
                    if (med.medications != null)
                        InfoRow(Icons.Default.LocalPharmacy, "Medications", med.medications)
                    if (med.pastConditions != null)
                        InfoRow(Icons.Default.History, "Past Conditions", med.pastConditions)
                }
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

@Composable
fun InfoSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column {
        Text(
            text = title.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MutedGrey,
            modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
        )
        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(1.dp)
        ) {
            Column(modifier = Modifier.padding(4.dp), content = content)
        }
    }
}

@Composable
fun InfoRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = SynapseBlue, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(12.dp))
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = MutedGrey, modifier = Modifier.width(100.dp))
        Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
    }
}

@Composable
fun FeesTab(feeState: FeeRecordsState) {
    when (feeState) {
        is FeeRecordsState.Idle, is FeeRecordsState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = SynapseBlue)
            }
        }
        is FeeRecordsState.Error -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(feeState.message, color = UrgencyRed)
            }
        }
        is FeeRecordsState.Success -> {
            if (feeState.records.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No fee records", color = MutedGrey)
                }
            } else {
                val totalDue = feeState.records.sumOf { it.amountDue }
                val totalPaid = feeState.records.sumOf { it.amountPaid }
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item {
                        FeeSummaryCard(totalDue = totalDue, totalPaid = totalPaid)
                    }
                    items(feeState.records) { record ->
                        FeeRecordCard(record)
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@Composable
fun FeeSummaryCard(totalDue: Int, totalPaid: Int) {
    val balance = totalDue - totalPaid
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = if (balance > 0) UrgencyRed else TeacherGreen)
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text("Total Due", color = Color.White.copy(alpha = 0.7f), style = MaterialTheme.typography.labelMedium)
                Text("₹${totalDue / 100}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("Balance", color = Color.White.copy(alpha = 0.7f), style = MaterialTheme.typography.labelMedium)
                Text("₹${balance / 100}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            }
        }
    }
}

@Composable
fun FeeRecordCard(record: MobileFeeRecordsQuery.FeeRecord) {
    val statusColor = when (record.status) {
        "paid" -> TeacherGreen
        "overdue" -> UrgencyRed
        "partial" -> GuardianOrange
        else -> MutedGrey
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(statusColor)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = record.feeName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    text = "Due: ${record.dueDate}" + if (record.paidDate != null) " • Paid: ${record.paidDate}" else "",
                    style = MaterialTheme.typography.labelSmall,
                    color = MutedGrey
                )
                if (record.paymentMode != null) {
                    Text(
                        text = record.paymentMode,
                        style = MaterialTheme.typography.labelSmall,
                        color = MutedGrey.copy(alpha = 0.7f)
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "₹${record.amountDue / 100}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Text(
                    text = record.status.replaceFirstChar { it.uppercase() },
                    style = MaterialTheme.typography.labelSmall,
                    color = statusColor,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun AttendanceTab(studentId: String) {
    // Attendance shown inside the student detail is handled by AttendanceViewModel
    // For simplicity, we redirect to the attendance screen concept here
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = SynapseBlue, modifier = Modifier.size(48.dp))
            Spacer(modifier = Modifier.height(12.dp))
            Text("Attendance available in Attendance tab", color = MutedGrey)
        }
    }
}
