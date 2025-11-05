import React, { useState } from 'react';
import '../App.css';

interface CompleteTaskModalProps {
  taskId: number;
  taskName: string;
  plannedHours: number;
  onConfirm: (data: CompleteTaskData) => void;
  onCancel: () => void;
}

export interface CompleteTaskData {
  actualHours: number;
  comments: string;
  links: string;
}

const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({ 
  taskId, 
  taskName, 
  plannedHours, 
  onConfirm, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    actualHours: plannedHours,
    comments: '',
    links: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'actualHours' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.actualHours <= 0) {
      setError('Please enter the actual hours spent');
      return;
    }

    setLoading(true);
    
    try {
      const completeData: CompleteTaskData = {
        actualHours: formData.actualHours,
        comments: formData.comments.trim(),
        links: formData.links.trim()
      };
      
      onConfirm(completeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Complete Task</h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Task: <strong>{taskName}</strong></label>
            <small className="form-help">Planned hours: {plannedHours}h</small>
          </div>

          <div className="form-group">
            <label htmlFor="actualHours">Hours Taken *</label>
            <input
              type="number"
              id="actualHours"
              name="actualHours"
              value={formData.actualHours}
              onChange={handleInputChange}
              min="0"
              step="0.5"
              required
              placeholder="Enter actual hours"
            />
          </div>

          <div className="form-group">
            <label htmlFor="comments">Comments</label>
            <textarea
              id="comments"
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              placeholder="What did you accomplish? Any challenges or achievements?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="links">Links & Attachments</label>
            <input
              type="text"
              id="links"
              name="links"
              value={formData.links}
              onChange={handleInputChange}
              placeholder="Paste links to PRs, documents, or other resources"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-success" disabled={loading}>
              {loading ? 'Completing...' : 'Complete Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteTaskModal;
