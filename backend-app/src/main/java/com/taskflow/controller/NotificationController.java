package com.taskflow.controller;

import com.taskflow.dto.NotificationResponse;
import com.taskflow.entity.Notification;
import com.taskflow.entity.User;
import com.taskflow.repository.NotificationRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.AuthContext;
import com.taskflow.service.NotificationStreamService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@Validated
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final AuthContext authContext;
    private final NotificationStreamService notificationStreamService;

    public NotificationController(
        NotificationRepository notificationRepository,
        UserRepository userRepository,
        AuthContext authContext,
        NotificationStreamService notificationStreamService
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.authContext = authContext;
        this.notificationStreamService = notificationStreamService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications() {
        String email = authContext.getCurrentUserEmail();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<NotificationResponse> responses = notifications.stream()
            .map(n -> new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.isRead(),
                n.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
            ))
            .toList();

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Integer> getUnreadCount() {
        String email = authContext.getCurrentUserEmail();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        int count = notificationRepository.countByUserIdAndIsReadFalse(user.getId());
        return ResponseEntity.ok(count);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        String email = authContext.getCurrentUserEmail();
        if (email == null) {
            return ResponseEntity.status(401).build();
        }

        Notification notification = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUser().getEmail().equals(email)) {
            return ResponseEntity.status(403).build();
        }

        notification.setRead(true);
        notificationRepository.save(notification);
        int unreadCount = notificationRepository.countByUserIdAndIsReadFalse(notification.getUser().getId());
        notificationStreamService.sendUnreadCount(notification.getUser().getId(), unreadCount);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        String email = authContext.getCurrentUserEmail();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(user.getId());
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);

        int unreadCount = notificationRepository.countByUserIdAndIsReadFalse(user.getId());
        notificationStreamService.sendUnreadCount(user.getId(), unreadCount);

        return ResponseEntity.noContent().build();
    }
}
