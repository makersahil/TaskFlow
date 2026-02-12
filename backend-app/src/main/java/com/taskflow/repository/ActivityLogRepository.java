package com.taskflow.repository;

import com.taskflow.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByProjectId(Long projectId);
    List<ActivityLog> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<ActivityLog> findByUserId(Long userId);
    void deleteByProjectId(Long projectId);
}
