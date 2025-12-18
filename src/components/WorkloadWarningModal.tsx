import React from "react";
import "../App.css";

interface WorkloadWarningModalProps {
  warnings: string[];
  warningLevel: "high" | "critical";
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
  onCancel,
}) => {
  const getWarningIcon = () => {
    return warningLevel === "critical" ? "⚠️" : "⚠️";
  };

  const getWarningColor = () => {
    return warningLevel === "critical" ? "#dc3545" : "#ffc107";
  };

  const getSimpleExplanation = () => {
    const {
      currentHours,
      newTaskHours,
      totalHours,
      availableHours,
      utilizationPercentage,
      weeksUntilDue,
    } = workload;
    // Total weekly capacity = total hours after adding task + available hours after adding task
    const userCapacity = totalHours + availableHours;
    const availableHoursPercentage = (availableHours / userCapacity) * 100;

    let explanation = "";

    if (utilizationPercentage > 100) {
      const overload = totalHours - userCapacity;
      explanation = `⚠️ This employee can work ${userCapacity} hours per week. They already have ${currentHours} hours of work planned. Adding this ${newTaskHours}-hour task would give them ${totalHours} hours total, which is ${overload} hours more than they can handle in one week. This means they are overloaded and may not be able to complete all tasks on time.`;
    } else if (utilizationPercentage >= 60 || availableHoursPercentage <= 40) {
      explanation = `⚠️ This employee can work ${userCapacity} hours per week. After adding this task, they will have ${totalHours} hours of work (${utilizationPercentage}% of their capacity), leaving only ${availableHours} hours free (${Math.round(
        availableHoursPercentage
      )}% of their capacity). This is a high workload that may leave limited buffer for unexpected work or delays.`;
    } else if (utilizationPercentage > 80) {
      explanation = `⚠️ This employee can work ${userCapacity} hours per week. After adding this task, they will have ${totalHours} hours of work (${utilizationPercentage}% of their capacity). While this is manageable, they will be very busy with only ${availableHours} hours of free time left. Consider if this leaves enough buffer for unexpected work or delays.`;
    }

    if (weeksUntilDue < 2) {
      explanation += ` Additionally, the task is due in ${weeksUntilDue} week${
        weeksUntilDue !== 1 ? "s" : ""
      }, which is very soon and leaves limited time for completion.`;
    }

    return explanation;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 style={{ color: getWarningColor() }}>
            {getWarningIcon()} Employee Workload Alert
          </h2>
          <button className="modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: "auto", maxHeight: "calc(90vh - 180px)" }}>
          <div className="workload-warning-content">
          <div className="warning-summary">
            <h3>⚠️ What's the Problem?</h3>
            <ul className="warning-list">
              {warnings.map((warning, index) => (
                <li key={index} className="warning-item">
                  {warning}
                </li>
              ))}
            </ul>
          </div>

          <div className="workload-details">
            <h4>📊 Work Details for This Week:</h4>
            <div className="workload-stats">
              <div className="stat-row">
                <span className="stat-label">
                  Tasks Already Assigned This Week:
                </span>
                <span className="stat-value">{workload.currentTaskCount}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Work Already Planned:</span>
                <span className="stat-value">{workload.currentHours}h</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">This New Task:</span>
                <span className="stat-value">{workload.newTaskHours}h</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">
                  Total Work After Adding Task:
                </span>
                <span className="stat-value">{workload.totalHours}h</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Hours Still Free This Week:</span>
                <span className="stat-value">{workload.availableHours}h</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">How Busy They'll Be:</span>
                <span
                  className="stat-value"
                  style={{ color: getWarningColor() }}
                >
                  {workload.utilizationPercentage}%
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Time Available:</span>
                <span className="stat-value">
                  {workload.weeksUntilDue} week
                  {workload.weeksUntilDue !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="workload-recommendations">
            <h4>💡 What Can You Do?</h4>
            <ul className="recommendation-list">
              {workload.utilizationPercentage > 100 && (
                <li>
                  Reduce the task hours or give them more time to complete it
                </li>
              )}
              {workload.utilizationPercentage >= 60 &&
                workload.utilizationPercentage <= 100 && (
                  <li>
                    Consider reducing task hours or extending the deadline -
                    only{" "}
                    {Math.round(
                      (workload.availableHours /
                        (workload.totalHours + workload.availableHours)) *
                        100
                    )}
                    % hours available
                  </li>
                )}
              {workload.allocationUtilization > 100 && (
                <li>Check how many hours they're assigned to this project</li>
              )}
              {workload.weeksUntilDue < 2 && (
                <li>Set a later due date to give them enough time</li>
              )}
              <li>
                Keep an eye on this person's workload over the next few days
              </li>
            </ul>
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              backgroundColor:
                warningLevel === "critical" ? "#fff5f5" : "#fffbeb",
              border: `2px solid ${getWarningColor()}`,
              borderRadius: "8px",
              fontSize: "0.95rem",
              lineHeight: "1.6",
              color: "#1f2937",
            }}
          >
            <strong style={{ color: getWarningColor(), fontSize: "1rem" }}>
              📝 Why am I seeing this warning?
            </strong>
            <p style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              {getSimpleExplanation()}
            </p>
          </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              warningLevel === "critical" ? "btn-danger" : "btn-warning"
            }
          >
            Create Task Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkloadWarningModal;
