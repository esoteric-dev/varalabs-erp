package com.varalabs.myerp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.varalabs.myerp.MobileStudentsQuery
import com.varalabs.myerp.ui.theme.*
import com.varalabs.myerp.ui.viewmodel.StudentsListState
import com.varalabs.myerp.ui.viewmodel.StudentsViewModel

@Composable
fun StudentsScreen(
    onStudentClick: (String) -> Unit,
    onAddStudentClick: () -> Unit,
    viewModel: StudentsViewModel = hiltViewModel()
) {
    val listState by viewModel.listState.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedClass by viewModel.selectedClass.collectAsState()

    // Extract unique class names for filter chips
    val classNames = remember(listState) {
        (listState as? StudentsListState.Success)
            ?.students?.map { it.className }?.distinct()?.sorted() ?: emptyList()
    }

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAddStudentClick,
                containerColor = SynapseBlue,
                contentColor = White,
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Add Student") }
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
                    text = "Students",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = when (val s = listState) {
                        is StudentsListState.Success -> "${s.students.size} students"
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

            // Class filter chips
            if (classNames.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    item {
                        ClassFilterChip(
                            label = "All",
                            selected = selectedClass == null,
                            onClick = { viewModel.onClassFilter(null) }
                        )
                    }
                    items(classNames) { cn ->
                        ClassFilterChip(
                            label = cn,
                            selected = selectedClass == cn,
                            onClick = { viewModel.onClassFilter(cn) }
                        )
                    }
                }
            }

            // Content
            when (val state = listState) {
                is StudentsListState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SynapseBlue)
                    }
                }
                is StudentsListState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = state.message, color = UrgencyRed)
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedButton(onClick = { viewModel.loadStudents() }) { Text("Retry") }
                        }
                    }
                }
                is StudentsListState.Success -> {
                    if (state.students.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No students found", color = MutedGrey)
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.students, key = { it.id }) { student ->
                                StudentListCard(student = student, onClick = { onStudentClick(student.id) })
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
fun StudentListCard(student: MobileStudentsQuery.Student, onClick: () -> Unit) {
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
                name = student.name,
                photoUrl = student.photoUrl,
                size = 48
            )

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = student.name,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    maxLines = 1
                )
                Text(
                    text = student.className,
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedGrey
                )
                if (student.admissionNumber != null) {
                    Text(
                        text = student.admissionNumber,
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

@Composable
fun StudentAvatar(name: String, photoUrl: String?, size: Int = 48) {
    if (photoUrl != null) {
        AsyncImage(
            model = photoUrl,
            contentDescription = name,
            modifier = Modifier
                .size(size.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
    } else {
        Box(
            modifier = Modifier
                .size(size.dp)
                .clip(CircleShape)
                .background(SynapseBlue.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = name.split(" ").take(2).joinToString("") { it.first().uppercase() },
                color = SynapseBlue,
                fontWeight = FontWeight.Bold,
                fontSize = (size / 3).sp
            )
        }
    }
}

@Composable
fun StudentSearchBar(query: String, onQueryChange: (String) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            Icons.Default.Search,
            contentDescription = null,
            tint = MutedGrey,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(10.dp))
        BasicTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.weight(1f),
            textStyle = TextStyle(
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onBackground
            ),
            cursorBrush = SolidColor(SynapseBlue),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
            singleLine = true,
            decorationBox = { inner ->
                if (query.isEmpty()) {
                    Text("Search students…", color = MutedGrey, fontSize = 15.sp)
                }
                inner()
            }
        )
        if (query.isNotEmpty()) {
            Icon(
                Icons.Default.Clear,
                contentDescription = "Clear",
                tint = MutedGrey,
                modifier = Modifier
                    .size(18.dp)
                    .clickable { onQueryChange("") }
            )
        }
    }
}

@Composable
fun ClassFilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val containerColor = if (selected) SynapseBlue else MaterialTheme.colorScheme.surfaceVariant
    val textColor = if (selected) androidx.compose.ui.graphics.Color.White else MutedGrey

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50.dp))
            .background(containerColor)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Text(text = label, color = textColor, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}
