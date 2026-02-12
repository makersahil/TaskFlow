package com.taskflow.dto;

import java.time.LocalDateTime;

public class FileAttachmentResponse {
    private Long id;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private LocalDateTime uploadedAt;
    private String uploadedByName;
    private String uploadedByEmail;

    public FileAttachmentResponse(Long id, String fileName, String fileType, Long fileSize,
                                  LocalDateTime uploadedAt, String uploadedByName, String uploadedByEmail) {
        this.id = id;
        this.fileName = fileName;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.uploadedAt = uploadedAt;
        this.uploadedByName = uploadedByName;
        this.uploadedByEmail = uploadedByEmail;
    }

    // Getters
    public Long getId() {
        return id;
    }

    public String getFileName() {
        return fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }

    public String getUploadedByName() {
        return uploadedByName;
    }

    public String getUploadedByEmail() {
        return uploadedByEmail;
    }
}
