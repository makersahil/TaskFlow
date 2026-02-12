package com.taskflow.controller;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.taskflow.dto.DashboardStatsResponse;
import com.taskflow.entity.Project;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.ProjectUserRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.AuthContext;

@RestController
@RequestMapping("/api/dashboard")
@Validated
public class DashboardController {

    private final ProjectRepository projectRepository;
    private final ProjectUserRepository projectUserRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final AuthContext authContext;

    public DashboardController(
        ProjectRepository projectRepository,
        ProjectUserRepository projectUserRepository,
        TaskRepository taskRepository,
        UserRepository userRepository,
        AuthContext authContext
    ) {
        this.projectRepository = projectRepository;
        this.projectUserRepository = projectUserRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.authContext = authContext;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        String email = authContext.getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Not authenticated"));
        }

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Map<Long, Project> projectMap = new LinkedHashMap<>();
        projectRepository.findByOwner(user)
            .forEach(project -> projectMap.put(project.getId(), project));

        projectUserRepository.findByUserId(user.getId())
            .forEach(member -> projectMap.putIfAbsent(member.getProject().getId(), member.getProject()));

        List<Project> projects = projectMap.values().stream().toList();
        List<Task> tasks = projects.isEmpty() ? List.of() : taskRepository.findByProjectIn(projects);

        int doneTasks = (int) tasks.stream()
            .filter(task -> task.getStatus() == Task.Status.DONE)
            .count();

        LocalDate today = LocalDate.now();
        int overdueTasks = (int) tasks.stream()
            .filter(task -> task.getDueDate() != null)
            .filter(task -> task.getDueDate().isBefore(today))
            .filter(task -> task.getStatus() != Task.Status.DONE)
            .count();

        DashboardStatsResponse response = new DashboardStatsResponse(
            projects.size(),
            tasks.size(),
            doneTasks,
            overdueTasks
        );

        return ResponseEntity.ok(response);
    }
}
