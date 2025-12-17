import React, { useState, useEffect } from 'react';
import { projectAPI, CreateProjectData } from '../services/api';
import { Project } from '../types';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import '../App.css';

interface EditProjectProps {
  project: Project;
  onProjectUpdated: () => void;
  onClose: () => void;
}

// Helper function to format date for HTML date input (yyyy-MM-dd)
const formatDateForInput = (dateValue: string | undefined): string => {
  if (!dateValue) return '';
  // If it's already in yyyy-MM-dd format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  // If it's an ISO date string, extract just the date part
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

const EditProject: React.FC<EditProjectProps> = ({ project, onProjectUpdated, onClose }) => {
  // Helper function to normalize status
  const normalizeStatus = (status: string | undefined): 'active' | 'inactive' | 'completed' | 'dropped' => {
    const validStatuses: ('active' | 'inactive' | 'completed' | 'dropped')[] = ['active', 'inactive', 'completed', 'dropped'];
    const statusStr = String(status || '').toLowerCase().trim();
    
    if (validStatuses.includes(statusStr as any)) {
      return statusStr as 'active' | 'inactive' | 'completed' | 'dropped';
    } else if (statusStr === 'on_hold' || statusStr === 'cancelled') {
      return 'inactive';
    }
    return 'active';
  };

  const [formData, setFormData] = useState<CreateProjectData>({
    name: project.name || '',
    description: project.description || '',
    budget: project.budget || 0,
    estimated_hours: project.estimated_hours || 0,
    start_date: formatDateForInput(project.start_date),
    end_date: formatDateForInput(project.end_date),
    status: normalizeStatus(project.status)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const { toast, showToast, hideToast } = useToast();

  // Update formData when project prop changes
  useEffect(() => {
    setFormData({
      name: project.name || '',
      description: project.description || '',
      budget: project.budget || 0,
      estimated_hours: project.estimated_hours || 0,
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date),
      status: normalizeStatus(project.status)
    });
  }, [project]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: any = value;
    
    // Normalize status value when changed
    if (name === 'status') {
      processedValue = normalizeStatus(value);
      console.log('Status changed:', value, '-> normalized:', processedValue);
    } else if (name === 'budget' || name === 'estimated_hours') {
      processedValue = Number(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
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

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    // Project name validation
    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Project name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      errors.name = 'Project name must not exceed 100 characters';
    }

    // Budget validation
    if (formData.budget && formData.budget < 0) {
      errors.budget = 'Budget cannot be negative';
    }

    // Estimated hours validation
    if (formData.estimated_hours && formData.estimated_hours < 0) {
      errors.estimated_hours = 'Estimated hours cannot be negative';
    }

    // Date validation
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate < startDate) {
        errors.end_date = 'End date must be after start date';
      }
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
      // Ensure status is normalized before sending
      const payload = { 
        ...formData,
        status: normalizeStatus(formData.status)
      } as any;
      
      console.log('EditProject: FormData status:', formData.status);
      console.log('EditProject: Normalized status:', payload.status);
      console.log('EditProject: Sending update with status:', payload.status);
      console.log('EditProject: Full payload:', payload);
      
      await projectAPI.update(project.id, payload);
      onProjectUpdated();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update project';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '1.5rem 2rem', borderRadius: '12px 12px 0 0', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
          <h2 style={{ margin: 0, color: 'white' }}>Edit Project</h2>
          <button className="close-btn" onClick={onClose} style={{ color: 'white' }}>×</button>
        </div>
        
        <div style={{ padding: '1.5rem 2rem 2rem 2rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-group">
            <label htmlFor="name">Project Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ borderColor: formErrors.name ? '#ef4444' : '#e1e8ed' }}
              placeholder="Enter project name"
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
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="budget">Budget (₹)</label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleInputChange}
              style={{ borderColor: formErrors.budget ? '#ef4444' : '#e1e8ed' }}
              placeholder="0"
              min="0"
              step="0.01"
            />
            {formErrors.budget && (
              <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {formErrors.budget}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="estimated_hours">Estimated Hours</label>
            <input
              type="number"
              id="estimated_hours"
              name="estimated_hours"
              value={formData.estimated_hours}
              onChange={handleInputChange}
              style={{ borderColor: formErrors.estimated_hours ? '#ef4444' : '#e1e8ed' }}
              placeholder="0"
              min="0"
              step="1"
            />
            {formErrors.estimated_hours && (
              <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {formErrors.estimated_hours}
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status || 'active'}
              onChange={handleInputChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="start_date">Start Date</label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="end_date">End Date</label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              style={{ borderColor: formErrors.end_date ? '#ef4444' : '#e1e8ed' }}
            />
            {formErrors.end_date && (
              <small style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                {formErrors.end_date}
              </small>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-enterprise btn-secondary">
              <span className="btn-icon">❌</span>
              Cancel
            </button>
            <button type="submit" className="btn-enterprise btn-primary" disabled={loading}>
              <span className="btn-icon">✅</span>
              {loading ? 'Updating...' : 'Update Project'}
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
      </div>
    </div>
  );
};

export default EditProject;
