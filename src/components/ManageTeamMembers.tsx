import React, { useState, useEffect } from 'react';
import { projectTeamAPI } from '../services/api';
import ConfirmationModal from './ConfirmationModal';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import CustomSelect from './CustomSelect';
import '../App.css';

interface ProjectTeamMember {
  id: number;
  project_id: number;
  user_id: number;
  team_member_id: number;
  allocated_hours_per_week: number;
  team_member_name: string;
  team_member_role: string;
  username: string;
  email: string;
}

interface AvailableTeamMember {
  user_id: number;
  username: string;
  email: string;
  role: string;
  team_member_id: number;
  name: string;
}

interface ManageTeamMembersProps {
  projectId: number;
  projectName: string;
  onClose: () => void;
  user?: any;
}

const ManageTeamMembers: React.FC<ManageTeamMembersProps> = ({ 
  projectId, 
  projectName, 
  onClose,
  user
}) => {
  const [projectTeam, setProjectTeam] = useState<ProjectTeamMember[]>([]);
  const [availableTeam, setAvailableTeam] = useState<AvailableTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [allocatedHours, setAllocatedHours] = useState<number>(40);
  const [editingMember, setEditingMember] = useState<ProjectTeamMember | null>(null);
  const [editHours, setEditHours] = useState<number>(40);
  const { toast, showToast, hideToast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    memberId: number | null;
    memberName: string;
  }>({
    isOpen: false,
    memberId: null,
    memberName: '',
  });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectTeamData, availableTeamData] = await Promise.all([
        projectTeamAPI.getProjectTeam(projectId, user?.id, user?.role),
        projectTeamAPI.getAvailableTeam(projectId, user?.id, user?.role)
      ]);
      setProjectTeam(projectTeamData);
      setAvailableTeam(availableTeamData);
    } catch (error) {
      console.error('Error fetching team data:', error);
      showToast('Failed to load team data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      showToast('Please select a user', 'warning');
      return;
    }

    const selectedUser = availableTeam.find(user => user.user_id === selectedMember);
    if (!selectedUser) return;

    try {
      await projectTeamAPI.addTeamMember(
        projectId, 
        selectedMember, 
        allocatedHours,
        selectedUser.username,
        selectedUser.role
      );
      setSelectedMember(null);
      setAllocatedHours(40);
      await fetchData();
      showToast(`${selectedUser.username} added to project successfully!`, 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add team member to project';
      showToast(errorMessage, 'error');
    }
  };

  const handleRemoveTeamMember = (userId: number, memberName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      memberId: userId,
      memberName,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.memberId) return;

    try {
      await projectTeamAPI.removeTeamMember(projectId, deleteConfirmation.memberId);
      await fetchData();
      showToast(`${deleteConfirmation.memberName} removed from project successfully!`, 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove team member from project';
      showToast(errorMessage, 'error');
    } finally {
      setDeleteConfirmation({ isOpen: false, memberId: null, memberName: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, memberId: null, memberName: '' });
  };

  const handleEditTeamMember = (member: ProjectTeamMember) => {
    setEditingMember(member);
    setEditHours(member.allocated_hours_per_week);
  };

  const handleUpdateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      await projectTeamAPI.updateTeamMember(projectId, editingMember.user_id, editHours);
      setEditingMember(null);
      setEditHours(40);
      await fetchData();
      showToast(`${editingMember.team_member_name}'s hours updated successfully!`, 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update team member hours';
      showToast(errorMessage, 'error');
    }
  };

  const calculateDailyHours = (weeklyHours: number) => {
    return Math.round((weeklyHours / 5) * 10) / 10;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#000', margin: 0 }}>
            Manage Team Members - {projectName}
          </h1>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading team members...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#000', margin: 0 }}>
          Manage Team Members - {projectName}
        </h1>
        <button 
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
        >
          ← Back to Projects
        </button>
      </div>

      {/* Current Team Members Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#000', margin: 0 }}>
            Current Team Members
          </h2>
          {/* Removed the add button from here as per the image, add form is always visible below */}
        </div>

        {projectTeam.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <p style={{ margin: 0 }}>No team members assigned to this project yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AVATAR</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NAME</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ROLE</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>USERNAME</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EMAIL</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HOURS/WEEK</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>HOURS/DAY</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {projectTeam.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: getAvatarColor(member.team_member_name),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}>
                        {getInitials(member.team_member_name)}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500', color: '#111827' }}>
                      {member.team_member_name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        backgroundColor: member.team_member_role.toLowerCase() === 'manager' ? '#d1fae5' : '#dbeafe',
                        color: member.team_member_role.toLowerCase() === 'manager' ? '#065f46' : '#1e40af'
                      }}>
                        {member.team_member_role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>
                      {member.username}
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>
                      {member.email}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        backgroundColor: '#dbeafe',
                        color: '#1e40af'
                      }}>
                        {member.allocated_hours_per_week}h/week
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        backgroundColor: '#d1fae5',
                        color: '#065f46'
                      }}>
                        {calculateDailyHours(member.allocated_hours_per_week)}h/day
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditTeamMember(member)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleRemoveTeamMember(member.user_id, member.team_member_name)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Team Member Form - Only for Super Admin */}
      {user?.role === 'super_admin' && (
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#000', marginBottom: '1.5rem' }}>
          Add Team Member to Project
        </h2>
        
        <form onSubmit={handleAddTeamMember}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
              Select User:
            </label>
            <CustomSelect
              value={selectedMember?.toString() || ''}
              onChange={(value) => setSelectedMember(value ? Number(value) : null)}
              options={[
                { value: '', label: 'Choose a user...' },
                ...availableTeam.map((user) => ({
                  value: user.user_id.toString(),
                  label: `${user.username} (${user.email}) - ${user.role}`
                }))
              ]}
              placeholder="Choose a user..."
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
              Allocated Hours per Week:
            </label>
            <input
              type="number"
              min="1"
              max="80"
              value={allocatedHours}
              onChange={(e) => setAllocatedHours(Number(e.target.value))}
              required
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#374151',
                outline: 'none'
              }}
              placeholder="e.g., 40"
            />
            <small style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
              {allocatedHours} hours/week = {calculateDailyHours(allocatedHours)} hours/day (5 working days)
            </small>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedMember(null);
                setAllocatedHours(40);
              }}
              style={{
                padding: '0.65rem 1.5rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '0.65rem 1.5rem',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
            >
              ✓ Add to Project
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Edit Team Member Modal */}
      {editingMember && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '550px' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', margin: '-2rem -2rem 1.5rem -2rem', padding: '1.5rem 2rem', borderRadius: '12px 12px 0 0' }}>
              <h2 style={{ margin: 0, color: 'white' }}>Edit Team Member Hours</h2>
              <button 
                onClick={() => {
                  setEditingMember(null);
                  setEditHours(40);
                }}
                className="close-btn"
                style={{ color: 'white' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateTeamMember} className="user-form">
              <div className="form-group">
                <label>Team Member:</label>
                <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '1rem' }}>
                  <strong>{editingMember.team_member_name}</strong> ({editingMember.username}) - {editingMember.team_member_role}
                </div>
              </div>

              <div className="form-group">
                <label>Allocated Hours per Week:</label>
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={editHours}
                  onChange={(e) => setEditHours(Number(e.target.value))}
                  required
                  placeholder="e.g., 40"
                />
                <small style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                  {editHours} hours/week = {calculateDailyHours(editHours)} hours/day (5 working days)
                </small>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingMember(null);
                    setEditHours(40);
                  }}
                  className="btn-enterprise btn-secondary"
                >
                  <span className="btn-icon">❌</span>
                  Cancel
                </button>
                <button type="submit" className="btn-enterprise btn-primary">
                  <span className="btn-icon">✅</span>
                  Update Hours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Remove Team Member"
        message={`Are you sure you want to remove "${deleteConfirmation.memberName}" from this project? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />

      {/* Toast Notifications */}
      {toast.isVisible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default ManageTeamMembers;
