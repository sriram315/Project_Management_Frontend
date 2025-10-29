import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { Task } from '../types';
import '../App.css';

interface ProjectDetailsData {
  id: number;
  name: string;
  description?: string;
  status: string;
  allocated_hours_per_week: number;
  team_member_name: string;
  team_member_role: string;
  available_hours: number;
  start_date?: string;
  end_date?: string;
}

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [projectDetails, setProjectDetails] = useState<ProjectDetailsData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = location.state?.userId;

  useEffect(() => {
    if (projectId && userId) {
      fetchProjectData();
    } else {
      setError('Invalid project or user information');
      setLoading(false);
    }
  }, [projectId, userId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [details, projectTasks] = await Promise.all([
        userAPI.getUserProjectDetails(parseInt(userId), parseInt(projectId!)),
        userAPI.getUserProjectTasks(parseInt(userId), parseInt(projectId!))
      ]);
      setProjectDetails(details);
      setTasks(projectTasks);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project data');
    } finally {
      setLoading(false);
    }
  };

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
      case 'p1': return '#dc3545';
      case 'p2': return '#fd7e14';
      case 'p3': return '#ffc107';
      case 'p4': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading project details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
        <button 
          className="btn-enterprise btn-secondary"
          onClick={() => navigate('/projects')}
        >
          Back to Projects
        </button>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="page-container">
        <div className="error-message">Project not found</div>
        <button 
          className="btn-enterprise btn-secondary"
          onClick={() => navigate('/projects')}
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{projectDetails.name}</h1>
        <button 
          className="btn-enterprise btn-secondary"
          onClick={() => navigate('/projects')}
        >
          ← Back to Projects
        </button>
      </div>

      <div className="project-details-container">
        {/* Project Info Card */}
        <div className="project-details-card">
          <div className="project-header">
            <h2>Project Information</h2>
            <span 
              className="status-badge"
              style={{ backgroundColor: projectDetails.status === 'active' ? '#28a745' : '#6c757d' }}
            >
              {projectDetails.status.charAt(0).toUpperCase() + projectDetails.status.slice(1)}
            </span>
          </div>

          <div className="project-info-grid">
            <div className="info-section">
              <h3>Your Assignment</h3>
              <div className="info-item">
                <span className="info-label">Role:</span>
                <span className="info-value">{projectDetails.team_member_role}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Allocated Hours/Week:</span>
                <span className="info-value">{projectDetails.allocated_hours_per_week} hours</span>
              </div>
              <div className="info-item">
                <span className="info-label">Available Hours:</span>
                <span className="info-value">{projectDetails.available_hours} hours</span>
              </div>
            </div>

            <div className="info-section">
              <h3>Project Timeline</h3>
              <div className="info-item">
                <span className="info-label">Start Date:</span>
                <span className="info-value">{formatDate(projectDetails.start_date)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">End Date:</span>
                <span className="info-value">{formatDate(projectDetails.end_date)}</span>
              </div>
            </div>
          </div>

          {projectDetails.description && (
            <div className="project-description">
              <h3>Description</h3>
              <p>{projectDetails.description}</p>
            </div>
          )}
        </div>

        {/* Tasks Card */}
        <div className="project-details-card">
          <div className="project-header">
            <h2>Your Tasks ({tasks.length})</h2>
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks assigned to you for this project yet.</p>
            </div>
          ) : (
            <div className="tasks-table-container">
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Planned Hours</th>
                    <th>Actual Hours</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="task-row">
                      <td>
                        <div className="task-info">
                          <div className="task-name">{task.name}</div>
                          {task.description && (
                            <div className="task-description">{task.description}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(task.status) }}
                        >
                          {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="priority-badge"
                          style={{ backgroundColor: getPriorityColor(task.priority) }}
                        >
                          {task.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="hours-cell">{task.planned_hours}h</td>
                      <td className="hours-cell">{task.actual_hours}h</td>
                      <td className="date-cell">{formatDate(task.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
