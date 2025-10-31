import React, { useState, useEffect } from 'react';
import { taskAPI, projectAPI, teamAPI, projectTeamAPI } from '../services/api';
import { Task, Project, TeamMember } from '../types';
import WorkloadWarningModal from './WorkloadWarningModal';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import CustomSelect from './CustomSelect';
import '../App.css';

interface AddTaskProps {
  onTaskAdded?: () => void;
  onClose?: () => void;
  projectId?: number;
  assigneeId?: number;
}

interface ProjectTeamMember {
  id: number;
  user_id: number;
  project_id: number;
  allocated_hours_per_week: number;
  team_member_name: string;
  team_member_role: string;
  username: string;
  email: string;
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
  const [projectTeamMembers, setProjectTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [filteredAssignees, setFilteredAssignees] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWorkloadWarning, setShowWorkloadWarning] = useState<any>(null);
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

  // Fetch project team members when project is selected
  useEffect(() => {
    const fetchProjectTeam = async () => {
      if (formData.project_id > 0) {
        try {
          const projectTeam = await projectTeamAPI.getProjectTeam(formData.project_id);
          setProjectTeamMembers(projectTeam);
          
          // Filter team members to only show those assigned to this project
          const projectUserIds = projectTeam.map((member: ProjectTeamMember) => member.user_id);
          const filtered = teamMembers.filter(member => projectUserIds.includes(member.id));
          setFilteredAssignees(filtered);
          
          // Reset assignee if not in project team
          if (formData.assignee_id > 0 && !projectUserIds.includes(formData.assignee_id)) {
            setFormData(prev => ({ ...prev, assignee_id: 0 }));
          }
        } catch (err) {
          console.error('Error fetching project team:', err);
          showToast('Failed to load project team members', 'error');
          setProjectTeamMembers([]);
          setFilteredAssignees([]);
        }
      } else {
        setProjectTeamMembers([]);
        setFilteredAssignees([]);
      }
    };

    if (teamMembers.length > 0) {
      fetchProjectTeam();
    }
  }, [formData.project_id, teamMembers]);

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

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value) || 0
    }));
    // Clear error for this field
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

    // Assignee validation - MUST be from selected project
    if (!formData.assignee_id || formData.assignee_id === 0) {
      errors.assignee_id = 'Please select an assignee';
    } else if (formData.project_id > 0) {
      // Check if assignee is in the project team
      const projectUserIds = projectTeamMembers.map(member => member.user_id);
      if (!projectUserIds.includes(formData.assignee_id)) {
        errors.assignee_id = 'Selected assignee is not assigned to this project. Please select an assignee from the project team.';
      }
    }

    // Planned hours validation
    if (!formData.planned_hours || formData.planned_hours <= 0) {
      errors.planned_hours = 'Estimated hours must be greater than 0';
    } else if (formData.planned_hours > 1000) {
      errors.planned_hours = 'Estimated hours seems too high (max 1000)';
    }

    // Due date validation (mandatory and cannot be past)
    if (!formData.due_date) {
      errors.due_date = 'Due date is required';
    } else {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        errors.due_date = 'Due date cannot be in the past';
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
      // Validate workload if due date is provided
      if (formData.due_date && formData.assignee_id && formData.project_id && formData.planned_hours > 0) {
        const validationResult = await taskAPI.validateWorkload({
          assignee_id: formData.assignee_id,
          project_id: formData.project_id,
          planned_hours: formData.planned_hours,
          due_date: formData.due_date
        });

        // Check if estimated hours exceed available hours
        if (formData.planned_hours > validationResult.workload.availableHours) {
          const violation = formData.planned_hours - validationResult.workload.availableHours;
          setShowWorkloadWarning({
            warnings: [
              `Estimated hours (${formData.planned_hours}h) exceed available hours (${validationResult.workload.availableHours}h) for this week`,
              `This task requires ${violation}h more than what's available`,
              ...validationResult.warnings
            ],
            warningLevel: 'critical',
            workload: validationResult.workload,
            formData: { ...formData }
          });
          setLoading(false);
          return;
        }

        // If there are other warnings, show the warning modal
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
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create task';
      setError(errorMessage);
      showToast(errorMessage, 'error');
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
      setFormErrors({});
      onTaskAdded?.();
      onClose?.();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create task';
      setError(errorMessage);
      showToast(errorMessage, 'error');
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
      setFormErrors({});
      onTaskAdded?.();
      onClose?.();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create task';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkloadWarningConfirm = async () => {
    setLoading(true);
    try {
      await createTaskWithWorkload(showWorkloadWarning);
      setShowWorkloadWarning(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create task';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setLoading(false);
    }
  };

  const handleWorkloadWarningCancel = () => {
    setShowWorkloadWarning(null);
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '700px' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', margin: '-2rem -2rem 1.5rem -2rem', padding: '1.5rem 2rem', borderRadius: '12px 12px 0 0' }}>
          <h2 style={{ margin: 0, color: 'white' }}>Create New Task</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose} style={{ color: 'white' }}>
              ×
            </button>
          )}
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
              <div style={{ 
                border: formErrors.project_id ? '1px solid #ef4444' : '1px solid #e1e8ed',
                borderRadius: '4px'
              }}>
                <CustomSelect
                  value={formData.project_id}
                  onChange={handleSelectChange('project_id')}
                  options={[
                    { value: 0, label: 'Select Project' },
                    ...projects.map(project => ({
                      value: project.id,
                      label: project.name
                    }))
                  ]}
                  placeholder="Select Project"
                  className="custom-select-full-width"
                />
              </div>
              {formErrors.project_id && (
                <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  {formErrors.project_id}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="assignee_id">Assignee <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ 
                border: formErrors.assignee_id ? '1px solid #ef4444' : '1px solid #e1e8ed',
                borderRadius: '4px'
              }}>
                <CustomSelect
                  value={formData.assignee_id}
                  onChange={handleSelectChange('assignee_id')}
                  options={[
                    { value: 0, label: formData.project_id > 0 ? 'Select Assignee from Project Team' : 'Select Project First' },
                    ...(formData.project_id > 0 ? filteredAssignees : []).map(member => ({
                      value: member.id,
                      label: member.name
                    }))
                  ]}
                  placeholder={formData.project_id > 0 ? 'Select Assignee from Project Team' : 'Select Project First'}
                  className="custom-select-full-width"
                />
              </div>
              {formErrors.assignee_id && (
                <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  {formErrors.assignee_id}
                </small>
              )}
              {formData.project_id > 0 && filteredAssignees.length === 0 && (
                <small style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  ⚠️ No team members assigned to this project. Please assign members to the project first.
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
                min={new Date().toISOString().split('T')[0]}
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
              {loading ? 'Creating...' : 'Create Task'}
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
