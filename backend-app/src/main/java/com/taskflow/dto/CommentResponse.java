package com.taskflow.dto;

import java.time.LocalDateTime;

public record CommentResponse(
    Long id,
    String content,
    String authorEmail,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
