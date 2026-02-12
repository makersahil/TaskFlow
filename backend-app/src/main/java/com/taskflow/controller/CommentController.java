package com.taskflow.controller;

import java.util.List;
import java.util.Map;

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
import org.springframework.web.bind.annotation.RestController;

import com.taskflow.dto.CommentRequest;
import com.taskflow.dto.CommentResponse;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.Comment;
import com.taskflow.entity.Task;
import com.taskflow.entity.TaskAssignment;
import com.taskflow.entity.User;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.TaskAssignmentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.AuthContext;
import com.taskflow.security.ProjectAccessService;
import com.taskflow.security.ProjectRole;
import com.taskflow.service.NotificationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks/{taskId}/comments")
@Validated
public class CommentController {

    private final TaskRepository taskRepository;
    private final CommentRepository commentRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final ActivityLogRepository activityLogRepository;
    private final NotificationService notificationService;
    private final AuthContext authContext;
    private final ProjectAccessService projectAccessService;

    public CommentController(
        TaskRepository taskRepository,
        CommentRepository commentRepository,
        TaskAssignmentRepository taskAssignmentRepository,
        ActivityLogRepository activityLogRepository,
        NotificationService notificationService,
        AuthContext authContext,
        ProjectAccessService projectAccessService
    ) {
        this.taskRepository = taskRepository;
        this.commentRepository = commentRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.activityLogRepository = activityLogRepository;
        this.notificationService = notificationService;
        this.authContext = authContext;
        this.projectAccessService = projectAccessService;
    }

    private ProjectAccessService.AccessContext getAccess(Long projectId) {
        return projectAccessService.requireAccess(projectId, authContext.getCurrentUserEmail());
    }

    private Task getTask(Long projectId, Long taskId) {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getProject().getId().equals(projectId)) {
            throw new RuntimeException("Task does not belong to this project");
        }

        return task;
    }

    @GetMapping
    public ResponseEntity<?> listComments(@PathVariable Long projectId, @PathVariable Long taskId) {
        try {
            getAccess(projectId);
            Task task = getTask(projectId, taskId);
            List<CommentResponse> comments = commentRepository.findByTaskOrderByCreatedAtDesc(task)
                .stream()
                .map(c -> new CommentResponse(
                    c.getId(),
                    c.getContent(),
                    c.getAuthor().getEmail(),
                    c.getCreatedAt(),
                    c.getUpdatedAt()
                ))
                .toList();
            return ResponseEntity.ok(comments);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createComment(
        @PathVariable Long projectId,
        @PathVariable Long taskId,
        @Valid @RequestBody CommentRequest request
    ) {
        try {
            ProjectAccessService.AccessContext access = getAccess(projectId);
            if (!access.getRole().canComment()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Insufficient role to add comments"));
            }

            Task task = getTask(projectId, taskId);
            User author = access.getUser();

            Comment comment = new Comment(request.content(), task, author);
            commentRepository.save(comment);

            ActivityLog log = new ActivityLog(
                task.getProject(),
                author,
                "COMMENT_ADDED",
                "COMMENT",
                comment.getId(),
                "Added comment to task \"" + task.getTitle() + "\""
            );
            activityLogRepository.save(log);

            List<TaskAssignment> assignments = taskAssignmentRepository.findByTaskId(task.getId());
            for (TaskAssignment assignment : assignments) {
                User assignee = assignment.getAssignedTo();
                if (assignee.getId().equals(author.getId())) {
                    continue;
                }
                notificationService.notify(
                    assignee,
                    "COMMENT_ADDED",
                    "New comment on task",
                    author.getEmail() + " commented on \"" + task.getTitle() + "\"",
                    "TASK",
                    task.getId()
                );
            }

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CommentResponse(
                    comment.getId(),
                    comment.getContent(),
                    comment.getAuthor().getEmail(),
                    comment.getCreatedAt(),
                    comment.getUpdatedAt()
                ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<?> updateComment(
        @PathVariable Long projectId,
        @PathVariable Long taskId,
        @PathVariable Long commentId,
        @Valid @RequestBody CommentRequest request
    ) {
        try {
            ProjectAccessService.AccessContext access = getAccess(projectId);
            String email = authContext.getCurrentUserEmail();

            Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

            boolean isAuthor = comment.getAuthor().getEmail().equals(email);
            boolean canModerate = access.getRole() == ProjectRole.OWNER || access.getRole() == ProjectRole.ADMIN;
            if (!isAuthor && !canModerate) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Can only edit your own comments"));
            }

            comment.setContent(request.content());
            commentRepository.save(comment);

            return ResponseEntity.ok(new CommentResponse(
                comment.getId(),
                comment.getContent(),
                comment.getAuthor().getEmail(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<?> deleteComment(
        @PathVariable Long projectId,
        @PathVariable Long taskId,
        @PathVariable Long commentId
    ) {
        try {
            ProjectAccessService.AccessContext access = getAccess(projectId);
            String email = authContext.getCurrentUserEmail();

            Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

            boolean isAuthor = comment.getAuthor().getEmail().equals(email);
            boolean canModerate = access.getRole() == ProjectRole.OWNER || access.getRole() == ProjectRole.ADMIN;
            if (!isAuthor && !canModerate) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Can only delete your own comments"));
            }

            commentRepository.deleteById(commentId);

            ActivityLog log = new ActivityLog(
                comment.getTask().getProject(),
                comment.getAuthor(),
                "COMMENT_DELETED",
                "COMMENT",
                comment.getId(),
                "Deleted comment on task \"" + comment.getTask().getTitle() + "\""
            );
            activityLogRepository.save(log);
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", ex.getMessage()));
        }
    }
}
