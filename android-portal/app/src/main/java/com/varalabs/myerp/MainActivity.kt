package com.varalabs.myerp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.varalabs.myerp.ui.screens.*
import com.varalabs.myerp.ui.theme.*
import com.varalabs.myerp.ui.viewmodel.AuthUiState
import com.varalabs.myerp.ui.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

enum class Screen {
    LOGIN,
    DASHBOARD,
    STUDENTS,
    STUDENT_DETAIL,
    ADD_STUDENT,
    STAFF,
    STAFF_DETAIL,
    ADD_STAFF,
    ATTENDANCE,
    NOTICES,
    FEES,
    REPORTS,
    SETTINGS,
    PROFILE;

    /** Which nav-bar item this screen belongs to (for active highlight). */
    val parentScreen: Screen?
        get() = when (this) {
            STUDENT_DETAIL, ADD_STUDENT -> STUDENTS
            STAFF_DETAIL, ADD_STAFF -> STAFF
            else -> null
        }
}

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyERPTheme {
                MainNavigation()
            }
        }
    }
}

@Composable
fun MainNavigation(viewModel: AuthViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    var currentScreen by remember { mutableStateOf(Screen.LOGIN) }
    var selectedStudentId by remember { mutableStateOf("") }

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    // Navigate to dashboard when authenticated
    LaunchedEffect(uiState) {
        if (uiState is AuthUiState.Authenticated && currentScreen == Screen.LOGIN) {
            currentScreen = Screen.DASHBOARD
        }
        if (uiState is AuthUiState.Initial) {
            currentScreen = Screen.LOGIN
        }
        if (uiState is AuthUiState.Error && (uiState as AuthUiState.Error).message == "Session expired") {
            currentScreen = Screen.LOGIN
            viewModel.resetState()
        }
    }

    val isLoggedIn = uiState is AuthUiState.Authenticated
    val activeModules = if (isLoggedIn) viewModel.activeModules else emptyList()

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = isLoggedIn,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = MaterialTheme.colorScheme.surface,
                drawerShape = RoundedCornerShape(0.dp),
                modifier = Modifier.width(300.dp)
            ) {
                DrawerContent(
                    viewModel = viewModel,
                    onLogout = {
                        viewModel.logout()
                        scope.launch { drawerState.close() }
                    },
                    onClose = { scope.launch { drawerState.close() } }
                )
            }
        }
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AnimatedContent(
                targetState = currentScreen,
                transitionSpec = {
                    fadeIn(animationSpec = tween(200)) togetherWith fadeOut(animationSpec = tween(200))
                },
                label = "ScreenTransition"
            ) { targetScreen ->
                when (targetScreen) {
                    Screen.LOGIN -> {
                        val orgSelectionState = uiState as? AuthUiState.OrgSelectionRequired
                        LoginScreen(
                            onLoginSubmit = { email, password -> viewModel.login(email, password) },
                            isLoading = uiState is AuthUiState.Loading,
                            errorMessage = (uiState as? AuthUiState.Error)?.message,
                            orgSelectionOrgs = orgSelectionState?.orgs,
                            orgSelectionSessionToken = orgSelectionState?.sessionToken,
                            onOrgSelected = { token, orgId -> viewModel.selectOrg(token, orgId) }
                        )
                    }

                    Screen.DASHBOARD -> {
                        DashboardScreen(
                            orgName = viewModel.orgDisplayName,
                            userRole = viewModel.userOrgRole.lowercase(),
                            onModuleClick = { moduleId ->
                                when (moduleId) {
                                    "noticeboard" -> currentScreen = Screen.NOTICES
                                    "students" -> currentScreen = Screen.STUDENTS
                                    "attendance" -> currentScreen = Screen.ATTENDANCE
                                    "users" -> currentScreen = Screen.STAFF
                                    "fees" -> currentScreen = Screen.FEES
                                    "reports" -> currentScreen = Screen.REPORTS
                                }
                            },
                            onLogout = { viewModel.logout() }
                        )
                    }

                    Screen.STUDENTS -> {
                        StudentsScreen(
                            onStudentClick = { studentId ->
                                selectedStudentId = studentId
                                currentScreen = Screen.STUDENT_DETAIL
                            },
                            onAddStudentClick = { currentScreen = Screen.ADD_STUDENT }
                        )
                    }

                    Screen.STUDENT_DETAIL -> {
                        StudentDetailScreen(
                            studentId = selectedStudentId,
                            onBack = { currentScreen = Screen.STUDENTS }
                        )
                    }

                    Screen.ADD_STUDENT -> {
                        AddStudentScreen(
                            onBack = { currentScreen = Screen.STUDENTS },
                            onSuccess = { currentScreen = Screen.STUDENTS }
                        )
                    }

                    Screen.STAFF -> {
                        StaffScreen(
                            onStaffClick = { staffId ->
                                // TODO: Use a separate ID variable if needed, or reuse selectedStudentId if it's generic
                                selectedStudentId = staffId
                                currentScreen = Screen.STAFF_DETAIL
                            },
                            onAddStaffClick = { currentScreen = Screen.ADD_STAFF }
                        )
                    }

                    Screen.STAFF_DETAIL -> {
                        StaffDetailScreen(
                            staffId = selectedStudentId,
                            onBack = { currentScreen = Screen.STAFF }
                        )
                    }

                    Screen.ADD_STAFF -> {
                        AddStaffScreen(
                            onBack = { currentScreen = Screen.STAFF },
                            onSuccess = { currentScreen = Screen.STAFF }
                        )
                    }

                    Screen.ATTENDANCE -> {
                        AttendanceScreen()
                    }

                    Screen.NOTICES -> {
                        NoticeScreen()
                    }

                    Screen.FEES -> {
                        FeesScreen()
                    }

                    Screen.REPORTS -> {
                        ReportsScreen()
                    }

                    Screen.SETTINGS -> {
                        SettingsScreen(onBack = { currentScreen = Screen.DASHBOARD })
                    }

                    Screen.PROFILE -> {
                        ProfileScreen(onLogout = { viewModel.logout() })
                    }
                }
            }

            // Floating nav bar (not on login or detail/form screens)
            val isDetailOrForm = currentScreen in listOf(
                Screen.STUDENT_DETAIL, Screen.ADD_STUDENT,
                Screen.STAFF_DETAIL, Screen.ADD_STAFF,
                Screen.SETTINGS
            )

            if (isLoggedIn && currentScreen != Screen.LOGIN && !isDetailOrForm) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) {
                    FloatingIsland(
                        currentScreen = currentScreen,
                        activeModules = activeModules,
                        onNavigate = { screen -> currentScreen = screen }
                    )
                }
            }
        }
    }
}

@Composable
fun DrawerContent(
    viewModel: AuthViewModel,
    onLogout: () -> Unit,
    onClose: () -> Unit
) {
    val name = viewModel.userName
    val email = viewModel.userEmail
    val orgName = viewModel.orgDisplayName
    val initials = name.split(" ").take(2).joinToString("") { it.firstOrNull()?.uppercase() ?: "" }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Header
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(SynapseBlue)
                .padding(24.dp)
                .padding(top = 32.dp)
        ) {
            Column {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = initials.ifEmpty { "?" }, color = White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                }
                Spacer(modifier = Modifier.height(14.dp))
                Text(text = name.ifEmpty { "User" }, color = White, fontWeight = FontWeight.Bold)
                Text(text = email, color = White.copy(alpha = 0.7f), fontSize = 13.sp)
                if (orgName.isNotEmpty()) {
                    Text(text = orgName, color = White.copy(alpha = 0.55f), fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        NavigationDrawerItem(
            label = { Text("Settings") },
            selected = false,
            onClick = {
                onClose()
                currentScreen = Screen.SETTINGS
            },
            modifier = Modifier.padding(horizontal = 12.dp),
            icon = { Icon(Icons.Default.Settings, contentDescription = null) }
        )

        HorizontalDivider(
            modifier = Modifier.padding(vertical = 12.dp, horizontal = 24.dp),
            color = LightGrey
        )

        NavigationDrawerItem(
            label = { Text("Sign Out") },
            selected = false,
            onClick = onLogout,
            modifier = Modifier.padding(horizontal = 12.dp),
            icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null) },
            colors = NavigationDrawerItemDefaults.colors(
                unselectedTextColor = UrgencyRed,
                unselectedIconColor = UrgencyRed
            )
        )
    }
}
