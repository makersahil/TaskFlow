package com.taskflow.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.taskflow.dto.TaskRequest;
import com.taskflow.dto.TaskResponse;
import com.taskflow.dto.TaskAssignmentRequest;
import com.taskflow.dto.TaskAssigneeResponse;
import com.taskflow.entity.Task;
import com.taskflow.entity.TaskAssignment;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.Project;
import com.taskflow.entity.User;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.ProjectUserRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.TaskAssignmentRepository;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.AuthContext;
import com.taskflow.security.ProjectAccessService;
import com.taskflow.service.NotificationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
@Validated
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectUserRepository projectUserRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final NotificationService notificationService;
    private final ActivityLogRepository activityLogRepository;
    private final AuthContext authContext;
    private final ProjectAccessService projectAccessService;

    public TaskController(
        TaskRepository taskRepository,
        UserRepository userRepository,
        ProjectUserRepository projectUserRepository,
        TaskAssignmentRepository taskAssignmentRepository,
        NotificationService notificationService,
        ActivityLogRepository activityLogRepository,
        AuthContext authContext,
        ProjectAccessService projectAccessService
    ) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.projectUserRepository = projectUserRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.notificationService = notificationService;
        this.activityLogRepository = activityLogRepository;
        this.authContext = authContext;
        this.projectAccessService = projectAccessService;
    }

    private ProjectAccessService.AccessContext getAccess(Long projectId) {
        return projectAccessService.requireAccess(projectId, authContext.getCurrentUserEmail());
    }

    @GetMapping
    public ResponseEntity<?> listTasks(
        @PathVariable Long projectId,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String priority
    ) {
        try {
            Project project = getAccess(projectId).getProject();
            List<TaskResponse> tasks = taskRepository.findByProject(project)
                .stream()
                .filter(t -> search == null || t.getTitle().toLowerCase().contains(search.toLowerCase()) || 
                    (t.getDescription() != null && t.getDescription().toLowerCase().contains(search.toLowerCase())))
                .filter(t -> status == null || t.getStatus().toString().equals(status))
                .filter(t -> priority == null || t.getPriority().toString().equals(priority))
                .map(t -> new TaskResponse(t.getId(), t.getTitle(), t.getDescription(), t.getStatus(), t.getPriority(), t.getDueDate()))
                .collect(Collectors.toList());
            return ResponseEntity.ok(tasks);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createTask(@PathVariable Long projectId, @Valid @RequestBody TaskRequest request) {
        try {
            ProjectAccessService.AccessContext access = getAccess(projectId);
            if (!access.getRole().canEditTasks()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Insufficient role to create tasks"));
            }
            Project project = access.getProject();
            Task task = new Task(
                request.title(),
                request.description(),
                request.status() != null ? request.status() : Task.Status.TODO,
                request.priority() != null ? request.priority() : Task.Priority.MEDIUM,
                request.dueDate(),
                project
            );
            taskRepository.save(task);

            ActivityLog log = new ActivityLog(
                project,
                userRepository.findByEmail(authContext.getCurrentUserEmail()).orElse(project.getOwner()),
                "TASK_CREATED",
                "TASK",
                task.getId(),
                "Created task \"" + task.getTitle() + "\""
            );
            activityLogRepository.save(log);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new TaskResponse(task.getId(), task.getTitle(), task.getDescription(), task.getStatus(), task.getPriority(), task.getDueDate()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<?> updateTask(
        @PathVariable Long projectId,
        @PathVariable Long taskId,
        @Valid @RequestBody TaskRequest request
    ) {
        try {
            ProjectAccessService.AccessContext access = getAccess(projectId);
            if (!access.getRole().canEditTasks()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Insufficient role to update tasks"));
            }
            Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

            if (!task.getProject().getId().equals(projectId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Task does not belong to this project"));
            }

            if (request.title() != null) {
                task.setTitle(request.title());
            }
            if (request.description() != null) {
                task.setDescription(request.description());
            }
            if (request.status() != null) {
                task.setStatus(request.status());
            }
            if (request.priority() != null) {
                task.setPriority(request.priority());
            }
            if (request.dueDate() != null) {
                task.setDueDate(request.dueDate());
            }

            taskRepository.save(task);

            ActivityLog log = new ActivityLog(
                task.getProject(),
                userRepository.findByEmail(authContext.getCurrentUserEmail()).orElse(task.getProject().getOwner()),
                "TASK_UPDATED",
                "TASK",
                task.getId(),
                "Updated task \"" + task.getTitle() + "\""
            );
            activityLogRepository.save(log);
            return ResponseEntity.ok(new TaskResponse(task.getId(), task.getTitle(), task.getDescription(), task.getStatus(), task.getPriority(), task.getDueDate()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<?> deleteTask(@PathVariable Long projectId, @PathVariable Long taskId) {
        try {
            ProjectAccessService.AccessContext access = getAccess(projectId);
            if (!access.getRole().canEditTasks()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Insufficient role to delete tasks"));
            }
            Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

            if (!task.getProject().getId().equals(projectId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Task does not belong to this project"));
            }

            taskRepository.deleteById(taskId);

            ActivityLog log = new ActivityLog(
                task.getProject(),
                userRepository.findByEmail(authContext.getCurrentUserEmail()).orElse(task.getProject().getOwner()),
                "TASK_DELETED",
                "TASK",
                task.getId(),
                "Deleted task \"" + task.getTitle() + "\""
            );
            activityLogRepository.save(log);
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/{taskId}/assignees")
    public ResponseEntity<List<TaskAssigneeResponse>> getTaskAssignees(@PathVariable Long projectId, @PathVariable Long taskId) {
        try {
            getAccess(projectId);
            Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

            List<TaskAssigneeResponse> assignees = taskAssignmentRepository.findByTaskId(taskId)
                .stream()
                .map(ta -> new TaskAssigneeResponse(ta.getAssignedTo().getId(), ta.getAssignedTo().getEmail()))
                .toList();

            return ResponseEntity.ok(assignees);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(List.of());
        }
    }

    @PostMapping("/{taskId}/assign")
    public ResponseEntity<?> assignTask(@PathVariable Long projectId, @PathVariable Long taskId, @Valid @RequestBody TaskAssignmentRequest request) {
        try {
            ProjectAccessService.AccessContext access = getAccess(projectId);
            if (!access.getRole().canAssignTasks()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Insufficient role to assign tasks"));
            }
            Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

            User assignee = userRepository.findByEmail(request.assigneeEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

            boolean isAssigneeOwner = task.getProject().getOwner().getId().equals(assignee.getId());
            boolean isAssigneeMember = projectUserRepository.findByProjectIdAndUserId(projectId, assignee.getId()).isPresent();
            if (!isAssigneeOwner && !isAssigneeMember) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "User is not a member of this project"));
            }

            if (taskAssignmentRepository.findByTaskIdAndAssignedToId(taskId, assignee.getId()).isPresent()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "User already assigned to this task"));
            }

            TaskAssignment assignment = new TaskAssignment(task, assignee);
            taskAssignmentRepository.save(assignment);

            // Create activity log
            ActivityLog log = new ActivityLog(
                task.getProject(),
                userRepository.findByEmail(authContext.getCurrentUserEmail()).orElse(null),
                "TASK_ASSIGNED",
                "TASK",
                task.getId(),
                "Assigned task to " + assignee.getEmail()
            );
            activityLogRepository.save(log);

            // Create notification
            notificationService.notify(
                assignee,
                "TASK_ASSIGNED",
                "Task assigned to you",
                "You have been assigned to \"" + task.getTitle() + "\"",
                "TASK",
                task.getId()
            );

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Task assigned successfully"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{taskId}/assign/{userId}")
    public ResponseEntity<?> unassignTask(@PathVariable Long projectId, @PathVariable Long taskId, @PathVariable Long userId) {
        try {
            ProjectAccessService.AccessContext access = getAccess(projectId);
            if (!access.getRole().canAssignTasks()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Insufficient role to unassign tasks"));
            }
            taskAssignmentRepository.deleteByTaskIdAndAssignedToId(taskId, userId);

            ActivityLog log = new ActivityLog(
                taskRepository.findById(taskId).map(Task::getProject).orElse(null),
                userRepository.findByEmail(authContext.getCurrentUserEmail()).orElse(null),
                "TASK_UNASSIGNED",
                "TASK",
                taskId,
                "Removed assignee from task"
            );
            activityLogRepository.save(log);
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }
}
