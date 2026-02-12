"use client";

import { useState } from "react";
import styles from "./share-modal.module.css";

type ShareProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onShare: (email: string, role: string) => Promise<void>;
};

export default function ShareProjectModal({ isOpen, onClose, onShare }: ShareProjectModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setSharing(true);
    setError(null);
    try {
      await onShare(email.trim(), role);
      setEmail("");
      setRole("MEMBER");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share project");
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Share project</h2>
          <button className={styles.closeButton} onClick={onClose} disabled={sharing}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label className={styles.label} htmlFor="memberEmail">
            Invite by email
          </label>
          <input
            id="memberEmail"
            type="email"
            className={styles.input}
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sharing}
          />

          <label className={styles.label} htmlFor="memberRole">
            Role
          </label>
          <select
            id="memberRole"
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={sharing}
          >
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={onClose}
              disabled={sharing}
            >
              Cancel
            </button>
            <button type="submit" className={styles.button} disabled={sharing}>
              {sharing ? "Sharing..." : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
