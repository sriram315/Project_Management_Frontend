import React, { useState, useEffect } from 'react';
import { taskAPI, projectAPI, teamAPI } from '../services/api';
import { Task, Project, TeamMember } from '../types';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import '../App.css';

interface EditTaskProps {
  task: Task;
  onTaskUpdated: () => void;
  onClose: () => void;
}

const EditTask: React.FC<EditTaskProps> = ({ task, onTaskUpdated, onClose }) => {
  const [formData, setFormData] = useState({
    name: task.name || '',
    description: task.description || '',
    assignee_id: task.assignee_id || 0,
    project_id: task.project_id || 0,
    planned_hours: task.planned_hours || 0,
    priority: task.priority || 'p2',
    task_type: task.task_type || 'development',
    due_date: task.due_date || '',
    attachments: task.attachments || '',
    status: task.status || 'todo'
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const { toast, showToast, hideToast } = useToast();

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
        showToast('Failed to load data', 'error');
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'planned_hours' || name === 'assignee_id' || name === 'project_id' ? 
        (parseInt(value) || 0) : value
    }));
    // Clear error for this field when user types
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    // Task name validation
    if (!formData.name.trim()) {
      errors.name = 'Task name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Task name must be at least 3 characters';
    } else if (formData.name.length > 200) {
      errors.name = 'Task name must not exceed 200 characters';
    }

    // Project validation
    if (!formData.project_id || formData.project_id === 0) {
      errors.project_id = 'Please select a project';
    }

    // Assignee validation
    if (!formData.assignee_id || formData.assignee_id === 0) {
      errors.assignee_id = 'Please select an assignee';
    }

    // Planned hours validation
    if (!formData.planned_hours || formData.planned_hours <= 0) {
      errors.planned_hours = 'Estimated hours must be greater than 0';
    } else if (formData.planned_hours > 1000) {
      errors.planned_hours = 'Estimated hours seems too high (max 1000)';
    }

    // Due date validation (optional but if provided should be future date)
    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        errors.due_date = 'Due date should not be in the past';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please fix the validation errors', 'error');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await taskAPI.update(task.id, formData);
      onTaskUpdated();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update task';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '700px' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', margin: '-2rem -2rem 1.5rem -2rem', padding: '1.5rem 2rem', borderRadius: '12px 12px 0 0' }}>
          <h2 style={{ margin: 0, color: 'white' }}>Edit Task</h2>
          <button className="close-btn" onClick={onClose} style={{ color: 'white' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Task Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ borderColor: formErrors.name ? '#ef4444' : '#e1e8ed' }}
              placeholder="Enter task name"
            />
            {formErrors.name && (
              <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {formErrors.name}
              </small>
            )}
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
              <label htmlFor="project_id">Project <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                id="project_id"
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                style={{ borderColor: formErrors.project_id ? '#ef4444' : '#e1e8ed' }}
              >
                <option value={0}>Select Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {formErrors.project_id && (
                <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  {formErrors.project_id}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="assignee_id">Assignee <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                id="assignee_id"
                name="assignee_id"
                value={formData.assignee_id}
                onChange={handleInputChange}
                style={{ borderColor: formErrors.assignee_id ? '#ef4444' : '#e1e8ed' }}
              >
                <option value={0}>Select Assignee</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              {formErrors.assignee_id && (
                <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  {formErrors.assignee_id}
                </small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Priority <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value="p1">P1 - Critical</option>
                <option value="p2">P2 - High</option>
                <option value="p3">P3 - Medium</option>
                <option value="p4">P4 - Low</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task_type">Task Type <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                id="task_type"
                name="task_type"
                value={formData.task_type}
                onChange={handleInputChange}
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
              <label htmlFor="planned_hours">Estimated Hours <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="number"
                id="planned_hours"
                name="planned_hours"
                value={formData.planned_hours}
                onChange={handleInputChange}
                style={{ borderColor: formErrors.planned_hours ? '#ef4444' : '#e1e8ed' }}
                min="0"
                placeholder="Enter estimated hours"
              />
              {formErrors.planned_hours && (
                <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  {formErrors.planned_hours}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="due_date">Due Date</label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                style={{ borderColor: formErrors.due_date ? '#ef4444' : '#e1e8ed' }}
              />
              {formErrors.due_date && (
                <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  {formErrors.due_date}
                </small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
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
            <button type="button" onClick={onClose} className="btn-enterprise btn-secondary">
              <span className="btn-icon">❌</span>
              Cancel
            </button>
            <button type="submit" className="btn-enterprise btn-primary" disabled={loading}>
              <span className="btn-icon">✅</span>
              {loading ? 'Updating...' : 'Update Task'}
            </button>
          </div>
        </form>

        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={hideToast}
          />
        )}
      </div>
    </div>
  );
};

export default EditTask;

