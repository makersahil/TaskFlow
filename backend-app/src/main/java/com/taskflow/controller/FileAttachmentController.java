package com.taskflow.controller;

import com.taskflow.dto.FileAttachmentResponse;
import com.taskflow.entity.Comment;
import com.taskflow.entity.FileAttachment;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.FileAttachmentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.AuthContext;
import com.taskflow.security.ProjectAccessService;
import com.taskflow.service.FileUploadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks/{taskId}/attachments")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class FileAttachmentController {

    @Autowired
    private FileAttachmentRepository fileAttachmentRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileUploadService fileUploadService;

    @Autowired
    private ProjectAccessService projectAccessService;

    @Autowired
    private AuthContext authContext;

    // Upload file to task
    @PostMapping
    public ResponseEntity<?> uploadTaskAttachment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @RequestParam("file") MultipartFile file) {
        try {
            // Get current user email
            String email = authContext.getCurrentUserEmail();
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
            }

            // Check project access
            projectAccessService.requireAccess(projectId, email);

            // Get task
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new RuntimeException("Task not found"));

            // Verify task belongs to project
            if (!task.getProject().getId().equals(projectId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Task does not belong to this project");
            }

            // Get current user
            User currentUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Save file
            String fileName = fileUploadService.saveFile(file);

            // Create file attachment record
            FileAttachment attachment = new FileAttachment(
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    fileName,
                    currentUser
            );
            attachment.setTask(task);
            attachment = fileAttachmentRepository.save(attachment);

            return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(attachment));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("File upload failed: " + e.getMessage());
        }
    }

    // Get task attachments
    @GetMapping
    public ResponseEntity<?> getTaskAttachments(
            @PathVariable Long projectId,
            @PathVariable Long taskId) {
        try {
            // Get current user email
            String email = authContext.getCurrentUserEmail();
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
            }

            // Check project access
            projectAccessService.requireAccess(projectId, email);

            // Verify task exists and belongs to project
            Task task = taskRepository.findById(taskId)
                    .orElseThrow(() -> new RuntimeException("Task not found"));

            if (!task.getProject().getId().equals(projectId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Task does not belong to this project");
            }

            // Get attachments
            List<FileAttachmentResponse> attachments = fileAttachmentRepository.findByTaskId(taskId)
                    .stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(attachments);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    // Delete task attachment
    @DeleteMapping("/{fileId}")
    public ResponseEntity<?> deleteTaskAttachment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @PathVariable Long fileId) {
        try {
            // Get current user email
            String email = authContext.getCurrentUserEmail();
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
            }

            // Check project access
            projectAccessService.requireAccess(projectId, email);

            // Get user role
            var access = projectAccessService.requireAccess(projectId, email);
            User currentUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get file attachment
            FileAttachment file = fileAttachmentRepository.findByIdAndTaskId(fileId, taskId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            // Check permissions: author or admin
            boolean isAuthor = file.getUploadedBy().getId().equals(currentUser.getId());
            boolean isAdmin = access.getRole().canDeleteProject();

            if (!isAuthor && !isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Cannot delete this file");
            }

            // Delete file from storage
            fileUploadService.deleteFile(file.getStoragePath());

            // Delete from database
            fileAttachmentRepository.delete(file);

            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("File deletion failed: " + e.getMessage());
        }
    }

    // Upload file to comment
    @PostMapping("/../comments/{commentId}/attachments")
    public ResponseEntity<?> uploadCommentAttachment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @PathVariable Long commentId,
            @RequestParam("file") MultipartFile file) {
        try {
            // Get current user email
            String email = authContext.getCurrentUserEmail();
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
            }

            // Check project access
            projectAccessService.requireAccess(projectId, email);

            // Get comment
            Comment comment = commentRepository.findById(commentId)
                    .orElseThrow(() -> new RuntimeException("Comment not found"));

            // Verify comment belongs to task in project
            if (!comment.getTask().getId().equals(taskId) || !comment.getTask().getProject().getId().equals(projectId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Comment does not belong to this task");
            }

            // Get current user
            User currentUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Save file
            String fileName = fileUploadService.saveFile(file);

            // Create file attachment record
            FileAttachment attachment = new FileAttachment(
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    fileName,
                    currentUser
            );
            attachment.setComment(comment);
            attachment = fileAttachmentRepository.save(attachment);

            return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(attachment));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("File upload failed: " + e.getMessage());
        }
    }

    // Get comment attachments
    @GetMapping("/../comments/{commentId}/attachments")
    public ResponseEntity<?> getCommentAttachments(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @PathVariable Long commentId) {
        try {
            // Get current user email
            String email = authContext.getCurrentUserEmail();
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
            }

            // Check project access
            projectAccessService.requireAccess(projectId, email);

            // Verify comment exists
            Comment comment = commentRepository.findById(commentId)
                    .orElseThrow(() -> new RuntimeException("Comment not found"));

            if (!comment.getTask().getId().equals(taskId) || !comment.getTask().getProject().getId().equals(projectId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Comment does not belong to this task");
            }

            // Get attachments
            List<FileAttachmentResponse> attachments = fileAttachmentRepository.findByCommentId(commentId)
                    .stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(attachments);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    // Delete comment attachment
    @DeleteMapping("/../comments/{commentId}/attachments/{fileId}")
    public ResponseEntity<?> deleteCommentAttachment(
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @PathVariable Long commentId,
            @PathVariable Long fileId) {
        try {
            // Get current user email
            String email = authContext.getCurrentUserEmail();
            if (email == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
            }

            // Check project access
            projectAccessService.requireAccess(projectId, email);

            // Get user role
            var access = projectAccessService.requireAccess(projectId, email);
            User currentUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get file attachment
            FileAttachment file = fileAttachmentRepository.findByIdAndCommentId(fileId, commentId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            // Check permissions: author or admin
            boolean isAuthor = file.getUploadedBy().getId().equals(currentUser.getId());
            boolean isAdmin = access.getRole().canDeleteProject();

            if (!isAuthor && !isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Cannot delete this file");
            }

            // Delete file from storage
            fileUploadService.deleteFile(file.getStoragePath());

            // Delete from database
            fileAttachmentRepository.delete(file);

            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("File deletion failed: " + e.getMessage());
        }
    }

    // Helper method to convert FileAttachment to DTO
    private FileAttachmentResponse toResponse(FileAttachment attachment) {
        return new FileAttachmentResponse(
                attachment.getId(),
                attachment.getFileName(),
                attachment.getFileType(),
                attachment.getFileSize(),
                attachment.getUploadedAt(),
                attachment.getUploadedBy().getEmail(),
                attachment.getUploadedBy().getEmail()
        );
    }
}
