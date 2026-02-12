package com.taskflow.controller;

import com.taskflow.dto.UserProfileResponse;
import com.taskflow.entity.User;
import com.taskflow.repository.ProjectUserRepository;
import com.taskflow.repository.TaskAssignmentRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.AuthContext;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserRepository userRepository;
    private final ProjectUserRepository projectUserRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final AuthContext authContext;

    public UserController(
        UserRepository userRepository,
        ProjectUserRepository projectUserRepository,
        TaskAssignmentRepository taskAssignmentRepository,
        AuthContext authContext
    ) {
        this.userRepository = userRepository;
        this.projectUserRepository = projectUserRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.authContext = authContext;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile() {
        String email = authContext.getCurrentUserEmail();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Integer projectCount = projectUserRepository.findByUserId(user.getId()).size();
        Integer taskCount = taskAssignmentRepository.findByAssignedToId(user.getId()).size();

        return ResponseEntity.ok(new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            projectCount,
            taskCount
        ));
    }

    @GetMapping("/profile/{email}")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Integer projectCount = projectUserRepository.findByUserId(user.getId()).size();
        Integer taskCount = taskAssignmentRepository.findByAssignedToId(user.getId()).size();

        return ResponseEntity.ok(new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            projectCount,
            taskCount
        ));
    }
}
