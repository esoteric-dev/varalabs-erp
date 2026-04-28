package com.varalabs.myerp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.varalabs.myerp.MobileOrgUsersQuery
import com.varalabs.myerp.ui.theme.*
import com.varalabs.myerp.ui.viewmodel.StaffListState
import com.varalabs.myerp.ui.viewmodel.StaffViewModel

@Composable
fun StaffScreen(
    onStaffClick: (String) -> Unit,
    onAddStaffClick: () -> Unit,
    viewModel: StaffViewModel = hiltViewModel()
) {
    val listState by viewModel.listState.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAddStaffClick,
                containerColor = SynapseBlue,
                contentColor = White,
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Add Staff") }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Header
            Column(modifier = Modifier.padding(horizontal = 20.dp).padding(top = 40.dp, bottom = 8.dp)) {
                Text(
                    text = "Staff",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = when (val s = listState) {
                        is StaffListState.Success -> "${s.staff.size} staff members"
                        else -> ""
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey
                )
            }

            // Search bar
            StudentSearchBar(
                query = searchQuery,
                onQueryChange = viewModel::onSearchQueryChange,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            // Content
            when (val state = listState) {
                is StaffListState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SynapseBlue)
                    }
                }
                is StaffListState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = state.message, color = UrgencyRed)
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedButton(onClick = { viewModel.loadStaff() }) { Text("Retry") }
                        }
                    }
                }
                is StaffListState.Success -> {
                    if (state.staff.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No staff found", color = MutedGrey)
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.staff, key = { it.id }) { staff ->
                                StaffListCard(staff = staff, onClick = { onStaffClick(staff.id) })
                            }
                            item { Spacer(modifier = Modifier.height(80.dp)) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StaffListCard(staff: MobileOrgUsersQuery.OrgUser, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            StudentAvatar(
                name = staff.name,
                photoUrl = staff.photoUrl,
                size = 48
            )

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = staff.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    maxLines = 1
                )
                Text(
                    text = staff.roleNames.joinToString(", "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey
                )
                if (staff.employeeId != null) {
                    Text(
                        text = "ID: ${staff.employeeId}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MutedGrey.copy(alpha = 0.7f)
                    )
                }
            }

            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = LightGrey,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
