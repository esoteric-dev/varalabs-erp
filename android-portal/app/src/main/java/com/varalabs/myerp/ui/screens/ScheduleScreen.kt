package com.varalabs.myerp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.varalabs.myerp.ui.theme.LightGrey
import com.varalabs.myerp.ui.theme.MutedGrey
import com.varalabs.myerp.ui.theme.SynapseBlue

@Composable
fun ScheduleScreen() {
    val scheduleItems = listOf(
        ScheduleItem("Mathematics", "9:00 AM - 10:00 AM", "Room 101"),
        ScheduleItem("Physics", "10:15 AM - 11:15 AM", "Lab 2"),
        ScheduleItem("Chemistry", "11:30 AM - 12:30 PM", "Room 203"),
        ScheduleItem("Lunch Break", "12:30 PM - 1:30 PM", "Cafeteria"),
        ScheduleItem("History", "1:30 PM - 2:30 PM", "Room 304")
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
                .padding(top = 24.dp)
        ) {
            Text(
                text = "My Schedule",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(scheduleItems) { item ->
                ScheduleCard(item)
            }
        }
    }
}

@Composable
fun ScheduleCard(item: ScheduleItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(SynapseBlue.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.CalendarToday, contentDescription = null, tint = SynapseBlue)
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(text = item.subject, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(text = item.time, style = MaterialTheme.typography.bodySmall, color = MutedGrey)
                Text(text = item.location, style = MaterialTheme.typography.labelSmall, color = MutedGrey.copy(alpha = 0.7f))
            }
        }
    }
}

data class ScheduleItem(val subject: String, val time: String, val location: String)
