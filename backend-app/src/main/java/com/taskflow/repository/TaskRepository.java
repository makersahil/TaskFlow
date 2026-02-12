package com.taskflow.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.taskflow.entity.Project;
import com.taskflow.entity.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {
    Page<Task> findByProject(Project project, Pageable pageable);
    List<Task> findByProject(Project project);
    List<Task> findByProjectIn(List<Project> projects);
    void deleteByProjectId(Long projectId);
}
