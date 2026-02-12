'use client';

import { useState, useMemo } from 'react';
import styles from './reports.module.css';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
}

interface ActivityLog {
  id: number;
  action: string;
  description: string;
  userEmail: string;
  createdAt: string;
}

interface ReportsPanelProps {
  projectId: string;
  projectName: string;
  tasks: Task[];
  activityLogs: ActivityLog[];
}

export default function ReportsPanel({
  projectId,
  projectName,
  tasks,
  activityLogs,
}: ReportsPanelProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;

    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

    const highPriority = tasks.filter((t) => t.priority === 'HIGH').length;
    const mediumPriority = tasks.filter((t) => t.priority === 'MEDIUM').length;
    const lowPriority = tasks.filter((t) => t.priority === 'LOW').length;

    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
    ).length;

    const avgTasksPerDay = activityLogs.length > 0 ? (total / Math.max(1, activityLogs.length / 10)).toFixed(1) : '0';

    return {
      total,
      done,
      inProgress,
      todo,
      completionRate,
      highPriority,
      mediumPriority,
      lowPriority,
      overdueTasks,
      avgTasksPerDay,
    };
  }, [tasks, activityLogs]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${projectName.replace(/\s+/g, '_')}_${exportFormat}_${timestamp}`;

      if (exportFormat === 'csv') {
        exportCSV(filename);
      } else if (exportFormat === 'json') {
        exportJSON(filename);
      } else if (exportFormat === 'pdf') {
        exportPDF(filename);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = (filename: string) => {
    // Create tasks CSV
    const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Due Date'];
    const rows = tasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    // Add analytics summary
    const analyticsCSV =
      `\n\nProject Analytics Summary\n` +
      `Total Tasks,${analytics.total}\n` +
      `Completed,${analytics.done}\n` +
      `In Progress,${analytics.inProgress}\n` +
      `To Do,${analytics.todo}\n` +
      `Completion Rate,%${analytics.completionRate}\n` +
      `High Priority Tasks,${analytics.highPriority}\n` +
      `Medium Priority Tasks,${analytics.mediumPriority}\n` +
      `Low Priority Tasks,${analytics.lowPriority}\n` +
      `Overdue Tasks,${analytics.overdueTasks}`;

    const fullCSV = csvContent + analyticsCSV;

    downloadFile(fullCSV, `${filename}.csv`, 'text/csv');
  };

  const exportJSON = (filename: string) => {
    const exportData = {
      projectId,
      projectName,
      exportDate: new Date().toISOString(),
      analytics,
      tasks,
      activityLogs: activityLogs.slice(0, 100), // Last 100 logs
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    downloadFile(jsonString, `${filename}.json`, 'application/json');
  };

  const exportPDF = (filename: string) => {
    // Simple PDF generation using template literals and basic HTML structure
    const pdfContent = generatePDFContent();
    downloadFile(pdfContent, `${filename}.txt`, 'text/plain');
  };

  const generatePDFContent = (): string => {
    const lines = [
      '='.repeat(80),
      `PROJECT REPORT: ${projectName}`,
      `Generated: ${new Date().toLocaleString()}`,
      '='.repeat(80),
      '',
      'ANALYTICS SUMMARY',
      '-'.repeat(80),
      `Total Tasks: ${analytics.total}`,
      `Completed: ${analytics.done} (${analytics.completionRate}%)`,
      `In Progress: ${analytics.inProgress}`,
      `To Do: ${analytics.todo}`,
      `Overdue: ${analytics.overdueTasks}`,
      '',
      'PRIORITY BREAKDOWN',
      '-'.repeat(80),
      `High Priority: ${analytics.highPriority}`,
      `Medium Priority: ${analytics.mediumPriority}`,
      `Low Priority: ${analytics.lowPriority}`,
      '',
      'TASK LIST',
      '-'.repeat(80),
    ];

    tasks.forEach((task) => {
      lines.push(`[${task.status}] ${task.title}`);
      if (task.description) {
        lines.push(`  Description: ${task.description}`);
      }
      lines.push(`  Priority: ${task.priority}`);
      if (task.dueDate) {
        lines.push(`  Due: ${new Date(task.dueDate).toLocaleDateString()}`);
      }
      lines.push('');
    });

    lines.push('='.repeat(80));
    lines.push('END OF REPORT');
    lines.push('='.repeat(80));

    return lines.join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderStatCard = (label: string, value: string | number, subtext?: string) => (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {subtext && <div className={styles.statSubtext}>{subtext}</div>}
    </div>
  );

  const renderBar = (
    label: string,
    value: number,
    max: number,
    color: string,
    percentage: boolean = false
  ) => {
    const percent = max === 0 ? 0 : (value / max) * 100;
    return (
      <div key={label} className={styles.barItem}>
        <div className={styles.barLabel}>
          <span>{label}</span>
          <span className={styles.barValue}>
            {value} {percentage ? `(${Math.round(percent)}%)` : ''}
          </span>
        </div>
        <div className={styles.barBackground}>
          <div
            className={styles.barFill}
            style={{
              width: `${percent}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={styles.reportsPanel}>
      <div className={styles.header}>
        <h2>📊 Project Reports</h2>
        <button
          className={styles.exportButton}
          onClick={handleExport}
          disabled={isExporting || tasks.length === 0}
          title={tasks.length === 0 ? 'No tasks to export' : ''}
        >
          {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </button>
      </div>

      {exportError && <div className={styles.errorBanner}>{exportError}</div>}

      <div className={styles.exportControls}>
        <label className={styles.formatLabel}>
          <input
            type="radio"
            value="csv"
            checked={exportFormat === 'csv'}
            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'pdf')}
          />
          CSV
        </label>
        <label className={styles.formatLabel}>
          <input
            type="radio"
            value="json"
            checked={exportFormat === 'json'}
            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'pdf')}
          />
          JSON
        </label>
        <label className={styles.formatLabel}>
          <input
            type="radio"
            value="pdf"
            checked={exportFormat === 'pdf'}
            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json' | 'pdf')}
          />
          Text Report
        </label>
      </div>

      <div className={styles.analyticsSection}>
        <h3>Overview</h3>
        <div className={styles.statsGrid}>
          {renderStatCard('Total Tasks', analytics.total)}
          {renderStatCard('Completion Rate', `${analytics.completionRate}%`)}
          {renderStatCard('Overdue', analytics.overdueTasks)}
          {renderStatCard('In Progress', analytics.inProgress)}
        </div>
      </div>

      <div className={styles.chartsSection}>
        <div className={styles.chart}>
          <h4>Status Distribution</h4>
          <div className={styles.barChart}>
            {renderBar('Completed', analytics.done, analytics.total, '#2a9d3c')}
            {renderBar('In Progress', analytics.inProgress, analytics.total, '#e88338')}
            {renderBar('To Do', analytics.todo, analytics.total, '#6d665f')}
          </div>
        </div>

        <div className={styles.chart}>
          <h4>Priority Distribution</h4>
          <div className={styles.barChart}>
            {renderBar('High', analytics.highPriority, analytics.total, '#c85b3a')}
            {renderBar('Medium', analytics.mediumPriority, analytics.total, '#e88338')}
            {renderBar('Low', analytics.lowPriority, analytics.total, '#7cb98e')}
          </div>
        </div>
      </div>

      <div className={styles.statsSection}>
        <h3>Quick Stats</h3>
        <div className={styles.statsList}>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>High Priority Tasks</span>
            <span className={styles.statsValue}>{analytics.highPriority}</span>
          </div>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>Overdue Tasks</span>
            <span className={styles.statsValue}>{analytics.overdueTasks}</span>
          </div>
          <div className={styles.statsItem}>
            <span className={styles.statsLabel}>Last 10 Activities</span>
            <span className={styles.statsValue}>{Math.min(10, activityLogs.length)}</span>
          </div>
        </div>
      </div>

      <div className={styles.infoBox}>
        <p>💡 <strong>Tip:</strong> Export your project data regularly for backups and external analysis.</p>
      </div>
    </div>
  );
}
