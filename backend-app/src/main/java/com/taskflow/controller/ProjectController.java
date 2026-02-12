package com.taskflow.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
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

import com.taskflow.dto.ProjectRequest;
import com.taskflow.dto.ProjectResponse;
import com.taskflow.dto.ProjectMemberResponse;
import com.taskflow.dto.ShareProjectRequest;
import com.taskflow.dto.UpdateProjectRoleRequest;
import com.taskflow.entity.ActivityLog;
import com.taskflow.entity.Project;
import com.taskflow.entity.ProjectUser;
import com.taskflow.entity.User;
import com.taskflow.repository.ActivityLogRepository;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.ProjectUserRepository;
import com.taskflow.repository.TaskAssignmentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.AuthContext;
import com.taskflow.security.ProjectAccessService;
import com.taskflow.security.ProjectRole;
import com.taskflow.service.NotificationService;

import jakarta.transaction.Transactional;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/projects")
@Validated
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectUserRepository projectUserRepository;
    private final TaskRepository taskRepository;
    private final CommentRepository commentRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final NotificationService notificationService;
    private final ActivityLogRepository activityLogRepository;
    private final AuthContext authContext;
    private final ProjectAccessService projectAccessService;

    private ResponseEntity<?> accessError(RuntimeException ex) {
        HttpStatus status = "Not authenticated".equals(ex.getMessage())
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.FORBIDDEN;
        return ResponseEntity.status(status).body(Map.of("error", ex.getMessage()));
    }

    public ProjectController(
        ProjectRepository projectRepository,
        UserRepository userRepository,
        ProjectUserRepository projectUserRepository,
        TaskRepository taskRepository,
        CommentRepository commentRepository,
        TaskAssignmentRepository taskAssignmentRepository,
        NotificationService notificationService,
        ActivityLogRepository activityLogRepository,
        AuthContext authContext,
        ProjectAccessService projectAccessService
    ) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectUserRepository = projectUserRepository;
        this.taskRepository = taskRepository;
        this.commentRepository = commentRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.notificationService = notificationService;
        this.activityLogRepository = activityLogRepository;
        this.authContext = authContext;
        this.projectAccessService = projectAccessService;
    }

    @GetMapping
    public ResponseEntity<?> listProjects() {
        String email = authContext.getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Not authenticated"));
        }

        User owner = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Map<Long, Project> allProjects = new LinkedHashMap<>();
        projectRepository.findByOwner(owner)
            .forEach(project -> allProjects.put(project.getId(), project));

        projectUserRepository.findByUserId(owner.getId())
            .forEach(member -> allProjects.putIfAbsent(member.getProject().getId(), member.getProject()));

        List<ProjectResponse> projects = allProjects.values().stream()
            .map(p -> {
                ProjectRole role = projectAccessService.resolveRole(p, owner);
                String roleName = role != null ? role.name() : ProjectRole.VIEWER.name();
                return new ProjectResponse(p.getId(), p.getName(), p.getOwner().getEmail(), roleName);
            })
            .toList();

        return ResponseEntity.ok(projects);
    }

    @PostMapping
    public ResponseEntity<?> createProject(@Valid @RequestBody ProjectRequest request) {
        String email = authContext.getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Not authenticated"));
        }

        User owner = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Project project = new Project(request.name(), owner);
        projectRepository.save(project);

        ProjectUser projectUser = new ProjectUser(project, owner, "OWNER");
        projectUserRepository.save(projectUser);

        ActivityLog log = new ActivityLog(
            project,
            owner,
            "PROJECT_CREATED",
            "PROJECT",
            project.getId(),
            "Created project \"" + project.getName() + "\""
        );
        activityLogRepository.save(log);

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(new ProjectResponse(project.getId(), project.getName(), project.getOwner().getEmail(), ProjectRole.OWNER.name()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(@PathVariable Long id) {
        try {
            ProjectAccessService.AccessContext access = projectAccessService.requireAccess(id, authContext.getCurrentUserEmail());
            Project project = access.getProject();
            ProjectResponse response = new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getOwner().getEmail(),
                access.getRole().name()
            );
            return ResponseEntity.ok(response);
        } catch (RuntimeException ex) {
            return accessError(ex);
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteProject(@PathVariable Long id) {
        ProjectAccessService.AccessContext access;
        try {
            access = projectAccessService.requireAccess(id, authContext.getCurrentUserEmail());
        } catch (RuntimeException ex) {
            return accessError(ex);
        }

        if (!access.getRole().canDeleteProject()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Insufficient role to delete project"));
        }

        Project project = access.getProject();

        taskRepository.findByProject(project).forEach(task -> {
            taskAssignmentRepository.deleteByTaskId(task.getId());
            commentRepository.deleteByTaskId(task.getId());
        });
        activityLogRepository.deleteByProjectId(id);
        projectUserRepository.deleteByProjectId(id);
        taskRepository.deleteByProjectId(id);
        projectRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<ProjectMemberResponse>> getProjectMembers(@PathVariable Long id) {
        Project project;
        try {
            project = projectAccessService.requireAccess(id, authContext.getCurrentUserEmail()).getProject();
        } catch (RuntimeException ex) {
            return ResponseEntity.status("Not authenticated".equals(ex.getMessage())
                ? HttpStatus.UNAUTHORIZED
                : HttpStatus.FORBIDDEN).build();
        }

        List<ProjectMemberResponse> members = projectUserRepository.findByProjectId(id)
            .stream()
            .map(pu -> new ProjectMemberResponse(
                pu.getUser().getId(),
                pu.getUser().getEmail(),
                pu.getRole(),
                pu.getJoinedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            ))
            .toList();

        boolean hasOwner = members.stream().anyMatch(member -> member.email().equals(project.getOwner().getEmail()));
        if (!hasOwner) {
            members = new java.util.ArrayList<>(members);
            members.add(new ProjectMemberResponse(
                project.getOwner().getId(),
                project.getOwner().getEmail(),
                "OWNER",
                LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            ));
        }

        return ResponseEntity.ok(members);
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<?> shareProject(@PathVariable Long id, @Valid @RequestBody ShareProjectRequest request) {
        ProjectAccessService.AccessContext access;
        try {
            access = projectAccessService.requireAccess(id, authContext.getCurrentUserEmail());
        } catch (RuntimeException ex) {
            return accessError(ex);
        }

        if (!access.getRole().canManageMembers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Insufficient role to share project"));
        }

        Project project = access.getProject();

        User member = userRepository.findByEmail(request.memberEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (projectUserRepository.findByProjectIdAndUserId(id, member.getId()).isPresent()) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "User already has access to this project"));
        }

        ProjectRole requestedRole = request.role() == null
            ? ProjectRole.MEMBER
            : ProjectRole.from(request.role());
        if (requestedRole == ProjectRole.OWNER) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Cannot assign OWNER role"));
        }

        ProjectUser projectUser = new ProjectUser(project, member, requestedRole.name());
        projectUserRepository.save(projectUser);

        ActivityLog log = new ActivityLog(
            project,
            access.getUser(),
            "PROJECT_SHARED",
            "PROJECT",
            project.getId(),
            "Shared project with " + member.getEmail() + " as " + requestedRole.name()
        );
        activityLogRepository.save(log);

        // Create notification for new member
        notificationService.notify(
            member,
            "PROJECT_SHARED",
            "Project shared with you",
            project.getOwner().getEmail() + " shared \"" + project.getName() + "\" with you",
            "PROJECT",
            project.getId()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(Map.of("message", "Project shared successfully"));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<?> removeProjectMember(@PathVariable Long id, @PathVariable Long userId) {
        ProjectAccessService.AccessContext access;
        try {
            access = projectAccessService.requireAccess(id, authContext.getCurrentUserEmail());
        } catch (RuntimeException ex) {
            return accessError(ex);
        }

        if (!access.getRole().canManageMembers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Insufficient role to remove members"));
        }

        Project project = access.getProject();

        if (project.getOwner().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Cannot remove project owner"));
        }

        projectUserRepository.deleteByProjectIdAndUserId(id, userId);

        ActivityLog log = new ActivityLog(
            project,
            access.getUser(),
            "PROJECT_MEMBER_REMOVED",
            "PROJECT",
            project.getId(),
            "Removed member from project"
        );
        activityLogRepository.save(log);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/members/{userId}/role")
    public ResponseEntity<?> updateProjectMemberRole(
        @PathVariable Long id,
        @PathVariable Long userId,
        @Valid @RequestBody UpdateProjectRoleRequest request
    ) {
        ProjectAccessService.AccessContext access;
        try {
            access = projectAccessService.requireAccess(id, authContext.getCurrentUserEmail());
        } catch (RuntimeException ex) {
            return accessError(ex);
        }

        if (!access.getRole().canManageMembers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Insufficient role to change roles"));
        }

        Project project = access.getProject();
        if (project.getOwner().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Cannot change owner role"));
        }

        ProjectUser member = projectUserRepository.findByProjectIdAndUserId(id, userId)
            .orElseThrow(() -> new RuntimeException("Member not found"));

        ProjectRole requestedRole = ProjectRole.from(request.role());
        if (requestedRole == ProjectRole.OWNER) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Cannot assign OWNER role"));
        }

        member.setRole(requestedRole.name());
        projectUserRepository.save(member);

        ActivityLog log = new ActivityLog(
            project,
            access.getUser(),
            "PROJECT_ROLE_UPDATED",
            "PROJECT",
            project.getId(),
            "Updated member role to " + requestedRole.name()
        );
        activityLogRepository.save(log);

        return ResponseEntity.ok(Map.of("message", "Role updated"));
    }
}
