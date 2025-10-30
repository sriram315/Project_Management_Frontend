import React, { useState } from 'react';
import { Task } from '../types';
import { taskAPI } from '../services/api';
import BlockTaskModal, { BlockTaskData } from './BlockTaskModal';
import CompleteTaskModal, { CompleteTaskData } from './CompleteTaskModal';
import ConfirmationModal from './ConfirmationModal';
import '../App.css';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate?: () => void;
  onDeleteTask?: (id: number) => void;
  onEditTask?: (task: Task) => void;
}

interface DragItem {
  taskId: number;
  sourceStatus: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskUpdate, onDeleteTask, onEditTask }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState<{ taskId: number; taskName: string } | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<{ taskId: number; taskName: string; plannedHours: number } | null>(null);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    taskId: number | null;
    taskName: string;
  }>({
    isOpen: false,
    taskId: null,
    taskName: '',
  });

  const columns = [
    { id: 'todo', title: 'To Do', color: '#6c757d' },
    { id: 'in_progress', title: 'In Progress', color: '#007bff' },
    { id: 'blocked', title: 'Blocked', color: '#dc3545' },
    { id: 'completed', title: 'Completed', color: '#28a745' }
  ];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'p1': return '#dc3545';
      case 'p2': return '#fd7e14';
      case 'p3': return '#ffc107';
      case 'p4': return '#28a745';
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

  const getWorkloadWarningColor = (warningLevel?: string) => {
    switch (warningLevel) {
      case 'critical': return '#dc3545';
      case 'high': return '#ffc107';
      default: return 'transparent';
    }
  };

  const getWorkloadWarningIcon = (warningLevel?: string) => {
    switch (warningLevel) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      default: return '';
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

  const handleDragStart = (e: React.DragEvent, taskId: number, status: string) => {
    setDraggedItem({ taskId, sourceStatus: status });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId.toString());
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId, sourceStatus: status }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = parseInt(e.dataTransfer.getData('text/plain'));
    const sourceStatus = draggedItem?.sourceStatus;
    
    if (!taskId || !sourceStatus || sourceStatus === targetStatus) {
      setDraggedItem(null);
      return;
    }

    // Find the task to get its details
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      setDraggedItem(null);
      return;
    }

    // Show modal for blocking
    if (targetStatus === 'blocked') {
      setShowBlockModal({ taskId, taskName: task.name });
      setDraggedItem(null);
      return;
    }

    // Show modal for completing
    if (targetStatus === 'completed') {
      setShowCompleteModal({ 
        taskId, 
        taskName: task.name, 
        plannedHours: task.planned_hours 
      });
      setDraggedItem(null);
      return;
    }

    // For other status changes (todo, in_progress), update directly
    setIsUpdating(true);
    
    try {
      await taskAPI.update(taskId, { status: targetStatus as any });
      onTaskUpdate?.();
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setIsUpdating(false);
      setDraggedItem(null);
    }
  };

  const handleDeleteTask = async (taskId: number, taskName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      taskId,
      taskName,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.taskId) return;

    try {
      await taskAPI.delete(deleteConfirmation.taskId);
      onDeleteTask?.(deleteConfirmation.taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setDeleteConfirmation({ isOpen: false, taskId: null, taskName: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, taskId: null, taskName: '' });
  };

  const handleBlockTask = async (data: BlockTaskData) => {
    if (!showBlockModal) return;
    
    setIsUpdating(true);
    try {
      await taskAPI.update(showBlockModal.taskId, {
        status: 'blocked',
        work_description: data.reason,
        // Note: We could add a separate field for dependent user in the future
      });
      onTaskUpdate?.();
      setShowBlockModal(null);
    } catch (error) {
      console.error('Error blocking task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteTask = async (data: CompleteTaskData) => {
    if (!showCompleteModal) return;
    
    setIsUpdating(true);
    try {
      await taskAPI.update(showCompleteModal.taskId, {
        status: 'completed',
        actual_hours: data.actualHours,
        work_description: data.comments,
        attachments: data.links,
        productivity_rating: data.productivityRating
      });
      onTaskUpdate?.();
      setShowCompleteModal(null);
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="kanban-board">
      {columns.map(column => {
        const columnTasks = getTasksByStatus(column.id);
        
        return (
          <div
            key={column.id}
            className="kanban-column"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="kanban-column-header" style={{ backgroundColor: column.color }}>
              <h3>{column.title}</h3>
              <span className="task-count">{columnTasks.length}</span>
            </div>
            
            <div className="kanban-column-content">
              {columnTasks.map(task => (
                <div
                  key={task.id}
                  className={`kanban-card compact ${isUpdating ? 'updating' : ''} ${expandedTask === task.id ? 'expanded' : ''}`}
                  draggable={!isUpdating}
                  onDragStart={(e) => handleDragStart(e, task.id, task.status)}
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                >
                  {/* Compact View - Only Essential Info */}
                  <div className="kanban-card-compact">
                    <div className="task-header-compact">
                      <span className="task-name-compact">{task.name}</span>
                      <span 
                        className="priority-dot"
                        style={{ backgroundColor: getPriorityColor(task.priority) }}
                        title={task.priority.toUpperCase()}
                      ></span>
                    </div>
                    
                    <div className="task-info-compact">
                      <div className="task-project">{task.project_name}</div>
                      <div className="task-hours-compact">
                        <span className="planned-hours-compact">{task.planned_hours}h</span>
                        {/* Show actual hours for completed tasks */}
                        {task.status === 'completed' && task.actual_hours > 0 && (
                          <span 
                            className="actual-hours-compact"
                            style={{ color: getActualHoursColor(task.planned_hours, task.actual_hours) }}
                          >
                            /{task.actual_hours}h
                          </span>
                        )}
                      </div>
                      <div className="task-assignee-compact">{task.assignee_name}</div>
                    </div>
                    
                    {/* Workload Warning Indicator */}
                    {task.workload_warning_level && task.workload_warning_level !== 'none' && (
                      <div className="workload-warning-compact">
                        {getWorkloadWarningIcon(task.workload_warning_level)}
                      </div>
                    )}
                  </div>

                  {/* Expanded View - Full Details */}
                  {expandedTask === task.id && (
                    <div className="kanban-card-expanded">
                      <div className="expanded-header">
                        <h4 className="task-title">{task.name}</h4>
                        <button 
                          className="edit-task-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask?.(task);
                          }}
                          title="Edit task"
                        >
                          ✏️
                        </button>
                        <button 
                          className="delete-task-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id, task.name);
                          }}
                          title="Delete task"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="expanded-content">
                        {task.description && (
                          <div className="task-description">{task.description}</div>
                        )}
                        
                        <div className="task-details-grid">
                          <div className="detail-item">
                            <label>Project:</label>
                            <span>{task.project_name}</span>
                          </div>
                          <div className="detail-item">
                            <label>Assignee:</label>
                            <span>{task.assignee_name}</span>
                          </div>
                          <div className="detail-item">
                            <label>Priority:</label>
                            <span 
                              className="priority-badge"
                              style={{ backgroundColor: getPriorityColor(task.priority) }}
                            >
                              {task.priority.toUpperCase()}
                            </span>
                          </div>
                          <div className="detail-item">
                            <label>Type:</label>
                            <span 
                              className="type-badge"
                              style={{ backgroundColor: getTaskTypeColor(task.task_type) }}
                            >
                              {task.task_type.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="detail-item">
                            <label>Planned Hours:</label>
                            <span>{task.planned_hours}h</span>
                          </div>
                          {task.status === 'completed' && task.actual_hours > 0 && (
                            <div className="detail-item">
                              <label>Actual Hours:</label>
                              <span 
                                style={{ color: getActualHoursColor(task.planned_hours, task.actual_hours) }}
                              >
                                {task.actual_hours}h
                              </span>
                            </div>
                          )}
                          <div className="detail-item">
                            <label>Due Date:</label>
                            <span>{formatDate(task.due_date)}</span>
                          </div>
                          {task.utilization_percentage && task.utilization_percentage > 0 && (
                            <div className="detail-item">
                              <label>Utilization:</label>
                              <span 
                                style={{ 
                                  color: task.utilization_percentage > 100 ? '#dc3545' : 
                                         task.utilization_percentage > 80 ? '#ffc107' : '#28a745'
                                }}
                              >
                                {task.utilization_percentage}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {columnTasks.length === 0 && (
                <div className="empty-column">
                  <p>No tasks</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Block Task Modal */}
      {showBlockModal && (
        <BlockTaskModal
          taskId={showBlockModal.taskId}
          taskName={showBlockModal.taskName}
          onConfirm={handleBlockTask}
          onCancel={() => setShowBlockModal(null)}
        />
      )}
      
      {/* Complete Task Modal */}
      {showCompleteModal && (
        <CompleteTaskModal
          taskId={showCompleteModal.taskId}
          taskName={showCompleteModal.taskName}
          plannedHours={showCompleteModal.plannedHours}
          onConfirm={handleCompleteTask}
          onCancel={() => setShowCompleteModal(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteConfirmation.taskName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />
    </div>
  );
};

export default KanbanBoard;
