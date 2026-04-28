package com.varalabs.myerp.ui.screens

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.varalabs.myerp.Screen
import com.varalabs.myerp.ui.theme.*

@Composable
fun FloatingIsland(
    currentScreen: Screen,
    activeModules: List<String>,
    onNavigate: (Screen) -> Unit
) {
    val navItems = remember(activeModules) {
        buildList {
            add(NavItem(Screen.DASHBOARD, Icons.Default.Dashboard, "Home"))
            if ("students" in activeModules)
                add(NavItem(Screen.STUDENTS, Icons.Default.People, "Students"))
            if ("users" in activeModules)
                add(NavItem(Screen.STAFF, Icons.Default.Badge, "Staff"))
            if ("attendance" in activeModules)
                add(NavItem(Screen.ATTENDANCE, Icons.Default.CheckCircle, "Attendance"))
            if ("noticeboard" in activeModules)
                add(NavItem(Screen.NOTICES, Icons.Default.Campaign, "Notices"))
            add(NavItem(Screen.PROFILE, Icons.Default.Person, "Profile"))
        }
    }

    Box(
        modifier = Modifier
            .padding(bottom = 28.dp)
            .fillMaxWidth(),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            modifier = Modifier.wrapContentSize().padding(horizontal = 16.dp),
            shape = RoundedCornerShape(32.dp),
            color = OledBlack.copy(alpha = 0.92f),
            tonalElevation = 8.dp,
            shadowElevation = 12.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                navItems.forEach { item ->
                    IslandNavItem(
                        item = item,
                        isSelected = currentScreen == item.screen || currentScreen.parentScreen == item.screen,
                        onClick = { onNavigate(item.screen) }
                    )
                }
            }
        }
    }
}

@Composable
fun IslandNavItem(item: NavItem, isSelected: Boolean, onClick: () -> Unit) {
    val width by animateDpAsState(
        targetValue = if (isSelected) 100.dp else 50.dp,
        animationSpec = spring(dampingRatio = 0.8f, stiffness = 400f),
        label = "width"
    )

    Box(
        modifier = Modifier
            .height(44.dp)
            .width(width)
            .clip(CircleShape)
            .background(if (isSelected) SynapseBlue else Color.Transparent)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.padding(horizontal = 12.dp)
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = item.label,
                tint = if (isSelected) White else MutedGrey,
                modifier = Modifier.size(22.dp)
            )
            if (isSelected) {
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = item.label,
                    color = White,
                    style = MaterialTheme.typography.labelLarge,
                    maxLines = 1
                )
            }
        }
    }
}

data class NavItem(val screen: Screen, val icon: ImageVector, val label: String)
