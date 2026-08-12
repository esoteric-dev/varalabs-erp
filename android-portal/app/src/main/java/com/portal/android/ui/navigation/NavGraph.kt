package com.portal.android.ui.navigation

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.portal.android.ui.screens.LoginScreen
import com.portal.android.ui.screens.OrgSelectionScreen
import com.portal.android.ui.screens.DashboardScreen
import com.portal.android.ui.viewmodel.AuthViewModel

/**
 * Navigation routes for the app
 */
sealed class Screen(val route: String) {
    object Login : Screen("login")
    object OrgSelection : Screen("org_selection")
    object Dashboard : Screen("dashboard")
}

/**
 * Main navigation graph with role-based routing
 */
@Composable
fun AppNavGraph(
    navController: NavHostController,
    viewModel: AuthViewModel = hiltViewModel()
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { userContext ->
                    // Navigate based on role
                    when (userContext.systemRole) {
                        else -> navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                },
                onOrgSelectionRequired = { sessionToken, orgs ->
                    navController.navigate("${Screen.OrgSelection.route}/$sessionToken") {
                        popUpTo(Screen.Login.route) { inclusive = false }
                    }
                },
                viewModel = viewModel
            )
        }
        
        composable(
            route = "${Screen.OrgSelection.route}/{sessionToken}",
            arguments = listOf(
                navArgument("sessionToken") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val sessionToken = backStackEntry.arguments?.getString("sessionToken") ?: return@composable
            OrgSelectionScreen(
                sessionToken = sessionToken,
                onOrgSelected = { 
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.OrgSelection.route) { inclusive = true }
                    }
                },
                onBack = {
                    navController.popBackStack()
                },
                viewModel = viewModel
            )
        }
        
        composable(Screen.Dashboard.route) {
            DashboardScreen(
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                viewModel = viewModel
            )
        }
    }
}
