import React from 'react';
import { Task } from '../types';
import '../App.css';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask?: (task: Task) => void;
  onDeleteTask?: (id: number) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onUpdateTask, onDeleteTask }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return '#6c757d';
      case 'in_progress': return '#007bff';
      case 'completed': return '#28a745';
      case 'blocked': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'p1': return '#dc3545'; // Critical - Red
      case 'p2': return '#fd7e14'; // High - Orange
      case 'p3': return '#ffc107'; // Medium - Yellow
      case 'p4': return '#28a745'; // Low - Green
      default: return '#6c757d';
    }
  };

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'development': return '#007bff';
      case 'testing': return '#28a745';
      case 'design': return '#e83e8c';
      case 'documentation': return '#6f42c1';
      case 'review': return '#fd7e14';
      case 'meeting': return '#20c997';
      case 'other': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getActualHoursColor = (plannedHours: number, actualHours: number) => {
    if (actualHours <= plannedHours) {
      return '#28a745'; // Green - on time or under budget
    } else if (actualHours <= plannedHours * 1.2) {
      return '#ffc107'; // Yellow - slightly over budget (up to 120%)
    } else {
      return '#dc3545'; // Red - significantly over budget (>120%)
    }
  };

  return (
    <div
      style={{
        overflowX: 'auto',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginTop: '2rem',
        maxHeight: '600px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'auto',
          fontSize: '15px',
          display: 'table',
        }}
      >
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Task</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Status</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Priority</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Type</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Assignee</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Project</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Hours (Planned/Taken)</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Due Date</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="user-row">
              <td style={{ padding: '1rem 1.5rem' }}>
                <div className="project-info">
                  <div className="project-name">{task.name}</div>
                  {task.description && (
                    <div className="project-description">{task.description}</div>
                  )}
                </div>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <span
                  className="role-badge"
                  style={{ backgroundColor: getStatusColor(task.status) }}
                >
                  {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                </span>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <span
                  className="role-badge"
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                >
                  {task.priority.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <span
                  className="role-badge"
                  style={{ backgroundColor: getTaskTypeColor(task.task_type) }}
                >
                  {task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}
                </span>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>{task.assignee_name || 'Not assigned'}</td>
              <td style={{ padding: '1rem 1.5rem' }}>{task.project_name || 'No project'}</td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <div className="hours-cell">
                  <div>Planned: {task.planned_hours}h</div>
                  {/* Only show actual hours for completed tasks */}
                  {task.status === 'completed' && task.actual_hours > 0 && (
                    <div
                      style={{ color: getActualHoursColor(task.planned_hours, task.actual_hours) }}
                    >
                      Actual: {task.actual_hours}h
                    </div>
                  )}
                </div>
              </td>
              <td style={{ padding: '1rem 1.5rem' }} className="date-cell">{formatDate(task.due_date)}</td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <div className="user-actions">
                  {onUpdateTask && (
                    <button
                      className="btn-small btn-edit"
                      onClick={() => onUpdateTask(task)}
                      title="Update task"
                    >
                      ✏️ Update
                    </button>
                  )}
                  {onDeleteTask && (
                    <button
                      className="btn-small btn-delete"
                      onClick={() => onDeleteTask(task.id)}
                      title="Delete task"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaskList;