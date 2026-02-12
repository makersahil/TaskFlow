"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import styles from "./dashboard.module.css";
import CreateProjectModal from "./CreateProjectModal";
import NotificationsPanel from "./NotificationsPanel";

type Project = {
  id: number;
  name: string;
  ownerEmail: string;
  role: string;
};

type DashboardStats = {
  totalProjects: number;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
};


export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("taskflow_token");
    if (!token) {
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9090/api";
    const source = new EventSource(`${baseUrl}/notifications/stream?token=${token}`);

    source.addEventListener("notification", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as { unreadCount?: number };
        if (typeof data.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        // Ignore malformed events.
      }
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("taskflow_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    loadProjects();
    refreshUnread();
    loadStats();
  }, [router]);

  const refreshUnread = async () => {
    try {
      const count = await apiRequest<number>("/notifications/unread/count", { method: "GET" });
      setUnreadCount(count ?? 0);
    } catch (err) {
      setUnreadCount(0);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Project[]>("/projects");
      setProjects(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiRequest<DashboardStats>("/dashboard/stats", { method: "GET" });
      setStats(data ?? null);
    } catch (err) {
      setStats(null);
    }
  };


  const handleCreateProject = async (projectName: string) => {
    try {
      const newProject = await apiRequest<Project>("/projects", {
        method: "POST",
        body: { name: projectName },
      });
      setProjects([...projects, newProject]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      throw err;
    }
  };

  const handleDeleteProject = async (id: number) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    if (!window.confirm(`Delete "${project.name}"? This action cannot be undone. All tasks, comments, and files will be permanently deleted.`)) {
      return;
    }

    try {
      await apiRequest(`/projects/${id}`, { method: "DELETE" });
      setProjects(projects.filter((p) => p.id !== id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const canDeleteProject = (role: string): boolean => {
    return ["OWNER", "ADMIN", "MANAGER"].includes(role?.toUpperCase() || "");
  };

  const handleLogout = () => {
    window.localStorage.removeItem("taskflow_token");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.glow} />
        <div style={{ textAlign: "center", padding: "48px", color: "var(--muted)" }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.glow} />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.wordmark}>TaskFlow</div>
          <p className={styles.subtitle}>Projects</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.badge}>{projects.length} projects</div>
          <button
            className={`${styles.button} ${styles.buttonGhost} ${styles.notificationButton}`}
            onClick={() => setIsNotificationsOpen(true)}
          >
            Notifications
            {unreadCount > 0 && <span className={styles.notificationCount}>{unreadCount}</span>}
          </button>
          <Link href="/profile" className={`${styles.button} ${styles.buttonGhost}`}>
            Profile
          </Link>
          <button className={`${styles.button} ${styles.buttonGhost}`} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>Your projects</h1>
            <button
              className={styles.button}
              onClick={() => setIsModalOpen(true)}
            >
              + Create project
            </button>
          </div>

          {stats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total projects</div>
                <div className={styles.statValue}>{stats.totalProjects}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Total tasks</div>
                <div className={styles.statValue}>{stats.totalTasks}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Completed</div>
                <div className={styles.statValue}>{stats.doneTasks}</div>
              </div>
              <div className={styles.statCardWarning}>
                <div className={styles.statLabel}>Overdue</div>
                <div className={styles.statValue}>{stats.overdueTasks}</div>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: "24px",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "rgba(200, 91, 58, 0.1)",
                color: "#7a2f1b",
                fontSize: "13px",
                border: "1px solid rgba(200, 91, 58, 0.2)",
              }}
            >
              {error}
            </div>
          )}

          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>→</div>
              <p className={styles.emptyStateText}>No projects yet. Create one to get started.</p>
            </div>
          ) : (
            <div className={styles.projectsList}>
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className={styles.projectCardLink}>
                  <div className={styles.projectCard}>
                    <div>
                      <div className={styles.projectName}>{project.name}</div>
                      <div className={styles.projectMeta}>{project.ownerEmail}</div>
                    </div>
                    <div className={styles.projectRight}>
                      {canDeleteProject(project.role) && (
                        <button
                          className={`${styles.projectButton} ${styles.projectButtonDelete}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteProject(project.id);
                          }}
                          title={`Delete "${project.name}"`}
                        >
                          🗑 Delete
                        </button>
                      )}
                      {!canDeleteProject(project.role) && (
                        <span className={styles.projectButtonDisabled}>
                          Read-only
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <span>TaskFlow · Secure, isolated workspaces</span>
        <span>Next.js + Spring Boot</span>
      </footer>

      <CreateProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProject}
      />

      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onRefresh={refreshUnread}
      />
    </div>
  );
}
