"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import styles from "./notifications.module.css";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
};

export default function NotificationsPanel({ isOpen, onClose, onRefresh }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    void loadNotifications();
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<Notification[]>("/notifications", { method: "GET" });
      setNotifications(data || []);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: number) => {
    await apiRequest(`/notifications/${id}/read`, { method: "PUT" });
    await loadNotifications();
    await onRefresh();
  };

  const markAllRead = async () => {
    await apiRequest("/notifications/read-all", { method: "PUT" });
    await loadNotifications();
    await onRefresh();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.panelOverlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.panelTitle}>Notifications</div>
            <div className={styles.panelSubtitle}>Recent updates across your projects</div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.panelActions}>
          <button className={styles.ghostButton} onClick={markAllRead}>
            Mark all read
          </button>
        </div>

        <div className={styles.panelBody}>
          {loading ? (
            <div className={styles.empty}>Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>No notifications yet.</div>
          ) : (
            notifications.map((item) => (
              <div key={item.id} className={`${styles.item} ${item.isRead ? styles.read : ""}`}>
                <div>
                  <div className={styles.itemTitle}>{item.title}</div>
                  <div className={styles.itemMessage}>{item.message}</div>
                  <div className={styles.itemMeta}>{new Date(item.createdAt).toLocaleString()}</div>
                </div>
                {!item.isRead && (
                  <button className={styles.markReadButton} onClick={() => markRead(item.id)}>
                    Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
