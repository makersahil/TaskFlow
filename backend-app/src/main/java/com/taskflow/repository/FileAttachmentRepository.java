package com.taskflow.repository;

import com.taskflow.entity.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {
    List<FileAttachment> findByTaskId(Long taskId);
    List<FileAttachment> findByCommentId(Long commentId);
    Optional<FileAttachment> findByIdAndTaskId(Long id, Long taskId);
    Optional<FileAttachment> findByIdAndCommentId(Long id, Long commentId);
}
