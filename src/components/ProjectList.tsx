import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../types';
import '../App.css';

interface ProjectListProps {
  projects: Project[];
  onDeleteProject?: (id: number, name: string) => void;
  onManageTeam?: (projectId: number, projectName: string) => void;
  onEditProject?: (project: Project) => void;
  userRole?: string;
  userId?: number;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  projects, 
  onDeleteProject, 
  onManageTeam, 
  onEditProject,
  userRole, 
  userId 
}) => {
  const navigate = useNavigate();

  const handleProjectDetails = (projectId: number) => {
    if (userRole === 'employee' && userId) {
      navigate(`/project-details/${projectId}`, { 
        state: { userId, projectId } 
      });
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'inactive': return '#ffc107';
      case 'completed': return '#6c757d';
      case 'dropped': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ overflow: 'auto', flex: 1 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151', textTransform: 'none' }}>Projects</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151', textTransform: 'none' }}>Status</th>
            {userRole !== 'employee' && <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151', textTransform: 'none' }}>Budget</th>}
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151', textTransform: 'none' }}>{userRole === 'employee' ? 'My Hours/Week' : 'Hours'}</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151', textTransform: 'none' }}>Start Date</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151', textTransform: 'none' }}>End Date</th>
            <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem', color: '#374151', textTransform: 'none' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '1rem 1.5rem' }}>
                <div>
                  <div 
                    onClick={() => userRole === 'employee' && handleProjectDetails(project.id)}
                    style={{ 
                      fontWeight: '600', 
                      color: '#111827', 
                      fontSize: '0.9rem',
                      cursor: userRole === 'employee' ? 'pointer' : 'default'
                    }}
                  >
                    {project.name}
                  </div>
                  {project.description && (
                    <div style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>{project.description}</div>
                  )}
                </div>
              </td>
              <td style={{ padding: '1rem 1.5rem' }}>
                {(() => {
                  const raw = (project.status || '').toLowerCase().trim();
                  // Normalize backend variants to our four badges
                  const normalized = raw === 'on_hold' ? 'inactive'
                    : raw === 'cancelled' ? 'inactive'
                    : raw === 'planning' ? 'active'
                    : raw;
                  const label = normalized === 'completed' ? 'COMPLETED'
                    : normalized === 'active' ? 'ACTIVE'
                    : normalized === 'inactive' ? 'INACTIVE'
                    : normalized === 'dropped' ? 'DROPPED'
                    : 'DROPPED';
                  const bg = normalized === 'completed' ? '#d1fae5'
                    : normalized === 'active' ? '#fef3c7'
                    : normalized === 'inactive' ? '#e5e7eb'
                    : normalized === 'dropped' ? '#fee2e2'
                    : '#f3f4f6';
                  const fg = normalized === 'completed' ? '#065f46'
                    : normalized === 'active' ? '#92400e'
                    : normalized === 'inactive' ? '#374151'
                    : normalized === 'dropped' ? '#991b1b'
                    : '#6b7280';
                  return (
                    <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.375rem 0.875rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  backgroundColor: bg,
                  color: fg
                }}>
                      {label}
                    </span>
                  );
                })()}
              </td>
              {userRole !== 'employee' && (
                <td style={{ padding: '1rem 1.5rem', color: '#374151', fontSize: '0.875rem' }}>{formatCurrency(project.budget)}</td>
              )}
              <td style={{ padding: '1rem 1.5rem', color: '#374151', fontSize: '0.875rem' }}>
                {userRole === 'employee'  
                  ? `${(project as any).allocated_hours_per_week || 0}h`
                  : `${project.estimated_hours || 0}h`
                }
              </td>
              <td style={{ padding: '1rem 1.5rem', color: '#374151', fontSize: '0.875rem' }}>{formatDate(project.start_date)}</td>
              <td style={{ padding: '1rem 1.5rem', color: '#374151', fontSize: '0.875rem' }}>{formatDate(project.end_date)}</td>
              <td style={{ padding: '1rem 1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {userRole === 'employee' ? (
                    <button 
                      onClick={() => handleProjectDetails(project.id)}
                      title="View project details"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.5rem 0.875rem',
                        backgroundColor: 'white',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '0.875rem' }}>📋</span>
                      View
                    </button>
                  ) : (
                    <>
                      {onEditProject && userRole === 'manager' && (
                        <button 
                          onClick={() => onEditProject(project)}
                          title="Edit project"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.5rem 0.875rem',
                            backgroundColor: 'white',
                            color: '#374151',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>✏️</span>
                          Edit
                        </button>
                      )}
                      {onManageTeam && (
                        <button 
                          onClick={() => onManageTeam(project.id, project.name)}
                          title="Manage team members"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.5rem 0.875rem',
                            backgroundColor: 'white',
                            color: '#374151',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>👥</span>
                          Manage Team
                        </button>
                      )}
                      {onDeleteProject && (
                        <button 
                          onClick={() => onDeleteProject(project.id, project.name)}
                          title="Delete project"
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
                            transition: 'all 0.2s'
                          }}
                        >
                          <span style={{ fontSize: '0.875rem' }}>🗑️</span>
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default ProjectList;
