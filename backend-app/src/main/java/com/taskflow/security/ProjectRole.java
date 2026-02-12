package com.taskflow.security;

import java.util.Locale;

public enum ProjectRole {
    OWNER,
    ADMIN,
    MANAGER,
    MEMBER,
    VIEWER;

    public static ProjectRole from(String role) {
        if (role == null || role.isBlank()) {
            return VIEWER;
        }
        try {
            return ProjectRole.valueOf(role.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return VIEWER;
        }
    }

    public boolean canManageMembers() {
        return this == OWNER || this == ADMIN || this == MANAGER;
    }

    public boolean canEditTasks() {
        return this == OWNER || this == ADMIN || this == MANAGER || this == MEMBER;
    }

    public boolean canAssignTasks() {
        return canEditTasks();
    }

    public boolean canComment() {
        return canEditTasks();
    }

    public boolean canDeleteProject() {
        return this == OWNER || this == ADMIN || this == MANAGER;
    }
}
