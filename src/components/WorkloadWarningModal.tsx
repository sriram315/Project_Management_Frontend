import React from 'react';
import '../App.css';

interface WorkloadWarningModalProps {
  warnings: string[];
  warningLevel: 'high' | 'critical';
  workload: {
    currentHours: number;
    newTaskHours: number;
    totalHours: number;
    availableHours: number;
    utilizationPercentage: number;
    allocatedHours: number;
    allocationUtilization: number;
    weeksUntilDue: number;
    currentTaskCount: number;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

const WorkloadWarningModal: React.FC<WorkloadWarningModalProps> = ({
  warnings,
  warningLevel,
  workload,
  onConfirm,
  onCancel
}) => {
  const getWarningIcon = () => {
    return warningLevel === 'critical' ? '⚠️' : '⚠️';
  };

  const getWarningColor = () => {
    return warningLevel === 'critical' ? '#dc3545' : '#ffc107';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 style={{ color: getWarningColor() }}>
            {getWarningIcon()} Workload Warning
          </h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="workload-warning-content">
          <div className="warning-summary">
            <h3>⚠️ Potential Issues Detected:</h3>
            <ul className="warning-list">
              {warnings.map((warning, index) => (
                <li key={index} className="warning-item">
                  {warning}
                </li>
              ))}
            </ul>
          </div>

          <div className="workload-details">
            <h4>Workload Analysis:</h4>
            <div className="workload-stats">
              <div className="stat-row">
                <span className="stat-label">Current Tasks:</span>
                <span className="stat-value">{workload.currentTaskCount}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Current Hours:</span>
                <span className="stat-value">{workload.currentHours}h</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">New Task Hours:</span>
                <span className="stat-value">{workload.newTaskHours}h</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total Hours:</span>
                <span className="stat-value">{workload.totalHours}h</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Available Hours:</span>
                <span className="stat-value">{workload.availableHours}h</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Utilization:</span>
                <span className="stat-value" style={{ color: getWarningColor() }}>
                  {workload.utilizationPercentage}%
                </span>
              </div>
              {workload.allocatedHours > 0 && (
                <div className="stat-row">
                  <span className="stat-label">Project Allocation:</span>
                  <span className="stat-value" style={{ color: getWarningColor() }}>
                    {workload.allocationUtilization}%
                  </span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label">Weeks Until Due:</span>
                <span className="stat-value">{workload.weeksUntilDue}</span>
              </div>
            </div>
          </div>

          <div className="workload-recommendations">
            <h4>Recommendations:</h4>
            <ul className="recommendation-list">
              {workload.utilizationPercentage > 100 && (
                <li>Consider reducing task hours or extending the due date</li>
              )}
              {workload.allocationUtilization > 100 && (
                <li>Review project allocation for this team member</li>
              )}
              {workload.weeksUntilDue < 2 && (
                <li>Consider extending the due date to allow adequate time</li>
              )}
              <li>Monitor this team member's workload closely</li>
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className={warningLevel === 'critical' ? 'btn-danger' : 'btn-warning'}
          >
            Create Task Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkloadWarningModal;
