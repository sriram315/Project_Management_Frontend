import React, { useState, useEffect } from 'react';
import { teamAPI } from '../services/api';
import { TeamMember } from '../types';
import '../App.css';

interface BlockTaskModalProps {
  taskId: number;
  taskName: string;
  onConfirm: (data: BlockTaskData) => void;
  onCancel: () => void;
}

export interface BlockTaskData {
  reason: string;
  dependentUserId?: number;
  dependentUserName?: string;
}

const BlockTaskModal: React.FC<BlockTaskModalProps> = ({ taskId, taskName, onConfirm, onCancel }) => {
  const [formData, setFormData] = useState({
    reason: '',
    dependentUserId: 0
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const data = await teamAPI.getAll();
        setTeamMembers(data);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Failed to load team members');
      }
    };

    fetchTeamMembers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dependentUserId' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      setError('Please provide a reason for blocking this task');
      return;
    }

    setLoading(true);
    
    try {
      const dependentMember = teamMembers.find(member => member.id === formData.dependentUserId);
      const blockData: BlockTaskData = {
        reason: formData.reason.trim(),
        dependentUserId: formData.dependentUserId || undefined,
        dependentUserName: dependentMember?.name
      };
      
      onConfirm(blockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Block Task</h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Task: <strong>{taskName}</strong></label>
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason for Blocking *</label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              required
              placeholder="Please explain why this task is being blocked..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="dependentUserId">Waiting for (Optional)</label>
            <select
              id="dependentUserId"
              name="dependentUserId"
              value={formData.dependentUserId}
              onChange={handleInputChange}
            >
              <option value={0}>No dependency</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <small className="form-help">
              Select a team member if this task is waiting for their input or work
            </small>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-danger" disabled={loading}>
              {loading ? 'Blocking...' : 'Block Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockTaskModal;
