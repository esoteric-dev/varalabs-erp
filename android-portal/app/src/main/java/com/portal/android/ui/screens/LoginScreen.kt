package com.portal.android.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.portal.android.data.model.SystemRole
import com.portal.android.data.model.UserContext
import com.portal.android.data.model.OrgOption
import com.portal.android.ui.viewmodel.AuthViewModel
import com.portal.android.ui.viewmodel.AuthUiState

/**
 * Login screen with email/password form
 */
@Composable
fun LoginScreen(
    onLoginSuccess: (UserContext) -> Unit,
    onOrgSelectionRequired: (String, List<OrgOption>) -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showError by remember { mutableStateOf(false) }
    
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(uiState) {
        when (val state = uiState) {
            is AuthUiState.Success -> {
                onLoginSuccess(state.userContext)
            }
            is AuthUiState.OrgSelectionRequired -> {
                onOrgSelectionRequired(state.sessionToken, state.orgs)
            }
            is AuthUiState.Error -> {
                showError = true
            }
            else -> {}
        }
    }
    
    if (showError && uiState is AuthUiState.Error) {
        AlertDialog(
            onDismissRequest = { 
                showError = false
                viewModel.clearError()
            },
            title = { Text("Login Failed") },
            text = { Text((uiState as AuthUiState.Error).message) },
            confirmButton = {
                TextButton(onClick = { 
                    showError = false
                    viewModel.clearError()
                }) {
                    Text("OK")
                }
            }
        )
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Welcome Back",
            style = MaterialTheme.typography.headlineLarge,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        Text(
            text = "Sign in to continue",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = 32.dp)
        )
        
        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        )
        
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp)
        )
        
        Button(
            onClick = { viewModel.login(email, password) },
            enabled = uiState !is AuthUiState.Loading && email.isNotBlank() && password.isNotBlank(),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            if (uiState is AuthUiState.Loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Sign In")
            }
        }
    }
}
