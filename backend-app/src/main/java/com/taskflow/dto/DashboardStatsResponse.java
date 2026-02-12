package com.taskflow.dto;

public record DashboardStatsResponse(
    int totalProjects,
    int totalTasks,
    int doneTasks,
    int overdueTasks
) {
}
