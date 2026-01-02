
import React, { useState, useEffect } from "react";
import { taskAPI } from "../services/api";
import { Task, DailyUpdate } from "../types";
import "../App.css";

interface TaskDetailsModalProps {
  task: any; // Allow any task shape to handle variations (title vs name, assignee string vs id)
  onClose: () => void;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, onClose }) => {
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [fullTask, setFullTask] = useState<Task>(task); // Initialize with passed task

  // Fetch full task details
  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        const details = await taskAPI.getById(task.id);
        if (details) {
          setFullTask(prev => ({ ...prev, ...details }));
        }
      } catch (err) {
        console.error("Error fetching task details:", err);
      }
    };
    fetchTaskDetails();
  }, [task.id]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Helper function to format date
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "N/A";
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";

    // Parse the date string - Backend returns IST time (UTC+5:30)
    let date: Date;
    if (
      dateString.includes("T") ||
      dateString.includes("Z") ||
      dateString.includes("+")
    ) {
      // ISO format with timezone
      date = new Date(dateString);
    } else {
      // MySQL datetime format - add IST timezone offset
      date = new Date(dateString.replace(" ", "T") + "+05:30");
    }

    if (isNaN(date.getTime())) return "Invalid date";

    const dateStr = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });

    return `${dateStr} at ${timeStr}`;
  };

  // Fetch daily updates when component loads
  useEffect(() => {
    const fetchDailyUpdates = async () => {
      setLoadingUpdates(true);
      try {
        const updates = await taskAPI.getDailyUpdates(task.id);
        setDailyUpdates(updates);
      } catch (err) {
        console.error("Error fetching daily updates:", err);
      } finally {
        setLoadingUpdates(false);
      }
    };

    fetchDailyUpdates();
  }, [task.id]);

  const statusConfig =
    fullTask.status === "completed"
      ? { color: "#10b981", bg: "#d1fae5", label: "Completed" }
      : fullTask.status === "in_progress"
      ? { color: "#06b6d4", bg: "#cffafe", label: "In Progress" }
      : fullTask.status === "blocked"
      ? { color: "#ef4444", bg: "#fee2e2", label: "Blocked" }
      : { color: "#6366f1", bg: "#e0e7ff", label: "To Do" };

  return (
    <div className="modal-overlay">
      <div
        className="modal"
        style={{
          maxWidth: "700px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        <div
          className="modal-header"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "1.5rem 2rem",
            borderRadius: "12px 12px 0 0",
            position: "sticky",
            top: 0,
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, color: "white" }}>Task Details</h2>
          <button
            className="close-btn"
            onClick={onClose}
            style={{ color: "white" }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: "1.5rem 2rem 2rem 2rem",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div className="task-details-content">
            <div className="form-group">
              <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Task Name</label>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#111827", marginTop: "0.25rem" }}>
                {fullTask.name}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Description</label>
              <div style={{ fontSize: "0.95rem", color: "#374151", marginTop: "0.25rem", whiteSpace: "pre-wrap", background: "#f9fafb", padding: "0.75rem", borderRadius: "0.375rem" }}>
                {fullTask.description || "No description provided."}
              </div>
            </div>

            {(fullTask.work_description || (fullTask as any).completion_note) && (
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Completion Note</label>
                <div style={{ fontSize: "0.95rem", color: "#374151", marginTop: "0.25rem", whiteSpace: "pre-wrap", background: "#f0fdf4", padding: "0.75rem", borderRadius: "0.375rem", border: "1px solid #dcfce7" }}>
                  {fullTask.work_description || (fullTask as any).completion_note}
                </div>
              </div>
            )}

            <div className="form-row" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Project</label>
                <div style={{ fontSize: "0.95rem", color: "#111827", marginTop: "0.25rem" }}>
                   {/* We might not have project name directly in task object sometimes, depending on the API response, but usually it's there or we can show ID */}
                   {/* In Dashboard, the task object might have project name if joined, let's check. 
                       Actually Dashboard tasks usually have project_id. The name might not be easily available without looking up projects.
                       For now, let's assume we display what we have or generic if missing.
                   */}
                   Project #{fullTask.project_id}
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Assignee</label>
                <div style={{ fontSize: "0.95rem", color: "#111827", marginTop: "0.25rem" }}>
                  {fullTask.assignee_name || (fullTask as any).assignee || (fullTask as any).username || "Unassigned"}
                </div>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Status</label>
                <div style={{ marginTop: "0.25rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color,
                      textTransform: "capitalize"
                    }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Priority</label>
                <div style={{ fontSize: "0.95rem", color: "#111827", marginTop: "0.25rem", textTransform: "capitalize" }}>
                  {fullTask.priority || "N/A"}
                </div>
              </div>
              
              <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Type</label>
                <div style={{ fontSize: "0.95rem", color: "#111827", marginTop: "0.25rem", textTransform: "capitalize" }}>
                  {fullTask.task_type || "Development"}
                </div>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Start Date</label>
                <div style={{ fontSize: "0.95rem", color: "#111827", marginTop: "0.25rem" }}>
                  {formatDate((fullTask as any).start_date)}
                </div>
              </div>

              <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Due Date</label>
                <div style={{ fontSize: "0.95rem", color: "#111827", marginTop: "0.25rem" }}>
                  {formatDate(fullTask.due_date)}
                </div>
              </div>
            </div>
            
             <div className="form-row" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
               <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Estimated Hours</label>
                <div style={{ fontSize: "0.95rem", color: "#111827", marginTop: "0.25rem" }}>
                  {fullTask.planned_hours || 0} hrs
                </div>
              </div>
               <div className="form-group">
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Actual Hours</label>
                <div style={{ fontSize: "0.95rem", color: "#111827", marginTop: "0.25rem" }}>
                  {fullTask.actual_hours || 0} hrs
                </div>
              </div>
             </div>

            {fullTask.attachments && (
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label style={{ color: "#6b7280", fontSize: "0.875rem", fontWeight: 500 }}>Attachments</label>
                 <div style={{ fontSize: "0.95rem", color: "#2563eb", marginTop: "0.25rem" }}>
                   <a href="#" target="_blank" rel="noopener noreferrer">{fullTask.attachments}</a>
                </div>
              </div>
            )}

            {/* Daily Updates Section */}
            <div
              className="form-group"
              style={{
                marginTop: "2rem",
                paddingTop: "2rem",
                borderTop: "2px solid #e1e8ed",
              }}
            >
              <h3
                className="text-foreground"
                style={{ marginBottom: "1rem", fontSize: "1.2rem" }}
              >
                Update History
              </h3>
              
              <div style={{ marginTop: "1rem" }}>
                {loadingUpdates ? (
                  <div
                    className="text-muted-foreground"
                    style={{ padding: "1rem", textAlign: "center" }}
                  >
                    Loading updates...
                  </div>
                ) : dailyUpdates.length === 0 ? (
                  <div
                    className="text-muted-foreground bg-gray-50"
                    style={{
                      padding: "1.5rem",
                      textAlign: "center",
                      borderRadius: "4px",
                      border: "1px dashed #e1e8ed",
                    }}
                  >
                    No daily updates recorded.
                  </div>
                ) : (
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {dailyUpdates.map((update) => (
                      <div
                        key={update.id}
                        style={{
                          padding: "1rem",
                          marginBottom: "0.75rem",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "6px",
                          border: "1px solid #e1e8ed",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <strong
                              className="text-foreground"
                              style={{ fontSize: "0.95rem" }}
                            >
                              {update.user_name ||
                                update.username ||
                                "Unknown User"}
                            </strong>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <span
                              style={{
                                color: "#6b7280",
                                fontSize: "0.85rem",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatDateTime(update.created_at)}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            color: "#444",
                            fontSize: "0.9rem",
                            lineHeight: "1.5",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {update.comment}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-actions" style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
               <button
                type="button"
                onClick={onClose}
                className="btn-enterprise btn-secondary"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;
