package com.taskflow.dto;

public record UserProfileResponse(
    Long id,
    String email,
    Integer projectCount,
    Integer taskCount
) {
}
