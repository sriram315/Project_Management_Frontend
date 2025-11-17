import React, { useState, useEffect } from 'react';
import { projectAPI, projectAssignmentsAPI } from '../services/api';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import CustomSelect from './CustomSelect';
import '../App.css';

interface ProjectAssignmentsProps {
  user: any;
}

interface Project {
  id: number;
  name: string;
  status: string;
}

interface ManagerTeamLead {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Assignment {
  id: number;
  project_id: number;
  project_name: string;
  assigned_to_user_id: number;
  assigned_to_username: string;
  assigned_to_email: string;
  assigned_to_role: string;
  assigned_at: string;
}

const ProjectAssignments: React.FC<ProjectAssignmentsProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [managersTeamLeads, setManagersTeamLeads] = useState<ManagerTeamLead[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedManager, setSelectedManager] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsData, managersData, assignmentsData] = await Promise.all([
        projectAPI.getAll(),
        projectAssignmentsAPI.getManagersTeamLeads(),
        projectAssignmentsAPI.getAll(),
      ]);
      setProjects(projectsData);
      setManagersTeamLeads(managersData);
      setAssignments(assignmentsData);
    } catch (error: any) {
      showToast(error.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedProject || !selectedManager) {
      showToast('Please select both project and manager/team lead', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await projectAssignmentsAPI.assign({
        project_id: selectedProject,
        assigned_to_user_id: selectedManager,
        assigned_by_user_id: user.id,
      });
      showToast('Project assigned successfully', 'success');
      setShowAssignModal(false);
      setSelectedProject(null);
      setSelectedManager(null);
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Failed to assign project', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassign = async (assignmentId: number, projectName: string, username: string) => {
    if (!window.confirm(`Are you sure you want to unassign "${projectName}" from ${username}?`)) {
      return;
    }

    try {
      await projectAssignmentsAPI.unassign(assignmentId);
      showToast('Project unassigned successfully', 'success');
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Failed to unassign project', 'error');
    }
  };

  // Group assignments by project
  const assignmentsByProject = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.project_id]) {
      acc[assignment.project_id] = [];
    }
    acc[assignment.project_id].push(assignment);
    return acc;
  }, {} as Record<number, Assignment[]>);

  // Get project assignments summary
  const getProjectAssignments = (projectId: number) => {
    return assignmentsByProject[projectId] || [];
  };

  if (loading) {
    return (
      <div className="text-muted-foreground" style={{ textAlign: 'center', padding: '3rem' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="users-page">
      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1
            className="text-foreground"
            style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
            }}
          >
            Project Assignments
          </h1>
          <p
            className="text-muted-foreground"
            style={{
              fontSize: '0.95rem',
              marginTop: '0.25rem',
            }}
          >
            Assign projects to managers and team leads
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowAssignModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>+</span>
            Assign Project
          </button>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '550px' }}>
            <div
              className="modal-header"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                margin: '-2rem -2rem 1.5rem -2rem',
                padding: '1.5rem 2rem',
                borderRadius: '12px 12px 0 0',
              }}
            >
              <h2 style={{ margin: 0, color: 'white' }}>Assign Project</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedProject(null);
                  setSelectedManager(null);
                }}
                className="close-btn"
                style={{ color: 'white' }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '0 2rem 2rem' }}>
              <div
                className="bg-gray-50"
                style={{
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <p className="text-foreground" style={{ fontSize: '0.875rem', margin: 0 }}>
                  💡 <strong>Tip:</strong> You can assign multiple managers/team leads to the same project. Each person will see and manage the project independently.
                </p>
              </div>
              <div className="form-group">
                <label>
                  Select Project: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <CustomSelect
                  options={projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  value={selectedProject ?? null}
                  onChange={(value) => setSelectedProject(value ? Number(value) : null)}
                  placeholder="Select a project"
                />
              </div>
              <div className="form-group">
                <label>
                  Select Manager/Team Lead: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <CustomSelect
                  options={managersTeamLeads.map((m) => ({
                    value: m.id,
                    label: `${m.username} (${m.role})`,
                  }))}
                  value={selectedManager ?? null}
                  onChange={(value) => setSelectedManager(value ? Number(value) : null)}
                  placeholder="Select a manager or team lead"
                />
                <small className="form-help">
                  You can assign multiple people to the same project by repeating this process
                </small>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={isSubmitting || !selectedProject || !selectedManager}
                  className="btn-enterprise btn-primary"
                  style={{
                    opacity: isSubmitting || !selectedProject || !selectedManager ? 0.5 : 1,
                    cursor: isSubmitting || !selectedProject || !selectedManager ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="btn-icon">✅</span>
                  {isSubmitting ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedProject(null);
                    setSelectedManager(null);
                  }}
                  className="btn-enterprise btn-secondary"
                >
                  <span className="btn-icon">❌</span>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects List with Assignments */}
      <div
        className="users-table-container bg-white"
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table
            className="users-table"
            style={{ width: '100%', borderCollapse: 'collapse' }}
          >
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr
                className="bg-gray-50"
                style={{
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <th
                  className="text-muted-foreground"
                  style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    textTransform: 'none',
                  }}
                >
                  Project Name
                </th>
                <th
                  className="text-muted-foreground"
                  style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    textTransform: 'none',
                  }}
                >
                  Status
                </th>
                <th
                  className="text-muted-foreground"
                  style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    textTransform: 'none',
                  }}
                >
                  Assigned To
                </th>
                <th
                  className="text-muted-foreground"
                  style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    textTransform: 'none',
                  }}
                >
                  Assigned At
                </th>
                <th
                  className="text-muted-foreground"
                  style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    textTransform: 'none',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground"
                    style={{
                      padding: '3rem',
                      textAlign: 'center',
                    }}
                  >
                    No projects found
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                  const projectAssignments = getProjectAssignments(project.id);
                  if (projectAssignments.length === 0) {
                    return (
                      <tr key={project.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td className="text-foreground" style={{ padding: '1rem 1.5rem', fontWeight: '500' }}>
                          {project.name}
                        </td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor:
                                project.status === 'active'
                                  ? '#d1fae5'
                                  : project.status === 'completed'
                                  ? '#dbeafe'
                                  : '#fef3c7',
                              color:
                                project.status === 'active'
                                  ? '#065f46'
                                  : project.status === 'completed'
                                  ? '#1e40af'
                                  : '#92400e',
                            }}
                          >
                            {project.status}
                          </span>
                        </td>
                        <td className="text-muted-foreground" style={{ padding: '1rem 1.5rem', fontStyle: 'italic' }}>
                          Not assigned
                        </td>
                        <td className="text-muted-foreground" style={{ padding: '1rem 1.5rem' }}>-</td>
                        <td className="text-muted-foreground" style={{ padding: '1rem 1.5rem' }}>-</td>
                      </tr>
                    );
                  }
                  return projectAssignments.map((assignment, idx) => (
                    <tr key={`${project.id}-${assignment.id}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {idx === 0 && (
                        <>
                          <td
                            rowSpan={projectAssignments.length}
                            className="text-foreground"
                            style={{ padding: '1rem 1.5rem', fontWeight: '500' }}
                          >
                            {project.name}
                          </td>
                          <td rowSpan={projectAssignments.length} style={{ padding: '1rem 1.5rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor:
                                  project.status === 'active'
                                    ? '#d1fae5'
                                    : project.status === 'completed'
                                    ? '#dbeafe'
                                    : '#fef3c7',
                                color:
                                  project.status === 'active'
                                    ? '#065f46'
                                    : project.status === 'completed'
                                    ? '#1e40af'
                                    : '#92400e',
                              }}
                            >
                              {project.status}
                            </span>
                          </td>
                        </>
                      )}
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div>
                          <div className="text-foreground" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {assignment.assigned_to_username}
                          </div>
                          <div className="text-muted-foreground" style={{ fontSize: '0.8rem', marginTop: '0.125rem' }}>
                            {assignment.assigned_to_role} • {assignment.assigned_to_email}
                          </div>
                        </div>
                      </td>
                      <td className="text-foreground" style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                        {new Date(assignment.assigned_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <button
                          onClick={() =>
                            handleUnassign(
                              assignment.id,
                              assignment.project_name,
                              assignment.assigned_to_username
                            )
                          }
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.5rem 0.875rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>🗑️</span>
                          Unassign
                        </button>
                      </td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
        {projects.length === 0 && (
          <div className="text-muted-foreground" style={{ padding: '3rem', textAlign: 'center' }}>
            <p>No projects found. Create projects first to assign them.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectAssignments;