package com.varalabs.myerp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.varalabs.myerp.MobileNoticesQuery
import com.varalabs.myerp.ui.theme.*
import com.varalabs.myerp.ui.viewmodel.NoticesUiState
import com.varalabs.myerp.ui.viewmodel.NoticesViewModel
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@Composable
fun NoticeScreen(viewModel: NoticesViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(top = 56.dp, bottom = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            Column {
                Text(
                    text = "Notices",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                if (uiState is NoticesUiState.Success) {
                    val count = (uiState as NoticesUiState.Success).notices.size
                    Text("$count announcements", style = MaterialTheme.typography.bodySmall, color = MutedGrey)
                }
            }
            IconButton(onClick = { viewModel.load() }) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = MutedGrey)
            }
        }

        when (val state = uiState) {
            is NoticesUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SynapseBlue)
                }
            }
            is NoticesUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message, color = UrgencyRed)
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedButton(onClick = { viewModel.load() }) { Text("Retry") }
                    }
                }
            }
            is NoticesUiState.Success -> {
                if (state.notices.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No notices", color = MutedGrey)
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.notices, key = { it.id }) { notice ->
                            NoticeCard(notice)
                        }
                        item { Spacer(modifier = Modifier.height(80.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
fun NoticeCard(notice: MobileNoticesQuery.Notice) {
    val priorityColor = when (notice.priority) {
        "urgent" -> UrgencyRed
        "high" -> GuardianOrange
        "normal" -> SynapseBlue
        else -> MutedGrey
    }
    val audienceIcon = when (notice.audience) {
        "teachers" -> Icons.Default.School
        "students" -> Icons.Default.MenuBook
        "parents" -> Icons.Default.FamilyRestroom
        "staff" -> Icons.Default.Badge
        else -> Icons.Default.Campaign
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Priority + audience row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(RoundedCornerShape(50))
                            .background(priorityColor)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = notice.priority.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall,
                        color = priorityColor,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(audienceIcon, contentDescription = null, tint = MutedGrey, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = notice.audience.replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall,
                        color = MutedGrey
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = notice.title,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = notice.body,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Footer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = notice.createdByName,
                    style = MaterialTheme.typography.labelSmall,
                    color = MutedGrey
                )
                Text(
                    text = formatNoticeDate(notice.createdAt),
                    style = MaterialTheme.typography.labelSmall,
                    color = MutedGrey.copy(alpha = 0.7f)
                )
            }

            if (notice.targetClasses != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Classes: ${notice.targetClasses}",
                    style = MaterialTheme.typography.labelSmall,
                    color = SynapseBlue
                )
            }
        }
    }
}

private fun formatNoticeDate(iso: String): String {
    return try {
        val instant = Instant.parse(iso)
        val now = Instant.now()
        val hoursAgo = ChronoUnit.HOURS.between(instant, now)
        when {
            hoursAgo < 1 -> "Just now"
            hoursAgo < 24 -> "${hoursAgo}h ago"
            hoursAgo < 48 -> "Yesterday"
            else -> DateTimeFormatter.ofPattern("MMM d")
                .withZone(ZoneId.systemDefault())
                .format(instant)
        }
    } catch (e: Exception) {
        iso
    }
}
