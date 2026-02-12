package com.taskflow.dto;

public record NotificationResponse(
    Long id,
    String type,
    String title,
    String message,
    boolean isRead,
    String createdAt
) {
}
