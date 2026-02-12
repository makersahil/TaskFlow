package com.taskflow.service;

import org.springframework.stereotype.Service;

import com.taskflow.entity.Notification;
import com.taskflow.entity.User;
import com.taskflow.repository.NotificationRepository;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationStreamService notificationStreamService;

    public NotificationService(
        NotificationRepository notificationRepository,
        NotificationStreamService notificationStreamService
    ) {
        this.notificationRepository = notificationRepository;
        this.notificationStreamService = notificationStreamService;
    }

    public void notify(User user, String type, String title, String message, String entityType, Long entityId) {
        Notification notification = new Notification(
            user,
            type,
            title,
            message,
            entityType,
            entityId
        );
        notificationRepository.save(notification);

        int unreadCount = notificationRepository.countByUserIdAndIsReadFalse(user.getId());
        notificationStreamService.sendUnreadCount(user.getId(), unreadCount);
    }
}
