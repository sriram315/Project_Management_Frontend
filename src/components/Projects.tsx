import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI, userAPI } from '../services/api';
import { Project } from '../types';
import ProjectList from './ProjectList';
import AddProject from './AddProject';
import EditProject from './EditProject';
import '../App.css';

interface ProjectsProps {
  user?: any;
}

const Projects: React.FC<ProjectsProps> = ({ user }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let projectData;
      
      if (user?.role === 'employee') {
        // For employees, fetch only their assigned projects
        projectData = await userAPI.getUserProjects(user.id);
      } else {
        // For managers and team leads, fetch all projects
        projectData = await projectAPI.getAll();
      }
      
      setProjects(projectData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectAdded = () => {
    fetchProjects(); // Refresh the project list
  };

  const handleProjectUpdated = () => {
    fetchProjects(); // Refresh the project list
    setEditingProject(null);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  const handleDeleteProject = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectAPI.delete(id);
        fetchProjects(); // Refresh the project list
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete project');
      }
    }
  };

  const handleManageTeam = (projectId: number, projectName: string) => {
    navigate(`/team-management/${projectId}`, { 
      state: { projectName } 
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#000', marginBottom: '0.5rem' }}>
            {user?.role === 'employee' ? 'My Projects' : 'Project Management'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Manage and track all your projects in one place
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Search projects by name, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '0.65rem 1rem', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              flex: '1',
              maxWidth: '400px',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          {user?.role !== 'employee' && (
            <button 
              onClick={() => setShowAddProject(true)} 
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
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>+</span>
              Add Project
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="projects-content">
        {projects.filter(project => 
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (project.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).length === 0 ? (
          <div className="empty-state">
            <h3>No projects found</h3>
            <p>{searchTerm ? 'No projects match your search criteria.' : user?.role === 'employee' ? 'You are not assigned to any projects yet.' : 'Get started by creating your first project.'}</p>
            {user?.role !== 'employee' && !searchTerm && (
              <button 
                className="btn-enterprise btn-primary"
                onClick={() => setShowAddProject(true)}
              >
                <span className="btn-icon">➕</span>
                Create Project
              </button>
            )}
          </div>
        ) : (
          <ProjectList 
            projects={projects.filter(project => 
              project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (project.description || '').toLowerCase().includes(searchTerm.toLowerCase())
            )} 
            onDeleteProject={user?.role !== 'employee' ? handleDeleteProject : undefined}
            onManageTeam={user?.role !== 'employee' ? handleManageTeam : undefined}
            onEditProject={user?.role === 'manager' ? handleEditProject : undefined}
            userRole={user?.role}
            userId={user?.id}
          />
        )}
      </div>

      {showAddProject && (
        <AddProject
          onProjectAdded={handleProjectAdded}
          onClose={() => setShowAddProject(false)}
        />
      )}

      {editingProject && (
        <EditProject
          project={editingProject}
          onProjectUpdated={handleProjectUpdated}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
};

export default Projects;
