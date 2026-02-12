package com.taskflow.security;

import com.taskflow.entity.Project;
import com.taskflow.entity.User;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.ProjectUserRepository;
import com.taskflow.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class ProjectAccessService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectUserRepository projectUserRepository;

    public ProjectAccessService(
        ProjectRepository projectRepository,
        UserRepository userRepository,
        ProjectUserRepository projectUserRepository
    ) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectUserRepository = projectUserRepository;
    }

    public AccessContext requireAccess(Long projectId, String email) {
        if (email == null) {
            throw new RuntimeException("Not authenticated");
        }

        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new RuntimeException("Project not found"));

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        ProjectRole role = resolveRole(project, user);
        if (role == null) {
            throw new RuntimeException("Forbidden: not project member");
        }

        return new AccessContext(project, user, role);
    }

    public ProjectRole resolveRole(Project project, User user) {
        if (project.getOwner().getId().equals(user.getId())) {
            return ProjectRole.OWNER;
        }

        return projectUserRepository.findByProjectIdAndUserId(project.getId(), user.getId())
            .map(pu -> ProjectRole.from(pu.getRole()))
            .orElse(null);
    }

    public static class AccessContext {
        private final Project project;
        private final User user;
        private final ProjectRole role;

        public AccessContext(Project project, User user, ProjectRole role) {
            this.project = project;
            this.user = user;
            this.role = role;
        }

        public Project getProject() {
            return project;
        }

        public User getUser() {
            return user;
        }

        public ProjectRole getRole() {
            return role;
        }
    }
}
