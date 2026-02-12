package com.taskflow.dto;

public record ShareProjectRequest(
    String memberEmail,
    String role
) {
}
