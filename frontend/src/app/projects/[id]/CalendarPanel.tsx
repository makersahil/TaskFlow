'use client';

import { useState, useMemo } from 'react';
import styles from './calendar.module.css';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string | null;
}

interface CalendarPanelProps {
  tasks: Task[];
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

type ViewMode = 'month' | 'week';

export default function CalendarPanel({ tasks, onDateSelect, selectedDate }: CalendarPanelProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.dueDate) {
        const dateKey = task.dueDate.split('T')[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  const monthDays = useMemo(() => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Previous month days
    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: null });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push({
        day: i,
        isCurrentMonth: true,
        date: date.toISOString().split('T')[0],
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, date: null });
    }

    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        day: date.getDate(),
        date: dateStr,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
      });
    }
    return days;
  }, [currentDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToPreviousWeek = () => {
    setCurrentDate(new Date(currentDate.getDate() - 7, currentDate.getMonth(), currentDate.getFullYear()));
  };

  const goToNextWeek = () => {
    setCurrentDate(new Date(currentDate.getDate() + 7, currentDate.getMonth(), currentDate.getFullYear()));
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

  const formatMonthYear = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  };

  const formatWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(startOfWeek);
    const endStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(endOfWeek);

    return `${startStr} – ${endStr}`;
  };

  const renderMonthView = () => (
    <div>
      <div className={styles.calendarHeader}>
        <button onClick={goToPreviousMonth} className={styles.navButton}>
          ←
        </button>
        <h3>{formatMonthYear(currentDate)}</h3>
        <button onClick={goToNextMonth} className={styles.navButton}>
          →
        </button>
      </div>

      <div className={styles.weekDaysHeader}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className={styles.weekDayName}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {monthDays.map((dayObj, idx) => {
          const tasksForDay = dayObj.date ? tasksByDate.get(dayObj.date) || [] : [];
          const isSelected = selectedDate === dayObj.date;

          return (
            <div
              key={idx}
              className={`${styles.dayCell} ${!dayObj.isCurrentMonth ? styles.otherMonth : ''} ${
                isSelected ? styles.selected : ''
              }`}
              onClick={() => dayObj.date && onDateSelect(dayObj.date)}
            >
              <div className={styles.dayNumber}>{dayObj.day}</div>
              {tasksForDay.length > 0 && (
                <div className={styles.taskIndicators}>
                  {tasksForDay.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={styles.taskDot}
                      style={{ backgroundColor: statusColor(task.status) }}
                      title={task.title}
                    />
                  ))}
                  {tasksForDay.length > 3 && <div className={styles.moreIndicator}>+{tasksForDay.length - 3}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div>
      <div className={styles.calendarHeader}>
        <button onClick={goToPreviousWeek} className={styles.navButton}>
          ←
        </button>
        <h3>{formatWeekRange(currentDate)}</h3>
        <button onClick={goToNextWeek} className={styles.navButton}>
          →
        </button>
      </div>

      <div className={styles.weekView}>
        {weekDays.map((dayObj, idx) => {
          const tasksForDay = tasksByDate.get(dayObj.date) || [];
          const isSelected = selectedDate === dayObj.date;
          const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(dayObj.date));

          return (
            <div
              key={idx}
              className={`${styles.weekDayCell} ${!dayObj.isCurrentMonth ? styles.otherMonth : ''} ${
                isSelected ? styles.selected : ''
              }`}
              onClick={() => onDateSelect(dayObj.date)}
            >
              <div className={styles.weekDayHeader}>
                <div className={styles.weekDayName}>{dayName}</div>
                <div className={styles.weekDayNumber}>{dayObj.day}</div>
              </div>
              <div className={styles.weekTasksList}>
                {tasksForDay.slice(0, 2).map((task) => (
                  <div key={task.id} className={styles.weekTaskItem} style={{ borderLeftColor: statusColor(task.status) }}>
                    <div className={styles.weekTaskTitle}>{task.title}</div>
                  </div>
                ))}
                {tasksForDay.length > 2 && (
                  <div className={styles.weekTaskMore}>+{tasksForDay.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={styles.calendarPanel}>
      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleButton} ${viewMode === 'month' ? styles.active : ''}`}
          onClick={() => setViewMode('month')}
        >
          Month
        </button>
        <button
          className={`${styles.toggleButton} ${viewMode === 'week' ? styles.active : ''}`}
          onClick={() => setViewMode('week')}
        >
          Week
        </button>
      </div>

      <div className={styles.calendarContent}>
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>
    </div>
  );
}
