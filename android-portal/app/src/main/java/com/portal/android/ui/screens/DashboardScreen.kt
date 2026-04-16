package com.portal.android.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.portal.android.data.model.SystemRole
import com.portal.android.ui.viewmodel.AuthViewModel

/**
 * Main dashboard screen with role-based content
 */
@Composable
fun DashboardScreen(
    onLogout: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val currentUser by viewModel.currentUser.collectAsState()
    val userRole = viewModel.getUserRole()
    
    var drawerOpen by remember { mutableStateOf(false) }
    
    ModalNavigationDrawer(
        drawerContent = {
            ModalDrawerSheet {
                DrawerContent(
                    userRole = userRole,
                    currentUser = currentUser,
                    onLogout = {
                        drawerOpen = false
                        viewModel.logout()
                        onLogout()
                    }
                )
            }
        },
        drawerState = rememberDrawerState(DrawerValue.Closed),
        gesturesEnabled = true
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Dashboard") },
                    navigationIcon = {
                        IconButton(onClick = { drawerOpen = true }) {
                            Icon(Icons.Default.Menu, contentDescription = "Menu")
                        }
                    },
                    actions = {
                        IconButton(onClick = { /* Notifications */ }) {
                            Icon(Icons.Default.Notifications, contentDescription = "Notifications")
                        }
                    }
                )
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
            ) {
                RoleBasedContent(userRole = userRole)
            }
        }
    }
}

@Composable
private fun DrawerContent(
    userRole: SystemRole,
    currentUser: com.portal.android.data.model.UserContext?,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxHeight()
            .padding(16.dp)
    ) {
        // User info header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(vertical = 16.dp)
        ) {
            AvatarPlaceholder()
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = currentUser?.userInfo?.name ?: "User",
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = currentUser?.userInfo?.email ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Badge {
                    Text(userRole.value.replace("_", " ").capitalize())
                }
            }
        }
        
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        
        // Navigation items based on role
        NavigationItems(userRole = userRole)
        
        Spacer(modifier = Modifier.weight(1f))
        
        // Logout button
        Button(
            onClick = onLogout,
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("Logout")
        }
    }
}

@Composable
private fun NavigationItems(userRole: SystemRole) {
    when (userRole) {
        SystemRole.SUPERADMIN -> {
            // Superadmin has access to everything
            NavItem(icon = Icons.Default.Dashboard, label = "Dashboard")
            NavItem(icon = Icons.Default.People, label = "Tenants")
            NavItem(icon = Icons.Default.Business, label = "Organisations")
            NavItem(icon = Icons.Default.Settings, label = "System Settings")
            NavItem(icon = Icons.Default.Security, label = "Permissions")
        }
        SystemRole.TENANT_ADMIN -> {
            // Tenant admin manages their tenant
            NavItem(icon = Icons.Default.Dashboard, label = "Dashboard")
            NavItem(icon = Icons.Default.Business, label = "My Organisations")
            NavItem(icon = Icons.Default.People, label = "Users")
            NavItem(icon = Icons.Default.Assignment, label = "Roles")
        }
        SystemRole.USER -> {
            // Regular user sees limited options
            NavItem(icon = Icons.Default.Dashboard, label = "Dashboard")
            NavItem(icon = Icons.Default.Task, label = "My Tasks")
            NavItem(icon = Icons.Default.Description, label = "Documents")
        }
    }
}

@Composable
private fun NavItem(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String) {
    NavigationDrawerItem(
        icon = { Icon(icon, contentDescription = null) },
        label = { Text(label) },
        selected = false,
        onClick = { /* Handle navigation */ },
        modifier = Modifier.padding(vertical = 4.dp)
    )
}

@Composable
private fun AvatarPlaceholder() {
    Surface(
        modifier = Modifier.size(50.dp),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.primaryContainer
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = "U",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

@Composable
private fun RoleBasedContent(userRole: SystemRole) {
    Column {
        Text(
            text = "Welcome!",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Your Role: ${userRole.value.replace("_", " ").capitalize()}",
                    style = MaterialTheme.typography.titleMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = getRoleDescription(userRole),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
        
        // Add role-specific widgets/cards here
        when (userRole) {
            SystemRole.SUPERADMIN -> {
                Spacer(modifier = Modifier.height(16.dp))
                Text("Superadmin Controls", style = MaterialTheme.typography.titleMedium)
                // Add superadmin-specific cards
            }
            SystemRole.TENANT_ADMIN -> {
                Spacer(modifier = Modifier.height(16.dp))
                Text("Tenant Management", style = MaterialTheme.typography.titleMedium)
                // Add tenant admin-specific cards
            }
            SystemRole.USER -> {
                Spacer(modifier = Modifier.height(16.dp))
                Text("My Workspace", style = MaterialTheme.typography.titleMedium)
                // Add user-specific cards
            }
        }
    }
}

private fun getRoleDescription(role: SystemRole): String {
    return when (role) {
        SystemRole.SUPERADMIN -> "Full system access across all tenants and organisations."
        SystemRole.TENANT_ADMIN -> "Manage organisations and users within your tenant."
        SystemRole.USER -> "Access assigned features and documents."
    }
}
