package com.taskflow.dto;

public record ActivityLogResponse(
    Long id,
    String action,
    String description,
    String userEmail,
    String createdAt
) {
}
