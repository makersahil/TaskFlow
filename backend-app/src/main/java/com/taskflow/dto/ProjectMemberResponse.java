package com.taskflow.dto;

public record ProjectMemberResponse(
    Long id,
    String email,
    String role,
    String joinedAt
) {
}
