package com.varalabs.myerp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
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
import com.varalabs.myerp.MobileMyPayslipsQuery
import com.varalabs.myerp.ui.theme.*
import com.varalabs.myerp.ui.viewmodel.PayslipUiState
import com.varalabs.myerp.ui.viewmodel.ProfileUiState
import com.varalabs.myerp.ui.viewmodel.ProfileViewModel
import com.varalabs.myerp.ui.viewmodel.UpdateState

@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val profileState by viewModel.profileState.collectAsState()
    val payslipState by viewModel.payslipState.collectAsState()
    val updateState by viewModel.updateState.collectAsState()

    var showEditDialog by remember { mutableStateOf(false) }

    // Show payslips if module active
    LaunchedEffect(Unit) {
        viewModel.loadPayslips()
    }

    LaunchedEffect(updateState) {
        if (updateState is UpdateState.Done) {
            showEditDialog = false
            viewModel.resetUpdateState()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        when (val state = profileState) {
            is ProfileUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SynapseBlue)
                }
            }
            is ProfileUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message, color = UrgencyRed)
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedButton(onClick = { viewModel.loadProfile() }) { Text("Retry") }
                    }
                }
            }
            is ProfileUiState.Success -> {
                val user = state.user
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 32.dp)
                ) {
                    // Modern Header
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SynapseBlue)
                                .padding(24.dp)
                                .padding(top = 40.dp, bottom = 24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(
                                    modifier = Modifier
                                        .size(100.dp)
                                        .clip(CircleShape)
                                        .background(Color.White.copy(alpha = 0.2f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (user.photoUrl != null) {
                                        AsyncImage(
                                            model = user.photoUrl,
                                            contentDescription = user.name,
                                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                                            contentScale = ContentScale.Crop
                                        )
                                    } else {
                                        Text(
                                            text = user.name.split(" ").take(2).joinToString("") { it.first().uppercase() },
                                            color = Color.White,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 32.sp
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(user.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(Color.White.copy(alpha = 0.2f))
                                            .padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            user.systemRole.uppercase(),
                                            color = Color.White,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            letterSpacing = 1.sp
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Employee Details Section
                    item {
                        ProfileSectionHeader("Employee Details")
                        ProfileInfoCard {
                            ProfileInfoRow(
                                icon = Icons.Default.Badge,
                                label = "Employee ID",
                                value = user.employeeId ?: "Not Assigned"
                            )
                            Divider(modifier = Modifier.padding(start = 52.dp), thickness = 0.5.dp, color = LightGrey)
                            ProfileInfoRow(
                                icon = Icons.Default.Business,
                                label = "Organization",
                                value = viewModel.sessionStore.orgDisplayName.ifEmpty { viewModel.sessionStore.orgName }
                            )
                        }
                    }

                    // Contact Information Section
                    item {
                        ProfileSectionHeader("Contact Information")
                        ProfileInfoCard {
                            ProfileInfoRow(
                                icon = Icons.Default.Email,
                                label = "Personal Email",
                                value = user.email
                            )
                            Divider(modifier = Modifier.padding(start = 52.dp), thickness = 0.5.dp, color = LightGrey)
                            ProfileInfoRow(
                                icon = Icons.Default.Phone,
                                label = "Phone Number",
                                value = user.phone ?: "Not Provided"
                            )
                        }
                    }

                    // Payslips Section (if available)
                    if (payslipState is PayslipUiState.Success) {
                        val payslips = (payslipState as PayslipUiState.Success).payslips
                        if (payslips.isNotEmpty()) {
                            item { ProfileSectionHeader("My Payslips") }
                            items(payslips) { payslip ->
                                PayslipCard(payslip, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
                            }
                        }
                    }

                    // Actions
                    item {
                        Spacer(modifier = Modifier.height(32.dp))
                        Column(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Button(
                                onClick = { showEditDialog = true },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = SynapseBlue)
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Edit Profile Information", fontWeight = FontWeight.SemiBold)
                            }

                            OutlinedButton(
                                onClick = onLogout,
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = UrgencyRed),
                                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(UrgencyRed.copy(alpha = 0.5f)))
                            ) {
                                Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Sign Out", fontWeight = FontWeight.SemiBold)
                            }
                        }
                        Spacer(modifier = Modifier.height(100.dp))
                    }
                }

                if (showEditDialog) {
                    EditProfileDialog(
                        currentName = user.name,
                        currentPhone = user.phone ?: "",
                        isSaving = updateState is UpdateState.Saving,
                        error = (updateState as? UpdateState.Error)?.message,
                        onSave = { name, phone -> viewModel.updateProfile(name, phone) },
                        onDismiss = { showEditDialog = false; viewModel.resetUpdateState() }
                    )
                }
            }
        }
    }
}

@Composable
fun ProfileSectionHeader(title: String) {
    Text(
        text = title.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = MutedGrey,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(start = 20.dp, top = 24.dp, bottom = 10.dp)
    )
}

@Composable
fun ProfileInfoCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
    ) {
        Column(modifier = Modifier.padding(vertical = 4.dp)) {
            content()
        }
    }
}

@Composable
fun ProfileInfoRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(SynapseBlue.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = SynapseBlue)
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MutedGrey)
            Text(value, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium, color = DarkGrey)
        }
    }
}

@Composable
fun PayslipCard(payslip: MobileMyPayslipsQuery.MyPayslip, modifier: Modifier = Modifier) {
    val monthName = java.time.Month.of(payslip.month).name.lowercase().replaceFirstChar { it.uppercase() }
    val statusColor = when (payslip.status) {
        "paid" -> SuccessGreen
        "processed" -> SynapseBlue
        else -> MutedGrey
    }
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(0.5.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(statusColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.ReceiptLong,
                    contentDescription = null,
                    tint = statusColor,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("$monthName ${payslip.year}", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(
                    text = "Net Pay: ₹${payslip.netPay / 100}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(statusColor.copy(alpha = 0.15f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        payslip.status.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = statusColor,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun EditProfileDialog(
    currentName: String,
    currentPhone: String,
    isSaving: Boolean,
    error: String?,
    onSave: (String?, String?) -> Unit,
    onDismiss: () -> Unit
) {
    var name by remember { mutableStateOf(currentName) }
    var phone by remember { mutableStateOf(currentPhone) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Profile") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Full Name") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Phone Number") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                if (error != null) {
                    Text(error, color = UrgencyRed, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(
                        name.trim().ifEmpty { null },
                        phone.trim().ifEmpty { null }
                    )
                },
                enabled = !isSaving,
                shape = RoundedCornerShape(8.dp)
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)
                else Text("Save Changes")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
