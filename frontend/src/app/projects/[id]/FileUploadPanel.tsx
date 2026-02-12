'use client';

import { useState, useRef } from 'react';
import { apiRequest } from '@/lib/api';
import styles from './file-upload.module.css';

interface FileAttachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedByName: string;
  uploadedByEmail: string;
}

interface FileUploadPanelProps {
  projectId: string;
  taskId: number;
  commentId?: number;
  onUploadSuccess?: () => void;
  canManage: boolean;
}

export default function FileUploadPanel({
  projectId,
  taskId,
  commentId,
  onUploadSuccess,
  canManage,
}: FileUploadPanelProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiPath = commentId
    ? `/projects/${projectId}/tasks/${taskId}/comments/${commentId}/attachments`
    : `/projects/${projectId}/tasks/${taskId}/attachments`;

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(apiPath, { method: 'GET' });
      setAttachments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must not exceed 10MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token') || '';
      const response = await fetch(`http://localhost:9090${apiPath}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const newAttachment = await response.json();
      setAttachments([...attachments, newAttachment]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      await apiRequest(`${apiPath}/${attachmentId}`, { method: 'DELETE' });
      setAttachments(attachments.filter((a) => a.id !== attachmentId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attachment');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('document') || fileType.includes('word')) return '📝';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    return '📎';
  };

  return (
    <div className={styles.filePanel}>
      <div className={styles.filePanelHeader}>
        <h4>Attachments</h4>
        {canManage && (
          <button
            className={styles.uploadTrigger}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '+ Add file'}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
      />

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loadingText}>Loading attachments...</div>
      ) : attachments.length === 0 ? (
        <div className={styles.emptyText}>No attachments yet</div>
      ) : (
        <div className={styles.attachmentsList}>
          {attachments.map((attachment) => (
            <div key={attachment.id} className={styles.attachmentItem}>
              <div className={styles.attachmentIcon}>
                {getFileIcon(attachment.fileType)}
              </div>
              <div className={styles.attachmentInfo}>
                <div className={styles.attachmentName}>{attachment.fileName}</div>
                <div className={styles.attachmentMeta}>
                  {formatFileSize(attachment.fileSize)} • {attachment.uploadedByEmail}
                </div>
              </div>
              {canManage && (
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteAttachment(attachment.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
