'use client';

import { useState, useMemo } from 'react';
import { apiRequest } from '@/lib/api';
import styles from './kanban.module.css';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
}

interface KanbanPanelProps {
  projectId: string;
  tasks: Task[];
  onTaskUpdate: (taskId: number, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
  onTaskSelect: (task: Task) => void;
  canEditTasks: boolean;
}

type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';

export default function KanbanPanel({
  projectId,
  tasks,
  onTaskUpdate,
  onTaskSelect,
  canEditTasks,
}: KanbanPanelProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasksByStatus = useMemo(() => {
    return {
      TODO: tasks.filter((t) => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
      DONE: tasks.filter((t) => t.status === 'DONE'),
    };
  }, [tasks]);

  const statusConfig = {
    TODO: { label: 'To Do', color: '#6d665f', icon: '📋' },
    IN_PROGRESS: { label: 'In Progress', color: '#e88338', icon: '⏳' },
    DONE: { label: 'Done', color: '#2a9d3c', icon: '✓' },
  };

  const handleDragStart = (task: Task) => {
    if (!canEditTasks) return;
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (status: Status, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!draggedTask || !canEditTasks) return;
    if (draggedTask.status === status) {
      setDraggedTask(null);
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      await apiRequest(`/projects/${projectId}/tasks/${draggedTask.id}`, {
        method: 'PUT',
        body: {
          title: draggedTask.title,
          description: draggedTask.description,
          status: status,
          priority: draggedTask.priority,
          dueDate: draggedTask.dueDate,
        },
      });

      onTaskUpdate(draggedTask.id, status);
      setDraggedTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
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

  const renderColumn = (status: Status) => {
    const columnTasks = tasksByStatus[status];

    return (
      <div key={status} className={styles.column}>
        <div className={styles.columnHeader}>
          <div className={styles.columnTitle}>
            <span className={styles.columnIcon}>{statusConfig[status].icon}</span>
            <h3>{statusConfig[status].label}</h3>
          </div>
          <span className={styles.taskCount}>{columnTasks.length}</span>
        </div>

        <div
          className={styles.columnContent}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(status, e)}
        >
          {columnTasks.length === 0 ? (
            <div className={styles.emptyColumn}>
              <div className={styles.emptyIcon}>·</div>
              <div className={styles.emptyText}>No tasks</div>
            </div>
          ) : (
            <div className={styles.taskList}>
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className={`${styles.taskCard} ${
                    draggedTask?.id === task.id ? styles.dragging : ''
                  }`}
                  draggable={canEditTasks}
                  onDragStart={() => handleDragStart(task)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTaskSelect(task)}
                  style={{ cursor: canEditTasks ? 'grab' : 'default' }}
                >
                  <div className={styles.taskCardHeader}>
                    <h4 className={styles.taskCardTitle}>{task.title}</h4>
                    <div
                      className={styles.priorityBadge}
                      style={{ backgroundColor: priorityColor(task.priority) }}
                      title={task.priority}
                    >
                      {task.priority.charAt(0)}
                    </div>
                  </div>

                  {task.description && (
                    <p className={styles.taskCardDescription}>{task.description}</p>
                  )}

                  {task.dueDate && (
                    <div className={styles.taskCardFooter}>
                      <span className={styles.dueDate}>
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.kanbanPanel}>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.dragInfo} style={{ opacity: isUpdating ? 1 : 0 }}>
        {isUpdating && 'Updating task...'}
      </div>

      <div className={styles.boardContainer}>
        {(['TODO', 'IN_PROGRESS', 'DONE'] as Status[]).map((status) => renderColumn(status))}
      </div>

      {!canEditTasks && (
        <div className={styles.readOnlyNote}>View only • Enable editing to drag tasks</div>
      )}
    </div>
  );
}
