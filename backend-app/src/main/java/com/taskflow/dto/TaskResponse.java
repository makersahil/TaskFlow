package com.taskflow.dto;

import java.time.LocalDate;

import com.taskflow.entity.Task.Priority;
import com.taskflow.entity.Task.Status;

public record TaskResponse(
    Long id,
    String title,
    String description,
    Status status,
    Priority priority,
    LocalDate dueDate
) {
}
