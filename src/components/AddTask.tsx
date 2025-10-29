import React, { useState, useEffect } from 'react';
import { taskAPI, projectAPI, teamAPI } from '../services/api';
import { Task, Project, TeamMember } from '../types';
import WorkloadWarningModal from './WorkloadWarningModal';
import '../App.css';

interface AddTaskProps {
  onTaskAdded?: () => void;
  onClose?: () => void;
  projectId?: number;
  assigneeId?: number;
}

const AddTask: React.FC<AddTaskProps> = ({ onTaskAdded, onClose, projectId, assigneeId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignee_id: assigneeId || 0,
    project_id: projectId || 0,
    planned_hours: 0,
    priority: 'p2' as 'p1' | 'p2' | 'p3' | 'p4',
    task_type: 'development' as 'development' | 'testing' | 'design' | 'documentation' | 'review' | 'meeting' | 'other',
    due_date: '',
    attachments: ''
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWorkloadWarning, setShowWorkloadWarning] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, teamData] = await Promise.all([
          projectAPI.getAll(),
          teamAPI.getAll()
        ]);
        setProjects(projectsData);
        setTeamMembers(teamData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'planned_hours' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate workload if due date is provided
      if (formData.due_date && formData.assignee_id && formData.project_id && formData.planned_hours > 0) {
        const validationResult = await taskAPI.validateWorkload({
          assignee_id: formData.assignee_id,
          project_id: formData.project_id,
          planned_hours: formData.planned_hours,
          due_date: formData.due_date
        });

        // If there are warnings, show the warning modal
        if (validationResult.warningLevel !== 'none') {
          setShowWorkloadWarning({
            warnings: validationResult.warnings,
            warningLevel: validationResult.warningLevel,
            workload: validationResult.workload,
            formData: { ...formData }
          });
          setLoading(false);
          return;
        }
      }

      // If no warnings or validation passed, create the task
      await createTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      setLoading(false);
    }
  };

  const createTask = async () => {
    try {
      // Set default status to 'todo' for new tasks
      const taskData = { ...formData, status: 'todo' as const };
      await taskAPI.create(taskData);
      setFormData({
        name: '',
        description: '',
        assignee_id: assigneeId || 0,
        project_id: projectId || 0,
        planned_hours: 0,
        priority: 'p2',
        task_type: 'development',
        due_date: '',
        attachments: ''
      });
      onTaskAdded?.();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const createTaskWithWorkload = async (workloadData: any) => {
    try {
      // Set default status to 'todo' for new tasks
      const taskData = { 
        ...formData, 
        status: 'todo' as const,
        workload_warning_level: workloadData.warningLevel,
        workload_warnings: JSON.stringify(workloadData.warnings),
        utilization_percentage: workloadData.workload.utilizationPercentage,
        allocation_utilization: workloadData.workload.allocationUtilization,
        weeks_until_due: workloadData.workload.weeksUntilDue,
        current_task_count: workloadData.workload.currentTaskCount,
        total_workload_hours: workloadData.workload.totalHours,
        available_hours: workloadData.workload.availableHours,
        allocated_hours: workloadData.workload.allocatedHours
      };
      await taskAPI.create(taskData);
      setFormData({
        name: '',
        description: '',
        assignee_id: assigneeId || 0,
        project_id: projectId || 0,
        planned_hours: 0,
        priority: 'p2',
        task_type: 'development',
        due_date: '',
        attachments: ''
      });
      onTaskAdded?.();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkloadWarningConfirm = async () => {
    setLoading(true);
    try {
      await createTaskWithWorkload(showWorkloadWarning);
      setShowWorkloadWarning(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      setLoading(false);
    }
  };

  const handleWorkloadWarningCancel = () => {
    setShowWorkloadWarning(null);
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Task</h2>
          {onClose && (
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Task Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Enter task name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="project_id">Project</label>
              <select
                id="project_id"
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                required
              >
                <option value={0}>Select Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="assignee_id">Assignee</label>
              <select
                id="assignee_id"
                name="assignee_id"
                value={formData.assignee_id}
                onChange={handleInputChange}
                required
              >
                <option value={0}>Select Assignee</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                required
              >
                <option value="p1">P1</option>
                <option value="p2">P2</option>
                <option value="p3">P3</option>
                <option value="p4">P4</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task_type">Task Type</label>
              <select
                id="task_type"
                name="task_type"
                value={formData.task_type}
                onChange={handleInputChange}
                required
              >
                <option value="development">Development</option>
                <option value="testing">Testing</option>
                <option value="design">Design</option>
                <option value="documentation">Documentation</option>
                <option value="review">Review</option>
                <option value="meeting">Meeting</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="planned_hours">Estimated Hours</label>
              <input
                type="number"
                id="planned_hours"
                name="planned_hours"
                value={formData.planned_hours}
                onChange={handleInputChange}
                min="0"
                required
                placeholder="Enter estimated hours"
              />
            </div>

            <div className="form-group">
              <label htmlFor="due_date">Due Date</label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="attachments">Attachments</label>
            <input
              type="text"
              id="attachments"
              name="attachments"
              value={formData.attachments}
              onChange={handleInputChange}
              placeholder="Enter attachment URLs or file names"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Workload Warning Modal */}
      {showWorkloadWarning && (
        <WorkloadWarningModal
          warnings={showWorkloadWarning.warnings}
          warningLevel={showWorkloadWarning.warningLevel}
          workload={showWorkloadWarning.workload}
          onConfirm={handleWorkloadWarningConfirm}
          onCancel={handleWorkloadWarningCancel}
        />
      )}
    </div>
  );
};

export default AddTask;
