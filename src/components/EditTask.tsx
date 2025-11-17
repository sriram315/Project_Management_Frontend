import React, { useState, useEffect } from 'react';
import { taskAPI, projectAPI, teamAPI, projectTeamAPI, dashboardAPI } from '../services/api';
import { Task, Project, TeamMember, DailyUpdate } from '../types';
import WorkloadWarningModal from './WorkloadWarningModal';
import ConfirmationModal from './ConfirmationModal';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import CustomSelect from './CustomSelect';
import '../App.css';

interface EditTaskProps {
  task: Task;
  onTaskUpdated: () => void;
  onClose: () => void;
  user?: any; // Add user prop to check role and permissions
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

const EditTask: React.FC<EditTaskProps> = ({ task, onTaskUpdated, onClose, user }) => {
  // Check if user is an employee (limited access)
  const isEmployee = user?.role === 'employee';
  
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
  const [projectTeamMembers, setProjectTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [filteredAssignees, setFilteredAssignees] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWorkloadWarning, setShowWorkloadWarning] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const { toast, showToast, hideToast } = useToast();
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [updateComment, setUpdateComment] = useState('');
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [deletingUpdateId, setDeletingUpdateId] = useState<number | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    updateId: number | null;
  }>({
    isOpen: false,
    updateId: null
  });

  useEffect(() => {
    const fetchData = async () => {
      // For employees, we don't need to fetch projects/team members
      if (isEmployee) {
        return;
      }
      
      try {
        let projectsData: Project[], teamData: TeamMember[];
        
        // Fetch projects based on user role
        if (user?.role === 'manager' || user?.role === 'team_lead') {
          projectsData = await projectAPI.getAll(user.id, user.role);
        } else {
          projectsData = await projectAPI.getAll();
        }
        
        // Fetch employees based on user role
        if (user?.role === 'manager' || user?.role === 'team_lead') {
          const employeesData = await dashboardAPI.getEmployees(undefined, user.id, user.role);
          // Convert employees to teamMembers format
          teamData = employeesData.map((emp: any) => ({
            id: emp.id,
            name: emp.username,
            role: emp.role,
            available_hours: emp.available_hours_per_week || 40,
            status: 'online' as const,
            tasks_count: 0,
            planned_hours: 0,
            productivity: 0,
            utilization: 0
          }));
        } else {
          teamData = await teamAPI.getAll();
        }
        
        setProjects(projectsData);
        setTeamMembers(teamData);
      } catch (err) {
        console.error('Error fetching data:', err);
        showToast('Failed to load data', 'error');
      }
    };

    fetchData();
  }, [user, isEmployee]);

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

  // Fetch daily updates when component loads
  useEffect(() => {
    const fetchDailyUpdates = async () => {
      setLoadingUpdates(true);
      try {
        const updates = await taskAPI.getDailyUpdates(task.id);
        setDailyUpdates(updates);
      } catch (err) {
        console.error('Error fetching daily updates:', err);
        // Don't show error toast for this, as it's not critical
      } finally {
        setLoadingUpdates(false);
      }
    };

    fetchDailyUpdates();
  }, [task.id]);

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

    // For employees, only validate status and update comment
    if (isEmployee) {
      // Update comment validation
      if (!updateComment.trim()) {
        errors.updateComment = 'Update comment is required';
      }
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }

    // For managers/team leads/superadmin, validate all fields
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

    // Due date validation (optional but if provided should be future date)
    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        errors.due_date = 'Due date should not be in the past';
      }
    }

    // Update comment validation
    if (!updateComment.trim()) {
      errors.updateComment = 'Update comment is required';
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
      // Validate workload if due date is provided (only for non-employees)
      if (!isEmployee && formData.due_date && formData.assignee_id && formData.project_id && formData.planned_hours > 0) {
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

      // If no warnings or validation passed, update the task
      await updateTask();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update task';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setLoading(false);
    }
  };

  const updateTask = async () => {
    try {
      // For employees, only update status (and daily update will be added separately)
      const updateData = isEmployee 
        ? { status: formData.status }
        : formData;
      
      await taskAPI.update(task.id, updateData);
      
      // Automatically create daily update if comment is provided
      if (updateComment.trim() && user?.id) {
        try {
          await taskAPI.createDailyUpdate(task.id, {
            user_id: user.id,
            comment: updateComment.trim()
          });
          // Refresh daily updates list
          const updates = await taskAPI.getDailyUpdates(task.id);
          setDailyUpdates(updates);
          // Clear the comment after saving
          setUpdateComment('');
        } catch (updateErr) {
          console.error('Failed to create daily update:', updateErr);
          showToast('Task updated but failed to save daily update', 'error');
        }
      }
      
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

  const updateTaskWithWorkload = async (workloadData: any) => {
    try {
      // For employees, only update status (workload validation doesn't apply)
      if (isEmployee) {
        await taskAPI.update(task.id, { status: formData.status });
      } else {
        const taskData = { 
          ...formData,
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
        await taskAPI.update(task.id, taskData);
      }
      
      // Automatically create daily update if comment is provided
      if (updateComment.trim() && user?.id) {
        try {
          await taskAPI.createDailyUpdate(task.id, {
            user_id: user.id,
            comment: updateComment.trim()
          });
          // Refresh daily updates list
          const updates = await taskAPI.getDailyUpdates(task.id);
          setDailyUpdates(updates);
          // Clear the comment after saving
          setUpdateComment('');
        } catch (updateErr) {
          console.error('Failed to create daily update:', updateErr);
          showToast('Task updated but failed to save daily update', 'error');
        }
      }
      
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

  const handleWorkloadWarningConfirm = async () => {
    setLoading(true);
    try {
      await updateTaskWithWorkload(showWorkloadWarning);
      setShowWorkloadWarning(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update task';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setLoading(false);
    }
  };

  const handleWorkloadWarningCancel = () => {
    setShowWorkloadWarning(null);
    setLoading(false);
  };


  const handleSaveDailyUpdate = async () => {
    // Validate that comment is not empty
    if (!updateComment.trim()) {
      setFormErrors(prev => ({ ...prev, updateComment: 'Daily update comment is required' }));
      showToast('Please enter a daily update comment', 'error');
      return;
    }

    if (!user?.id) {
      showToast('User information is missing', 'error');
      return;
    }

    try {
      setLoadingUpdates(true);
      // Create daily update
      await taskAPI.createDailyUpdate(task.id, {
        user_id: user.id,
        comment: updateComment.trim()
      });

      // Refresh daily updates list
      const updates = await taskAPI.getDailyUpdates(task.id);
      setDailyUpdates(updates);
      
      // Clear the input field
      setUpdateComment('');
      
      // Clear any errors
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.updateComment;
        return newErrors;
      });

      showToast('Daily update saved successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to save daily update:', err);
      const errorMessage = err.message || 'Failed to save daily update';
      showToast(errorMessage, 'error');
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleDeleteDailyUpdate = (updateId: number) => {
    setDeleteConfirmDialog({
      isOpen: true,
      updateId: updateId
    });
  };

  const confirmDeleteDailyUpdate = async () => {
    if (!deleteConfirmDialog.updateId) return;

    const updateId = deleteConfirmDialog.updateId;
    setDeletingUpdateId(updateId);
    setDeleteConfirmDialog({ isOpen: false, updateId: null });

    try {
      await taskAPI.deleteDailyUpdate(task.id, updateId);
      // Remove the deleted update from the list
      setDailyUpdates(dailyUpdates.filter(update => update.id !== updateId));
      showToast('Daily update deleted successfully', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete daily update';
      showToast(errorMessage, 'error');
    } finally {
      setDeletingUpdateId(null);
    }
  };

  const cancelDeleteDailyUpdate = () => {
    setDeleteConfirmDialog({ isOpen: false, updateId: null });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    // Parse the date string - Backend returns IST time (UTC+5:30)
    // MySQL returns timestamps in format: 'YYYY-MM-DD HH:mm:ss'
    let date: Date;
    if (dateString.includes('T') || dateString.includes('Z') || dateString.includes('+')) {
      // ISO format with timezone
      date = new Date(dateString);
    } else {
      // MySQL datetime format - backend already converted to IST, so treat as IST
      // Add IST timezone offset
      date = new Date(dateString.replace(' ', 'T') + '+05:30');
    }
    
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Format the date - backend already converted to IST
    const dateStr = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    
    return `${dateStr} at ${timeStr}`;
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

          {/* Show all fields for managers/team leads/superadmin */}
          {!isEmployee && (
            <>
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
            </>
          )}

          {/* Status field - shown for all users */}
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
            <label htmlFor="update-comment">Daily Update<span style={{ color: '#ef4444' }}>*</span></label>
            <textarea
              id="update-comment"
              value={updateComment}
              onChange={(e) => {
                setUpdateComment(e.target.value);
                // Clear error when user types
                if (formErrors.updateComment) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.updateComment;
                    return newErrors;
                  });
                }
              }}
              placeholder="Enter your task update here"
              rows={3}
              style={{ borderColor: formErrors.updateComment ? '#ef4444' : '#e1e8ed' }}
            />
            {formErrors.updateComment && (
              <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {formErrors.updateComment}
              </small>
            )}
            <small className="text-muted-foreground" style={{ fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
              Add a daily update comment that will be saved to the task history.
            </small>
            <button
  type="button"
  onClick={handleSaveDailyUpdate}
  disabled={loadingUpdates || !updateComment.trim()}
  style={{
    marginTop: '0.25rem',
    padding: '0.25rem 0.6rem', // 🔹 smaller padding for compact size
    backgroundColor: loadingUpdates || !updateComment.trim() ? '#9ca3af' : '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: loadingUpdates || !updateComment.trim() ? 'not-allowed' : 'pointer',
    fontSize: '0.7rem', // 🔹 slightly smaller font
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    transition: 'all 0.2s',
    boxShadow:
      loadingUpdates || !updateComment.trim()
        ? 'none'
        : '0 1px 2px rgba(78, 16, 16, 0.1)',
    width: 'fit-content', // 🔹 fits tightly around content
    minWidth: 'unset', // 🔹 removes any browser default width
    whiteSpace: 'nowrap', // 🔹 prevents wrapping
  }}
  onMouseEnter={(e) => {
    if (!loadingUpdates && updateComment.trim()) {
      e.currentTarget.style.backgroundColor = '#4f46e5';
      e.currentTarget.style.boxShadow =
        '0 2px 4px rgba(126, 61, 61, 0.15)';
    }
  }}
  onMouseLeave={(e) => {
    if (!loadingUpdates && updateComment.trim()) {
      e.currentTarget.style.backgroundColor = '#6366f1';
      e.currentTarget.style.boxShadow =
        '0 1px 2px rgba(172, 39, 39, 0.1)';
    }
  }}
>
  {loadingUpdates ? (
    <>
      <span>⏳</span>
      Saving...
    </>
  ) : (
    <>
      <span>💾</span>
      Save
    </>
  )}
</button>

          </div>

          {/* Daily Updates Section */}
          <div className="form-group" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e1e8ed' }}>
            <h3 className="text-foreground" style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Update History</h3>
            <p className="text-muted-foreground" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
              Previous daily updates with date and time.
            </p>

            {/* Display Existing Daily Updates */}
            <div style={{ marginTop: '1rem' }}>
              {loadingUpdates ? (
                <div className="text-muted-foreground" style={{ padding: '1rem', textAlign: 'center' }}>
                  Loading updates...
                </div>
              ) : dailyUpdates.length === 0 ? (
                <div className="text-muted-foreground bg-gray-50" style={{ 
                  padding: '1.5rem', 
                  textAlign: 'center', 
                  borderRadius: '4px',
                  border: '1px dashed #e1e8ed'
                }}>
                  No daily updates yet. Be the first to add an update!
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {dailyUpdates.map((update) => (
                    <div
                      key={update.id}
                      style={{
                        padding: '1rem',
                        marginBottom: '0.75rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e1e8ed'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{ flex: 1 }}>
                          <strong className="text-foreground" style={{ fontSize: '0.95rem' }}>
                            {update.user_name || update.username || 'Unknown User'}
                          </strong>
                          {update.email && (
                            <span className="text-muted-foreground" style={{ fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                              ({update.email})
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            // color handled by text-muted-foreground class 
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatDateTime(update.created_at)}
                          </span>
                          <button
                            onClick={() => handleDeleteDailyUpdate(update.id)}
                            disabled={deletingUpdateId === update.id}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: deletingUpdateId === update.id ? 'not-allowed' : 'pointer',
                              padding: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: deletingUpdateId === update.id ? 0.5 : 1,
                              color: '#ef4444',
                              fontSize: '1rem'
                            }}
                            title="Delete this update"
                          >
                            {deletingUpdateId === update.id ? '⏳' : '🗑️'}
                          </button>
                        </div>
                      </div>
                      <div style={{ 
                        color: '#444', 
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {update.comment}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmDialog.isOpen}
        title="Delete Daily Update"
        message="Are you sure you want to delete this daily update? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteDailyUpdate}
        onCancel={cancelDeleteDailyUpdate}
        variant="danger"
      />
    </div>
  );
};

export default EditTask;

