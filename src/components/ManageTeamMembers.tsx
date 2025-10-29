import React, { useState, useEffect } from 'react';
import { projectTeamAPI } from '../services/api';
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
}

const ManageTeamMembers: React.FC<ManageTeamMembersProps> = ({ 
  projectId, 
  projectName, 
  onClose 
}) => {
  const [projectTeam, setProjectTeam] = useState<ProjectTeamMember[]>([]);
  const [availableTeam, setAvailableTeam] = useState<AvailableTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [allocatedHours, setAllocatedHours] = useState<number>(40); // Default 40 hours per week
  const [editingMember, setEditingMember] = useState<ProjectTeamMember | null>(null);
  const [editHours, setEditHours] = useState<number>(40);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectTeamData, availableTeamData] = await Promise.all([
        projectTeamAPI.getProjectTeam(projectId),
        projectTeamAPI.getAvailableTeam(projectId)
      ]);
      setProjectTeam(projectTeamData);
      setAvailableTeam(availableTeamData);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

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
      setShowAddForm(false);
      setSelectedMember(null);
      setAllocatedHours(40);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Failed to add team member to project');
    }
  };

  const handleRemoveTeamMember = async (teamMemberId: number) => {
    if (window.confirm('Are you sure you want to remove this team member from the project?')) {
      try {
        await projectTeamAPI.removeTeamMember(projectId, teamMemberId);
        fetchData(); // Refresh data
      } catch (error) {
        console.error('Error removing team member:', error);
        alert('Failed to remove team member from project');
      }
    }
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
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating team member:', error);
      alert('Failed to update team member hours');
    }
  };

  const calculateDailyHours = (weeklyHours: number) => {
    return Math.round((weeklyHours / 5) * 10) / 10; // 5 working days
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Manage Team Members - {projectName}</h1>
          <button onClick={onClose} className="btn-enterprise btn-secondary">
            ← Back to Projects
          </button>
        </div>
        <div className="loading">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Manage Team Members - {projectName}</h1>
        <button onClick={onClose} className="btn-enterprise btn-secondary">
          ← Back to Projects
        </button>
      </div>

        <div className="team-management-content">
          {/* Current Team Members */}
          <div className="team-section">
            <div className="section-header">
              <h3>Current Team Members</h3>
              <button 
                onClick={() => setShowAddForm(true)} 
                className="btn-enterprise btn-primary"
                disabled={availableTeam.length === 0}
              >
                <span className="btn-icon">➕</span>
                Add Team Member
              </button>
            </div>

            {projectTeam.length === 0 ? (
              <div className="empty-state">
                <p>No team members assigned to this project yet.</p>
              </div>
            ) : (
              <div className="team-members-table">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Avatar</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Hours/Week</th>
                      <th>Hours/Day</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectTeam.map((member) => (
                      <tr key={member.id} className="user-row">
                        <td>
                          <div className="user-avatar">
                            {member.team_member_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                        </td>
                        <td className="user-name">{member.team_member_name}</td>
                        <td>
                          <span className={`role-badge role-${member.team_member_role.replace('_', '-')}`}>
                            {member.team_member_role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="user-username">{member.username}</td>
                        <td className="user-email">{member.email}</td>
                        <td className="hours-cell">
                          <span className="hours-badge">
                            {member.allocated_hours_per_week}h/week
                          </span>
                        </td>
                        <td className="hours-cell">
                          <span className="hours-badge daily">
                            {calculateDailyHours(member.allocated_hours_per_week)}h/day
                          </span>
                        </td>
                        <td>
                          <div className="user-actions">
                            <button 
                              className="btn-small btn-edit"
                              onClick={() => handleEditTeamMember(member)}
                              title="Edit hours"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="btn-small btn-delete"
                              onClick={() => handleRemoveTeamMember(member.user_id)}
                              title="Remove from project"
                            >
                              🗑️ Remove
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

          {/* Add Team Member Form */}
          {showAddForm && (
            <div className="add-team-member-form">
              <h3>Add Team Member to Project</h3>
              <form onSubmit={handleAddTeamMember}>
                <div className="form-group">
                  <label>Select User:</label>
                  <select
                    value={selectedMember || ''}
                    onChange={(e) => setSelectedMember(Number(e.target.value))}
                    required
                    className="form-select"
                  >
                    <option value="">Choose a user...</option>
                    {availableTeam.map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.username} ({user.email}) - {user.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Allocated Hours per Week:</label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={allocatedHours}
                    onChange={(e) => setAllocatedHours(Number(e.target.value))}
                    required
                    className="form-input"
                    placeholder="e.g., 40"
                  />
                  <small className="form-help">
                    {allocatedHours} hours/week = {calculateDailyHours(allocatedHours)} hours/day (5 working days)
                  </small>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-enterprise btn-primary">
                    <span className="btn-icon">✅</span>
                    Add to Project
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedMember(null);
                      setAllocatedHours(40);
                    }}
                    className="btn-enterprise btn-secondary"
                  >
                    <span className="btn-icon">❌</span>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Team Member Form */}
          {editingMember && (
            <div className="edit-team-member-form">
              <h3>Edit Team Member Hours - {editingMember.team_member_name}</h3>
              <form onSubmit={handleUpdateTeamMember}>
                <div className="form-group">
                  <label>Team Member:</label>
                  <div className="member-info">
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
                    className="form-input"
                    placeholder="e.g., 40"
                  />
                  <small className="form-help">
                    {editHours} hours/week = {calculateDailyHours(editHours)} hours/day (5 working days)
                  </small>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-enterprise btn-primary">
                    <span className="btn-icon">✅</span>
                    Update Hours
                  </button>
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
                </div>
              </form>
            </div>
          )}
        </div>
    </div>
  );
};

export default ManageTeamMembers;
