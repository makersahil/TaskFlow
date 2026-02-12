"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import styles from "./profile.module.css";

type Profile = {
  id: number;
  email: string;
  projectCount: number;
  taskCount: number;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem("taskflow_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await apiRequest<Profile>("/users/profile", { method: "GET" });
        setProfile(data);
      } catch (err) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <div className={styles.title}>Profile</div>
          <div className={styles.subtitle}>Your account overview</div>
        </div>
        <Link href="/dashboard" className={styles.backButton}>
          Back to dashboard
        </Link>
      </header>

      {loading ? (
        <div className={styles.card}>Loading profile...</div>
      ) : profile ? (
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Email</div>
            <div className={styles.cardValue}>{profile.email}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Projects</div>
            <div className={styles.cardValue}>{profile.projectCount}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Assigned tasks</div>
            <div className={styles.cardValue}>{profile.taskCount}</div>
          </div>
          <div className={styles.cardWide}>
            <div className={styles.cardLabel}>Preferences</div>
            <div className={styles.preferenceRow}>
              <span>Notifications</span>
              <span className={styles.preferenceValue}>Enabled</span>
            </div>
            <div className={styles.preferenceRow}>
              <span>Digest</span>
              <span className={styles.preferenceValue}>Daily</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.card}>Unable to load profile.</div>
      )}
    </div>
  );
}
