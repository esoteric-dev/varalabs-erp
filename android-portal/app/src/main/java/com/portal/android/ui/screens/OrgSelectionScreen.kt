package com.portal.android.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.portal.android.data.model.OrgOption
import com.portal.android.ui.viewmodel.AuthViewModel

/**
 * Organisation selection screen for multi-org users
 */
@Composable
fun OrgSelectionScreen(
    sessionToken: String,
    onOrgSelected: () -> Unit,
    onBack: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var selectedOrg by remember { mutableStateOf<OrgOption?>(null) }
    
    // In a real implementation, you'd fetch orgs from the session token
    // For now, this is a placeholder that will be populated after login
    val orgs = remember { emptyList<OrgOption>() }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        TopAppBar(
            title = { Text("Select Organisation") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(
                        androidx.compose.material.icons.Icons.Default.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            }
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "Your account belongs to multiple organisations. Please select one to continue:",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        if (orgs.isEmpty()) {
            // This state shouldn't happen in normal flow
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(orgs) { org ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { 
                                selectedOrg = org
                                viewModel.selectOrg(sessionToken, org.id)
                                onOrgSelected()
                            }
                            .padding(8.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = org.name,
                                    style = MaterialTheme.typography.titleMedium
                                )
                            }
                            
                            if (selectedOrg?.id == org.id) {
                                Icon(
                                    androidx.compose.material.icons.Icons.Default.Check,
                                    contentDescription = "Selected",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
