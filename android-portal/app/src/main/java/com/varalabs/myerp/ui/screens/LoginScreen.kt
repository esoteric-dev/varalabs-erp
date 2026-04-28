package com.varalabs.myerp.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.varalabs.myerp.data.remote.api.OrgBriefDto
import com.varalabs.myerp.ui.theme.*

@Composable
fun LoginScreen(
    onLoginSubmit: (String, String) -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null,
    orgSelectionOrgs: List<OrgBriefDto>? = null,
    orgSelectionSessionToken: String? = null,
    onOrgSelected: (sessionToken: String, orgId: String) -> Unit = { _, _ -> }
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPasswordStep by remember { mutableStateOf(false) }
    val isEmailValid = email.contains("@") && email.contains(".")

    // If org selection is required, show that screen instead
    if (orgSelectionOrgs != null && orgSelectionSessionToken != null) {
        OrgSelectionScreen(
            orgs = orgSelectionOrgs,
            onOrgSelected = { orgId -> onOrgSelected(orgSelectionSessionToken, orgId) },
            isLoading = isLoading
        )
        return
    }

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Box(modifier = Modifier.fillMaxSize()) {
            if (showPasswordStep) {
                IconButton(
                    onClick = { showPasswordStep = false },
                    modifier = Modifier.padding(16.dp).padding(top = 32.dp)
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Logo / app name
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(SynapseBlue),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "ERP",
                        color = Color.White,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "Varalabs ERP",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                AnimatedContent(
                    targetState = showPasswordStep,
                    transitionSpec = {
                        fadeIn(animationSpec = tween(200)) togetherWith fadeOut(animationSpec = tween(100))
                    },
                    label = "subtitle"
                ) { isPassword ->
                    Text(
                        text = when {
                            isPassword -> "Enter your password"
                            isEmailValid -> "Welcome back! Tap Continue"
                            else -> "Sign in with your work email"
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                }

                Spacer(modifier = Modifier.height(48.dp))

                AnimatedContent(
                    targetState = showPasswordStep,
                    transitionSpec = {
                        if (targetState) {
                            slideInHorizontally { it } + fadeIn() togetherWith slideOutHorizontally { -it } + fadeOut()
                        } else {
                            slideInHorizontally { -it } + fadeIn() togetherWith slideOutHorizontally { it } + fadeOut()
                        }
                    },
                    label = "input"
                ) { isPassword ->
                    if (isPassword) {
                        TelegramInput(
                            value = password,
                            onValueChange = { password = it },
                            placeholder = "Password",
                            keyboardType = KeyboardType.Password,
                            isPassword = true
                        )
                    } else {
                        TelegramInput(
                            value = email,
                            onValueChange = { email = it },
                            placeholder = "Email address",
                            keyboardType = KeyboardType.Email
                        )
                    }
                }

                if (errorMessage != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                Button(
                    onClick = {
                        if (!showPasswordStep) {
                            if (email.isNotEmpty()) showPasswordStep = true
                        } else {
                            onLoginSubmit(email, password)
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = SynapseBlue),
                    enabled = !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = if (showPasswordStep) "Sign In" else "Continue",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun OrgSelectionScreen(
    orgs: List<OrgBriefDto>,
    onOrgSelected: (orgId: String) -> Unit,
    isLoading: Boolean
) {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(80.dp))

            Text(
                text = "Select your campus",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "You're associated with multiple campuses",
                style = MaterialTheme.typography.bodyMedium,
                color = MutedGrey,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp)
            )

            Spacer(modifier = Modifier.height(40.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(orgs) { org ->
                    OrgSelectionCard(
                        org = org,
                        onClick = { if (!isLoading) onOrgSelected(org.id) }
                    )
                }
            }
        }
    }
}

@Composable
fun OrgSelectionCard(org: OrgBriefDto, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (org.logo_url != null) {
                AsyncImage(
                    model = org.logo_url,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp).clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(SynapseBlue.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = (org.display_name ?: org.name).take(2).uppercase(),
                        color = SynapseBlue,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(text = org.display_name ?: org.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Text(text = org.name, style = MaterialTheme.typography.bodySmall, color = MutedGrey)
            }
        }
    }
}

@Composable
fun TelegramInput(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            textStyle = TextStyle(
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.Medium
            ),
            cursorBrush = SolidColor(SynapseBlue),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
            decorationBox = { innerTextField ->
                Box(modifier = Modifier.padding(vertical = 12.dp)) {
                    if (value.isEmpty()) {
                        Text(
                            text = placeholder,
                            style = TextStyle(
                                fontSize = 18.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                            )
                        )
                    }
                    innerTextField()
                }
            }
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.2f))
        )
    }
}
