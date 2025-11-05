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
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Project Assignments</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowAssignModal(true)}
        >
          + Assign Project
        </button>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Project</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedProject(null);
                  setSelectedManager(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px', fontStyle: 'italic' }}>
                💡 <strong>Tip:</strong> You can assign multiple managers/team leads to the same project. Each person will see and manage the project independently.
              </p>
              <div className="form-group">
                <label>Select Project:</label>
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
                <label>Select Manager/Team Lead:</label>
                <CustomSelect
                  options={managersTeamLeads.map((m) => ({
                    value: m.id,
                    label: `${m.username} (${m.role})`,
                  }))}
                  value={selectedManager ?? null}
                  onChange={(value) => setSelectedManager(value ? Number(value) : null)}
                  placeholder="Select a manager or team lead"
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                  You can assign multiple people to the same project by repeating this process
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedProject(null);
                  setSelectedManager(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAssign}
                disabled={isSubmitting || !selectedProject || !selectedManager}
              >
                {isSubmitting ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects List with Assignments */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Assigned At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>
                  No projects found
                </td>
              </tr>
            ) : (
              projects.map((project) => {
                const projectAssignments = getProjectAssignments(project.id);
                if (projectAssignments.length === 0) {
                  return (
                    <tr key={project.id}>
                      <td>{project.name}</td>
                      <td>
                        <span className={`status-badge status-${project.status}`}>
                          {project.status}
                        </span>
                      </td>
                      <td style={{ color: '#999' }}>Not assigned</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                  );
                }
                return projectAssignments.map((assignment, idx) => (
                  <tr key={`${project.id}-${assignment.id}-${idx}`}>
                    {idx === 0 && (
                      <>
                        <td rowSpan={projectAssignments.length}>{project.name}</td>
                        <td rowSpan={projectAssignments.length}>
                          <span className={`status-badge status-${project.status}`}>
                            {project.status}
                          </span>
                        </td>
                      </>
                    )}
                    <td>
                      {assignment.assigned_to_username} ({assignment.assigned_to_role})
                      <br />
                      <small style={{ color: '#666' }}>{assignment.assigned_to_email}</small>
                    </td>
                    <td>{new Date(assignment.assigned_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() =>
                          handleUnassign(
                            assignment.id,
                            assignment.project_name,
                            assignment.assigned_to_username
                          )
                        }
                      >
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
    </div>
  );
};

export default ProjectAssignments;

