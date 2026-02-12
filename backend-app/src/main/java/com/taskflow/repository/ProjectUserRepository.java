package com.taskflow.repository;

import com.taskflow.entity.ProjectUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectUserRepository extends JpaRepository<ProjectUser, Long> {
    List<ProjectUser> findByProjectId(Long projectId);
    List<ProjectUser> findByUserId(Long userId);
    Optional<ProjectUser> findByProjectIdAndUserId(Long projectId, Long userId);
    void deleteByProjectIdAndUserId(Long projectId, Long userId);
    void deleteByProjectId(Long projectId);
}
