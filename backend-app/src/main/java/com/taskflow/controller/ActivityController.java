package com.taskflow.controller;

import com.taskflow.dto.ActivityLogResponse;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.Project;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.ProjectUserRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.AuthContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/activity")
@Validated
public class ActivityController {

    private final ActivityLogRepository activityLogRepository;
    private final ProjectRepository projectRepository;
    private final ProjectUserRepository projectUserRepository;
    private final UserRepository userRepository;
    private final AuthContext authContext;

    public ActivityController(
        ActivityLogRepository activityLogRepository,
        ProjectRepository projectRepository,
        ProjectUserRepository projectUserRepository,
        UserRepository userRepository,
        AuthContext authContext
    ) {
        this.activityLogRepository = activityLogRepository;
        this.projectRepository = projectRepository;
        this.projectUserRepository = projectUserRepository;
        this.userRepository = userRepository;
        this.authContext = authContext;
    }

    @GetMapping
    public ResponseEntity<List<ActivityLogResponse>> getProjectActivity(@PathVariable Long projectId) {
        String email = authContext.getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));

        Long userId = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"))
            .getId();

        boolean isOwner = project.getOwner().getEmail().equals(email);
        boolean isMember = projectUserRepository.findByProjectIdAndUserId(projectId, userId).isPresent();
        if (!isOwner && !isMember) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<ActivityLog> logs = activityLogRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        List<ActivityLogResponse> responses = logs.stream()
            .map(log -> new ActivityLogResponse(
                log.getId(),
                log.getAction(),
                log.getDescription(),
                log.getUser().getEmail(),
                log.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            ))
            .toList();

        return ResponseEntity.ok(responses);
    }
}
