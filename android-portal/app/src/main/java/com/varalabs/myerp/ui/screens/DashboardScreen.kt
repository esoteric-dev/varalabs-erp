package com.varalabs.myerp.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.varalabs.myerp.MobileDashboardQuery
import com.varalabs.myerp.ui.theme.*
import com.varalabs.myerp.ui.viewmodel.DashboardUiState
import com.varalabs.myerp.ui.viewmodel.DashboardViewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun DashboardScreen(
    orgName: String,
    userRole: String,
    onModuleClick: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        when (val state = uiState) {
            is DashboardUiState.Loading -> LoadingDashboard()
            is DashboardUiState.Error -> ErrorDashboard(state.message) { viewModel.load() }
            is DashboardUiState.Success -> {
                when (userRole) {
                    "admin", "tenant_admin", "superadmin" ->
                        AdminDashboard(orgName = orgName, data = state.data, onModuleClick = onModuleClick)
                    "teacher" -> TeacherDashboard(data = state.data, onModuleClick = onModuleClick)
                    else -> GeneralDashboard(data = state.data)
                }
            }
        }
    }
}

@Composable
fun AdminDashboard(
    orgName: String,
    data: MobileDashboardQuery.Dashboard,
    onModuleClick: (String) -> Unit
) {
    val currentDate = LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMMM d"))
    val attendancePct = if (data.attendanceTodayTotal > 0)
        (data.attendanceTodayPresent * 100 / data.attendanceTodayTotal) else 0
    val pendingRupees = data.feesPending / 100
    val collectedRupees = data.feesCollected / 100

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Good morning",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "$currentDate • $orgName",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(
                    title = "Students",
                    value = "${data.totalStudents}",
                    icon = Icons.Default.People,
                    color = SynapseBlue,
                    modifier = Modifier.weight(1f)
                )
                StatCard(
                    title = "Staff",
                    value = "${data.totalStaff}",
                    icon = Icons.Default.Badge,
                    color = TeacherGreen,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(
                    title = "Attendance",
                    value = "$attendancePct%",
                    icon = Icons.Default.CheckCircle,
                    color = TeacherGreen,
                    subtitle = "${data.attendanceTodayPresent}/${data.attendanceTodayTotal} today",
                    modifier = Modifier.weight(1f),
                    showSparkline = true
                )
                StatCard(
                    title = "Pending Fees",
                    value = "₹${formatAmount(pendingRupees)}",
                    icon = Icons.Default.Receipt,
                    color = UrgencyRed,
                    subtitle = "collected ₹${formatAmount(collectedRupees)}",
                    modifier = Modifier.weight(1f),
                    showSparkline = true
                )
            }
        }

        if (data.pendingAdmissions > 0 || data.activeNotices > 0) {
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (data.pendingAdmissions > 0) {
                        StatCard(
                            title = "Admissions",
                            value = "${data.pendingAdmissions}",
                            icon = Icons.Default.PersonAdd,
                            color = GuardianOrange,
                            subtitle = "pending review",
                            modifier = Modifier.weight(1f)
                        )
                    }
                    if (data.activeNotices > 0) {
                        StatCard(
                            title = "Notices",
                            value = "${data.activeNotices}",
                            icon = Icons.Default.Campaign,
                            color = StudentPurple,
                            subtitle = "active",
                            modifier = Modifier.weight(1f),
                            onClick = { onModuleClick("noticeboard") }
                        )
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

@Composable
fun TeacherDashboard(
    data: MobileDashboardQuery.Dashboard,
    onModuleClick: (String) -> Unit
) {
    val attendancePct = if (data.attendanceTodayTotal > 0)
        (data.attendanceTodayPresent * 100 / data.attendanceTodayTotal) else 0

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Good morning",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMMM d")),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        item {
            QuickActionTile(
                title = "Mark Today's Attendance",
                subtitle = "$attendancePct% marked so far",
                buttonText = "Open Attendance",
                color = TeacherGreen,
                onClick = { onModuleClick("attendance") }
            )
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(
                    title = "My Students",
                    value = "${data.totalStudents}",
                    icon = Icons.Default.People,
                    color = SynapseBlue,
                    modifier = Modifier.weight(1f),
                    onClick = { onModuleClick("students") }
                )
                StatCard(
                    title = "Notices",
                    value = "${data.activeNotices}",
                    icon = Icons.Default.Campaign,
                    color = StudentPurple,
                    modifier = Modifier.weight(1f),
                    onClick = { onModuleClick("noticeboard") }
                )
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

@Composable
fun GeneralDashboard(data: MobileDashboardQuery.Dashboard) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(
                text = "Dashboard",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
        }
        item {
            if (data.activeNotices > 0) {
                StatCard(
                    title = "Active Notices",
                    value = "${data.activeNotices}",
                    icon = Icons.Default.Campaign,
                    color = SynapseBlue,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

@Composable
fun ErrorDashboard(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = message, color = UrgencyRed, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedButton(onClick = onRetry) { Text("Retry") }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    showSparkline: Boolean = false,
    onClick: (() -> Unit)? = null
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp),
        onClick = onClick ?: {}
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(color.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = title, style = MaterialTheme.typography.labelMedium, color = MutedGrey)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            if (showSparkline) {
                Spacer(modifier = Modifier.height(6.dp))
                SparklineStub(color = color)
            }
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = subtitle, style = MaterialTheme.typography.labelSmall, color = MutedGrey)
            }
        }
    }
}

@Composable
fun SparklineStub(color: Color) {
    Canvas(modifier = Modifier.fillMaxWidth().height(20.dp)) {
        val path = Path().apply {
            moveTo(0f, size.height * 0.7f)
            lineTo(size.width * 0.2f, size.height * 0.4f)
            lineTo(size.width * 0.4f, size.height * 0.6f)
            lineTo(size.width * 0.6f, size.height * 0.2f)
            lineTo(size.width * 0.8f, size.height * 0.5f)
            lineTo(size.width, size.height * 0.1f)
        }
        drawPath(path = path, color = color, style = Stroke(width = 2.dp.toPx()))
    }
}

@Composable
fun QuickActionTile(
    title: String,
    subtitle: String,
    buttonText: String,
    color: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = color)
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(text = title, color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(text = subtitle, color = Color.White.copy(alpha = 0.7f), style = MaterialTheme.typography.bodySmall)
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onClick,
                colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
            ) {
                Text(text = buttonText, color = color, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun LoadingDashboard() {
    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SkeletonTile(Modifier.width(200.dp).height(30.dp))
        SkeletonTile(Modifier.width(150.dp).height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SkeletonTile(Modifier.weight(1f).height(110.dp))
            SkeletonTile(Modifier.weight(1f).height(110.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SkeletonTile(Modifier.weight(1f).height(110.dp))
            SkeletonTile(Modifier.weight(1f).height(110.dp))
        }
    }
}

@Composable
fun SkeletonTile(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val alpha by transition.animateFloat(
        initialValue = 0.3f, targetValue = 0.7f,
        animationSpec = infiniteRepeatable(tween(800, easing = LinearEasing), RepeatMode.Reverse),
        label = "alpha"
    )
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = alpha))
    )
}

private fun formatAmount(paise: Int): String {
    return when {
        paise >= 100000 -> "%.1fL".format(paise / 100000.0)
        paise >= 1000 -> "%.1fk".format(paise / 1000.0)
        else -> "$paise"
    }
}
