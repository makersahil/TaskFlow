"use client";

import { useState } from "react";
import styles from "./modal.module.css";

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
};

export default function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError("Project name cannot be empty");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await onCreate(projectName);
      setProjectName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create new project</h2>
          <button className={styles.closeButton} onClick={onClose} disabled={creating}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="projectName" className={styles.label}>
              Project name
            </label>
            <input
              id="projectName"
              type="text"
              className={styles.input}
              placeholder="e.g., Website Redesign"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={creating}
              autoFocus
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>
            <button type="submit" className={styles.button} disabled={creating}>
              {creating ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
