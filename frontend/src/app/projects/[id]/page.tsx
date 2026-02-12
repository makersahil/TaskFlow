'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import styles from './projects.module.css';
import ShareProjectModal from './ShareProjectModal';
import FileUploadPanel from './FileUploadPanel';
import CalendarPanel from './CalendarPanel';
import KanbanPanel from './KanbanPanel';
import ReportsPanel from './ReportsPanel';

interface Comment {
  id: number;
  content: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string | null;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
}

interface Project {
  id: number;
  name: string;
  ownerEmail: string;
}

interface ProjectMember {
  id: number;
  email: string;
  role: string;
  joinedAt: string;
}

interface ActivityLog {
  id: number;
  action: string;
  description: string;
  userEmail: string;
  createdAt: string;
}

interface TaskAssignee {
  id: number;
  email: string;
}

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("VIEWER");

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'kanban' | 'reports'>('list');
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO' as 'TODO' | 'IN_PROGRESS' | 'DONE',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    dueDate: '',
  });

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [projectId, searchTerm, filterStatus, filterPriority]);

  useEffect(() => {
    fetchMembers();
    fetchActivity();
    fetchProfile();
  }, [projectId]);

  useEffect(() => {
    if (!currentUserEmail) {
      return;
    }
    const member = members.find((m) => m.email === currentUserEmail);
    if (member?.role) {
      setCurrentUserRole(member.role);
    }
  }, [members, currentUserEmail]);

  const fetchProject = async () => {
    try {
      const projectData = await apiRequest<Project>(`/projects/${projectId}`, { method: 'GET' });
      if (projectData) {
        setProject(projectData);
      }
    } catch (err) {
      console.error('Failed to fetch project:', err);
      setProject({ id: parseInt(projectId), name: 'Project', ownerEmail: '' });
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);

      const url = `/projects/${projectId}/tasks${params.toString() ? '?' + params.toString() : ''}`;
      const tasks = await apiRequest<Task[]>(url, { method: 'GET' });
      setTasks(tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (taskId: number) => {
    try {
      setLoadingComments(true);
      const comments = await apiRequest<Comment[]>(
        `/projects/${projectId}/tasks/${taskId}/comments`,
        { method: 'GET' }
      );
      setComments(comments || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchAssignees = async (taskId: number) => {
    try {
      const data = await apiRequest<TaskAssignee[]>(
        `/projects/${projectId}/tasks/${taskId}/assignees`,
        { method: 'GET' }
      );
      setAssignees(data || []);
    } catch (err) {
      setAssignees([]);
    }
  };

  const fetchMembers = async () => {
    try {
      setMemberError(null);
      const data = await apiRequest<ProjectMember[]>(`/projects/${projectId}/members`, { method: 'GET' });
      setMembers(data || []);
    } catch (err) {
      setMembers([]);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await apiRequest<{ email: string }>("/users/profile", { method: "GET" });
      setCurrentUserEmail(data?.email ?? null);
    } catch (err) {
      setCurrentUserEmail(null);
    }
  };

  const fetchActivity = async () => {
    try {
      setLoadingActivity(true);
      const data = await apiRequest<ActivityLog[]>(`/projects/${projectId}/activity`, { method: 'GET' });
      setActivity(data || []);
    } catch (err) {
      setActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSelectTask = async (task: Task) => {
    setSelectedTask(task);
    await fetchComments(task.id);
    await fetchAssignees(task.id);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newComment.trim()) return;

    try {
      await apiRequest(
        `/projects/${projectId}/tasks/${selectedTask.id}/comments`,
        {
          method: 'POST',
          body: { content: newComment },
        }
      );
      setNewComment('');
      await fetchComments(selectedTask.id);
      await fetchActivity();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!selectedTask || !confirm('Delete this comment?')) return;

    try {
      await apiRequest(
        `/projects/${projectId}/tasks/${selectedTask.id}/comments/${commentId}`,
        { method: 'DELETE' }
      );
      await fetchComments(selectedTask.id);
      await fetchActivity();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !assignEmail.trim()) return;

    try {
      setAssignError(null);
      await apiRequest(`/projects/${projectId}/tasks/${selectedTask.id}/assign`, {
        method: 'POST',
        body: { assigneeEmail: assignEmail.trim() },
      });
      setAssignEmail('');
      await fetchAssignees(selectedTask.id);
      await fetchActivity();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign task');
    }
  };

  const handleUnassign = async (userId: number) => {
    if (!selectedTask) return;
    try {
      await apiRequest(`/projects/${projectId}/tasks/${selectedTask.id}/assign/${userId}`, {
        method: 'DELETE',
      });
      await fetchAssignees(selectedTask.id);
      await fetchActivity();
    } catch (err) {
      setAssignError('Failed to remove assignee');
    }
  };

  const handleShareProject = async (email: string, role: string) => {
    await apiRequest(`/projects/${projectId}/share`, {
      method: 'POST',
      body: { memberEmail: email, role },
    });
    await fetchMembers();
    await fetchActivity();
  };

  const handleRoleChange = async (memberId: number, role: string) => {
    try {
      setMemberError(null);
      await apiRequest(`/projects/${projectId}/members/${memberId}/role`, {
        method: 'PUT',
        body: { role },
      });
      await fetchMembers();
      await fetchActivity();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Remove this member?')) {
      return;
    }

    try {
      setMemberError(null);
      await apiRequest(`/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      });
      await fetchMembers();
      await fetchActivity();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      dueDate: formData.dueDate || null,
    };

    try {
      if (editingId) {
        await apiRequest(`/projects/${projectId}/tasks/${editingId}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        await apiRequest(`/projects/${projectId}/tasks`, {
          method: 'POST',
          body: payload,
        });
      }
      setFormData({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '' });
      setEditingId(null);
      setShowForm(false);
      fetchTasks();
      fetchActivity();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleEdit = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || '',
    });
    setEditingId(task.id);
    setShowForm(true);
    setSelectedTask(null);
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Delete this task?')) return;

    try {
      await apiRequest(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      fetchTasks();
      fetchActivity();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '' });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return '#2a9d3c';
      case 'IN_PROGRESS':
        return '#e88338';
      case 'TODO':
      default:
        return '#6d665f';
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '#c85b3a';
      case 'MEDIUM':
        return '#e88338';
      case 'LOW':
        return '#7cb98e';
      default:
        return '#6d665f';
    }
  };

  const canManageMembers = ['OWNER', 'ADMIN', 'MANAGER'].includes(currentUserRole);
  const canEditTasks = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'].includes(currentUserRole);
  const canAssignTasks = canEditTasks;
  const canComment = canEditTasks;
  const canModerateComments = ['OWNER', 'ADMIN', 'MANAGER'].includes(currentUserRole);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Link href="/dashboard" className={styles.backButton}>
            ← Back
          </Link>
          <h1 className={styles.title}>{project?.name || 'Project'}</h1>
          <span className={styles.memberCount}>{members.length} members</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.shareButton}
            onClick={() => setIsShareOpen(true)}
            disabled={!canManageMembers}
            title={canManageMembers ? '' : 'Insufficient role to share'}
          >
            Share
          </button>
          <button
            className={styles.addButton}
            onClick={() => setShowForm(!showForm)}
            disabled={!canEditTasks}
          >
            {showForm ? 'Cancel' : '+ Add Task'}
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        <select
          className={styles.filterSelect}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <div className={styles.viewToggleBar}>
        <button
          className={`${styles.viewToggle} ${viewMode === 'list' ? styles.active : ''}`}
          onClick={() => setViewMode('list')}
        >
          📋 List
        </button>
        <button
          className={`${styles.viewToggle} ${viewMode === 'calendar' ? styles.active : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          📅 Calendar
        </button>
        <button
          className={`${styles.viewToggle} ${viewMode === 'kanban' ? styles.active : ''}`}
          onClick={() => setViewMode('kanban')}
        >
          🎯 Kanban
        </button>
        <button
          className={`${styles.viewToggle} ${viewMode === 'reports' ? styles.active : ''}`}
          onClick={() => setViewMode('reports')}
        >
          📊 Reports
        </button>
      </div>

      {showForm && canEditTasks && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Task title"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton}>
              {editingId ? 'Update' : 'Create'} Task
            </button>
            <button type="button" className={styles.cancelButton} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={styles.mainContent}>
        {viewMode === 'reports' ? (
          <ReportsPanel
            projectId={projectId}
            projectName={project?.name || 'Project'}
            tasks={tasks}
            activityLogs={activity}
          />
        ) : viewMode === 'kanban' ? (
          <KanbanPanel
            projectId={projectId}
            tasks={tasks}
            onTaskUpdate={(taskId, status) => {
              setTasks(
                tasks.map((t) => (t.id === taskId ? { ...t, status } : t))
              );
              fetchActivity();
            }}
            onTaskSelect={(task) => handleSelectTask(task)}
            canEditTasks={canEditTasks}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarPanel
            tasks={tasks}
            onDateSelect={(date) => setCalendarSelectedDate(date)}
            selectedDate={calendarSelectedDate}
          />
        ) : (
          <div className={styles.tasksSection}>
          {loading ? (
            <div className={styles.empty}>Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className={styles.empty}>
              <p>No tasks yet</p>
              <p className={styles.emptyHint}>Create one to get started</p>
            </div>
          ) : (
            <div className={styles.tasksList}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`${styles.taskCard} ${selectedTask?.id === task.id ? styles.selected : ''}`}
                  onClick={() => handleSelectTask(task)}
                >
                  <div className={styles.taskHeader}>
                    <h3 className={styles.taskTitle}>{task.title}</h3>
                    <div className={styles.taskBadges}>
                      <span
                        className={styles.badge}
                        style={{ backgroundColor: statusColor(task.status) }}
                      >
                        {task.status === 'IN_PROGRESS' ? 'In Progress' : task.status}
                      </span>
                      <span
                        className={styles.badge}
                        style={{ backgroundColor: priorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  {task.description && (
                    <p className={styles.taskDescription}>{task.description}</p>
                  )}

                  {task.dueDate && (
                    <p className={styles.taskMeta}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}

                  {canEditTasks && (
                    <div className={styles.taskActions} onClick={(e) => e.stopPropagation()}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleEdit(task)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(task.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        )}
        <div className={styles.sidePanel}>
          {selectedTask ? (
            <div className={styles.commentsPanel}>
              <div className={styles.commentsPanelHeader}>
                <h3>Task details</h3>
                <button
                  className={styles.closeButton}
                  onClick={() => setSelectedTask(null)}
                >
                  ×
                </button>
              </div>

              <div className={styles.assigneeSection}>
                <div className={styles.sectionHeaderRow}>
                  <h4>Assignees</h4>
                </div>
                {assignees.length === 0 ? (
                  <div className={styles.subtleText}>No assignees yet</div>
                ) : (
                  <div className={styles.assigneeList}>
                    {assignees.map((assignee) => (
                      <div key={assignee.id} className={styles.assigneeItem}>
                        <span>{assignee.email}</span>
                        {canAssignTasks && (
                          <button
                            className={styles.assigneeRemove}
                            onClick={() => handleUnassign(assignee.id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <form className={styles.assignForm} onSubmit={handleAssignTask}>
                  <input
                    type="email"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    placeholder="Assign by email"
                    disabled={!canAssignTasks}
                  />
                  <button type="submit" disabled={!canAssignTasks}>Assign</button>
                </form>
                {assignError && <div className={styles.assignError}>{assignError}</div>}
              </div>

              <FileUploadPanel
                projectId={projectId}
                taskId={selectedTask.id}
                canManage={canEditTasks}
              />

              <div className={styles.commentsList}>
                {loadingComments ? (
                  <div className={styles.commentsEmpty}>Loading...</div>
                ) : comments.length === 0 ? (
                  <div className={styles.commentsEmpty}>No comments yet</div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className={styles.comment}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>{comment.authorEmail}</span>
                        <span className={styles.commentDate}>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={styles.commentContent}>{comment.content}</p>
                      {(comment.authorEmail === currentUserEmail || canModerateComments) && (
                        <button
                          className={styles.deleteCommentButton}
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form className={styles.addCommentForm} onSubmit={handleAddComment}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  disabled={!canComment}
                />
                <button type="submit" disabled={!newComment.trim() || !canComment}>
                  Comment
                </button>
              </form>
            </div>
          ) : (
            <div className={styles.panelCard}>
              <div className={styles.panelTitle}>Task details</div>
              <div className={styles.subtleText}>Select a task to view comments and assignees.</div>
            </div>
          )}

          <div className={styles.panelCard}>
            <div className={styles.panelTitle}>Members</div>
            {!canManageMembers && (
              <div className={styles.subtleText}>Viewing access only.</div>
            )}
            {memberError && <div className={styles.memberError}>{memberError}</div>}
            {members.length === 0 ? (
              <div className={styles.subtleText}>No members added yet.</div>
            ) : (
              <div className={styles.memberList}>
                {members.map((member) => (
                  <div key={member.id} className={styles.memberItem}>
                    <div>
                      <div className={styles.memberEmail}>{member.email}</div>
                      <div className={styles.memberMeta}>{member.role}</div>
                    </div>
                    {canManageMembers && member.role !== 'OWNER' && (
                      <div className={styles.memberActions}>
                        <select
                          className={styles.roleSelect}
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MANAGER">Manager</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                        <button
                          className={styles.memberRemove}
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.panelCard}>
            <div className={styles.panelTitle}>Activity</div>
            {loadingActivity ? (
              <div className={styles.subtleText}>Loading activity...</div>
            ) : activity.length === 0 ? (
              <div className={styles.subtleText}>No activity yet.</div>
            ) : (
              <div className={styles.activityList}>
                {activity.slice(0, 8).map((item) => (
                  <div key={item.id} className={styles.activityItem}>
                    <div className={styles.activityMeta}>{item.userEmail}</div>
                    <div className={styles.activityText}>{item.description}</div>
                    <div className={styles.activityTime}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareProjectModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        onShare={handleShareProject}
      />
    </div>
  );
}
