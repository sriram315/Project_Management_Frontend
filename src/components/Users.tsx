import React, { useState, useEffect } from "react";
import axios from "axios";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import ConfirmationModal from "./ConfirmationModal";
import { API_BASE_URL } from "../services/api";

interface User {
  id: number;
  username: string;
  role: "super_admin" | "manager" | "team_lead" | "employee";
  email: string;
  available_hours_per_week?: number;
}

interface UsersProps {
  user?: any;
}

const Users: React.FC<UsersProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "",
    email: "",
    available_hours_per_week: 40,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const { toast, showToast, hideToast } = useToast();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    userId: number | null;
    username: string;
  }>({
    isOpen: false,
    userId: null,
    username: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (user?.id && (user?.role === 'manager' || user?.role === 'team_lead')) {
        params.append('userId', String(user.id));
        params.append('userRole', user.role);
      }
      const url = `${API_BASE_URL}/users${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await axios.get(url);
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const validateAddUserForm = () => {
    const errors: { [key: string]: string } = {};

    // Username validation
    if (!newUser.username.trim()) {
      errors.username = "Username is required";
    } else if (newUser.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(newUser.username)) {
      errors.username =
        "Username can only contain letters, numbers, dots, hyphens, and underscores";
    }

    // Password validation
    if (!newUser.password) {
      errors.password = "Password is required";
    } else if (newUser.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    // Email validation
    if (!newUser.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      errors.email = "Please enter a valid email address";
    } else {
      // Check if email already exists
      const emailExists = users.some(
        (user) => user.email.toLowerCase() === newUser.email.toLowerCase()
      );
      if (emailExists) {
        errors.email = "This email is already in use";
      }
    }

    // Role validation
    if (!newUser.role) {
      errors.role = "Role is required";
    }

    // Hours validation
    if (
      newUser.available_hours_per_week < 1 ||
      newUser.available_hours_per_week > 80
    ) {
      errors.available_hours_per_week = "Hours must be between 1 and 80";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAddUserForm()) {
      showToast("Please fix the validation errors", "error");
      return;
    }

    try {
      // Create user account only
      await axios.post(`${API_BASE_URL}/users`, {
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
        email: newUser.email,
        available_hours_per_week: newUser.available_hours_per_week,
      });

      setNewUser({
        username: "",
        password: "",
        role: "",
        email: "",
        available_hours_per_week: 40,
      });
      setFormErrors({});
      setShowAddForm(false);
      fetchUsers();
      showToast("User created successfully!", "success");
    } catch (error: any) {
      console.error("Error adding user:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to create user. Please try again.";
      showToast(errorMessage, "error");
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormErrors({});
    setShowEditForm(true);
  };

  const handleOpenAddForm = () => {
    setNewUser({
      username: "",
      password: "",
      role: "",
      email: "",
      available_hours_per_week: 40,
    });
    setFormErrors({});
    setShowAddForm(true);
  };

  const validateEditUserForm = () => {
    if (!editingUser) return false;
    const errors: { [key: string]: string } = {};

    // Username validation
    if (!editingUser.username.trim()) {
      errors.username = "Username is required";
    } else if (editingUser.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(editingUser.username)) {
      errors.username =
        "Username can only contain letters, numbers, dots, hyphens, and underscores";
    }
    else{

      const usernameExist = users.some(
        (user) =>
          user.username.toLowerCase() === editingUser.username.toLowerCase() &&
          user.id !== editingUser.id
      );
      if (usernameExist) {
        errors.username = "This Username is already in use";
      }

    }

    // Email validation
    if (!editingUser.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email)) {
      errors.email = "Please enter a valid email address";
    } else {
      // Check if email already exists (excluding current user)
      const emailExists = users.some(
        (user) =>
          user.email.toLowerCase() === editingUser.email.toLowerCase() &&
          user.id !== editingUser.id
      );
      if (emailExists) {
        errors.email = "This email is already in use";
      }
    }

    // Role validation
    if (!editingUser.role) {
      errors.role = "Role is required";
    }

    // Hours validation
    const hours = editingUser.available_hours_per_week || 40;
    if (hours < 1 || hours > 80) {
      errors.available_hours_per_week = "Hours must be between 1 and 80";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!validateEditUserForm()) {
      showToast("Please fix the validation errors", "error");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/users/${editingUser.id}`, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        available_hours_per_week: editingUser.available_hours_per_week,
      });

      setShowEditForm(false);
      setEditingUser(null);
      setFormErrors({});
      fetchUsers();
      showToast("User updated successfully!", "success");
    } catch (error: any) {
      console.error("Error updating user:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update user. Please try again.";
      showToast(errorMessage, "error");
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    setDeleteConfirmation({
      isOpen: true,
      userId,
      username,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.userId) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/users/${deleteConfirmation.userId}`
      );
      fetchUsers();
      showToast("User deleted successfully!", "success");
    } catch (error: any) {
      console.error("Error deleting user:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to delete user. Please try again.";
      showToast(errorMessage, "error");
    } finally {
      setDeleteConfirmation({ isOpen: false, userId: null, username: "" });
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, userId: null, username: "" });
  };

  const handleExportUsers = () => {
    const csvContent = [
      ["Username", "Email", "Role", "Available Hours/Week"],
      ...users.map((user) => [
        user.username,
        user.email,
        user.role,
        user.available_hours_per_week || 40,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Add UTF-8 BOM to ensure proper encoding
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImportUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the file input after reading
    const target = e.target;

    const reader = new FileReader();
    reader.onload = async (event) => {
      let csv = event.target?.result as string;

      // Remove BOM (Byte Order Mark) if present
      if (csv.charCodeAt(0) === 0xfeff) {
        csv = csv.substring(1);
      }

      // Split lines and filter out empty lines and lines with only commas/whitespace
      const lines = csv.split("\n").filter((line) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.match(/^[,\s]*$/);
      });

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Show loading toast
      showToast("Importing users from CSV...", "info");

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line properly (handle quoted values and commas within quotes)
        const line = lines[i].trim();

        // Skip empty lines or lines with only commas/whitespace
        if (!line || line.match(/^[,\s]*$/)) continue;

        // Better CSV parsing that handles quotes and commas correctly
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        // Check if we have at least 3 columns
        if (values.length < 3) {
          failedCount++;
          errors.push(
            `Line ${
              i + 1
            }: Invalid format - expected at least 3 columns (Username, Email, Role)`
          );
          continue;
        }

        // Check if all required fields have actual data (not just empty strings)
        const hasData = values
          .slice(0, 3)
          .some((val) => val.replace(/"/g, "").trim().length > 0);
        if (!hasData) {
          // This is an empty row, skip silently
          continue;
        }

        try {
          const userData = {
            username: values[0]?.replace(/"/g, "").trim() || "",
            email: values[1]?.replace(/"/g, "").trim() || "",
            role: values[2]?.replace(/"/g, "").trim() || "",
            password: "password123", // Default password
            available_hours_per_week: values[3]
              ? parseInt(values[3].replace(/"/g, "").trim())
              : 40,
          };

          // Validate username
          if (!userData.username || userData.username.length < 3) {
            failedCount++;
            errors.push(
              `Line ${i + 1}: Invalid username "${
                userData.username
              }" (min 3 characters)`
            );
            continue;
          }

          // Validate username format
          if (!/^[a-zA-Z0-9_.-]+$/.test(userData.username)) {
            failedCount++;
            errors.push(
              `Line ${i + 1}: Username "${
                userData.username
              }" contains invalid characters`
            );
            continue;
          }

          // Validate email
          if (
            !userData.email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)
          ) {
            failedCount++;
            errors.push(`Line ${i + 1}: Invalid email "${userData.email}"`);
            continue;
          }

          // Validate role
          const validRoles = ["manager", "team_lead", "employee"];
          if (!validRoles.includes(userData.role)) {
            failedCount++;
            errors.push(
              `Line ${i + 1}: Invalid role "${
                userData.role
              }" (must be: manager, team_lead, or employee)`
            );
            continue;
          }

          // Validate hours
          if (
            userData.available_hours_per_week < 1 ||
            userData.available_hours_per_week > 80
          ) {
            failedCount++;
            errors.push(
              `Line ${i + 1}: Invalid hours "${
                userData.available_hours_per_week
              }" (must be 1-80)`
            );
            continue;
          }

          // Try to create user - API will check for duplicates
          try {
            await axios.post(`${API_BASE_URL}/users`, {
              username: userData.username,
              password: userData.password,
              role: userData.role,
              email: userData.email,
              available_hours_per_week: userData.available_hours_per_week,
            });

            successCount++;
          } catch (error: any) {
            failedCount++;

            // Extract detailed error message from API response
            if (error.response?.data) {
              const { message, type, field } = error.response.data;

              // Handle specific error types
              if (type === "duplicate_username") {
                errors.push(
                  `Line ${i + 1}: Username "${
                    userData.username
                  }" already exists`
                );
              } else if (type === "duplicate_email") {
                errors.push(
                  `Line ${i + 1}: Email "${userData.email}" already exists`
                );
              } else if (message) {
                // Use the exact message from API
                errors.push(`Line ${i + 1}: ${message}`);
              } else {
                errors.push(`Line ${i + 1}: Failed to create user`);
              }
            } else {
              // Network or other errors
              const errorMsg = error.message || "Unknown error";
              errors.push(`Line ${i + 1}: ${errorMsg}`);
            }
          }
        } catch (error: any) {
          // Outer catch for parsing errors
          failedCount++;
          const errorMsg = error.message || "Failed to parse user data";
          errors.push(`Line ${i + 1}: ${errorMsg}`);
        }
      }

      // Refresh users list
      await fetchUsers();

      // Reset file input
      target.value = "";

      // Show detailed results in toast
      if (successCount > 0 && failedCount === 0) {
        showToast(
          `✅ Successfully imported ${successCount} user(s)!`,
          "success"
        );
      } else if (successCount > 0 && failedCount > 0) {
        showToast(
          `⚠️ Imported ${successCount} user(s), ${failedCount} failed. Check console for details.`,
          "warning"
        );
        console.error("Import errors:", errors);
      } else if (failedCount > 0) {
        showToast(
          `❌ Import failed: ${failedCount} user(s) had errors. Check console for details.`,
          "error"
        );
        console.error("Import errors:", errors);
      } else {
        showToast("⚠️ No users found in CSV file", "warning");
      }
    };

    reader.onerror = () => {
      showToast("❌ Failed to read CSV file", "error");
      target.value = "";
    };

    // Read file with UTF-8 encoding to prevent character corruption
    reader.readAsText(file, "UTF-8");
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ["Username", "Email", "Role", "Available Hours/Week"],
      ["john.doe", "john.doe@company.com", "employee", "40"],
      ["jane.smith", "jane.smith@company.com", "team_lead", "45"],
      ["mike.johnson", "mike.johnson@company.com", "employee", "35"],
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Add UTF-8 BOM to ensure proper encoding
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + sampleData], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="users-page">
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "#000",
              marginBottom: "0.5rem",
            }}
          >
            Users Management
          </h1>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.95rem",
              marginTop: "0.25rem",
            }}
          >
            Manage and organize your team members
          </p>
        </div>
        <div
          className="header-actions"
          style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
        >
          <input
            type="text"
            placeholder="Search users by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{
              padding: "0.65rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              width: "280px",
              fontSize: "0.9rem",
            }}
          />
          {user?.role === 'super_admin' && (
            <button
              onClick={handleOpenAddForm}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                backgroundColor: "#6366f1",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>+</span>
              Add User
            </button>
          )}
          {user?.role === 'super_admin' && (
            <button
              onClick={handleExportUsers}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                backgroundColor: "white",
                color: "#374151",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1rem" }}>⬇</span>
              Export
            </button>
          )}
          {user?.role === 'super_admin' && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                backgroundColor: "white",
                color: "#374151",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1rem" }}>⬆</span>
              Import
              <input
                type="file"
                accept=".csv"
                onChange={handleImportUsers}
                style={{ display: "none" }}
              />
            </label>
          )}
          <button
            onClick={downloadSampleCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.25rem",
              backgroundColor: "white",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: "1rem" }}>📄</span>
            Sample
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "550px" }}>
            <div
              className="modal-header"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                margin: "-2rem -2rem 1.5rem -2rem",
                padding: "1.5rem 2rem",
                borderRadius: "12px 12px 0 0",
              }}
            >
              <h2 style={{ margin: 0, color: "white" }}>Add New User</h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormErrors({});
                }}
                className="close-btn"
                style={{ color: "white" }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddUser} className="user-form">
              <div className="form-group">
                <label>
                  Username: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  style={{
                    borderColor: formErrors.username ? "#ef4444" : "#e1e8ed",
                  }}
                  placeholder="Enter username"
                />
                {formErrors.username && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.username}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>
                  Password: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  style={{
                    borderColor: formErrors.password ? "#ef4444" : "#e1e8ed",
                  }}
                  placeholder="Enter password (min 6 characters)"
                />
                {formErrors.password && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.password}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>
                  Email: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  style={{
                    borderColor: formErrors.email ? "#ef4444" : "#e1e8ed",
                  }}
                  placeholder="user@example.com"
                />
                {formErrors.email && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.email}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>
                  Role: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  style={{
                    borderColor: formErrors.role ? "#ef4444" : "#e1e8ed",
                  }}
                >
                  <option value="">Select Role</option>
                  <option value="manager">Manager</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="employee">Employee</option>
                </select>
                {formErrors.role && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.role}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>
                  Available Hours per Week:{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={newUser.available_hours_per_week}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      available_hours_per_week: parseInt(e.target.value) || 40,
                    })
                  }
                  style={{
                    borderColor: formErrors.available_hours_per_week
                      ? "#ef4444"
                      : "#e1e8ed",
                  }}
                  placeholder="40"
                />
                {formErrors.available_hours_per_week && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.available_hours_per_week}
                  </small>
                )}
                <small className="form-help">
                  Default weekly working hours for this user (1-80 hours)
                </small>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-enterprise btn-primary">
                  <span className="btn-icon">✅</span>
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormErrors({});
                  }}
                  className="btn-enterprise btn-secondary"
                >
                  <span className="btn-icon">❌</span>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        className="users-table-container"
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          maxHeight: "600px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ overflow: "auto", flex: 1 }}>
          <table
            className="users-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr
                style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    color: "#374151",
                    textTransform: "none",
                  }}
                >
                  User
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    color: "#374151",
                    textTransform: "none",
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    color: "#374151",
                    textTransform: "none",
                  }}
                >
                  Role
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    color: "#374151",
                    textTransform: "none",
                  }}
                >
                  Hours/Week
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    color: "#374151",
                    textTransform: "none",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "600",
                          fontSize: "0.875rem",
                          flexShrink: 0,
                        }}
                      >
                        {user.username
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: "500",
                            color: "#111827",
                            fontSize: "0.9rem",
                          }}
                        >
                          {user.username}
                        </div>
                        <div
                          style={{
                            color: "#6b7280",
                            fontSize: "0.8rem",
                            marginTop: "0.125rem",
                          }}
                        >
                          @{(user.email || "").split("@")[0]}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "#374151",
                        fontSize: "0.875rem",
                      }}
                    >
                      <span>✉️</span>
                      {user.email}
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.375rem 0.75rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        backgroundColor:
                          user.role === "manager"
                            ? "#d1fae5"
                            : user.role === "team_lead"
                            ? "#fef3c7"
                            : "#dbeafe",
                        color:
                          user.role === "manager"
                            ? "#065f46"
                            : user.role === "team_lead"
                            ? "#92400e"
                            : "#1e40af",
                      }}
                    >
                      {user.role === "manager"
                        ? "Manager"
                        : user.role === "team_lead"
                        ? "Team Lead"
                        : "Employee"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "#374151",
                        fontSize: "0.875rem",
                      }}
                    >
                      <span>🕒</span>
                      {user.available_hours_per_week || 40}h/week
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {user?.role === 'super_admin' && (
                        <>
                          <button
                            onClick={() => handleEditUser(user)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.5rem 0.875rem",
                              backgroundColor: "white",
                              color: "#374151",
                              border: "1px solid #e5e7eb",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                              fontWeight: "500",
                              transition: "all 0.2s",
                            }}
                          >
                            <span style={{ fontSize: "0.875rem" }}>✏️</span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              padding: "0.5rem 0.875rem",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                              fontWeight: "500",
                              transition: "all 0.2s",
                            }}
                          >
                            <span style={{ fontSize: "0.875rem" }}>🗑️</span>
                            Delete
                          </button>
                        </>
                      )}
                      {user?.role !== 'super_admin' && (
                        <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>View only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div
            style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}
          >
            <p>No users found. Try adjusting your search or add new users.</p>
          </div>
        )}
      </div>

      {showEditForm && editingUser && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "550px" }}>
            <div
              className="modal-header"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                margin: "-2rem -2rem 1.5rem -2rem",
                padding: "1.5rem 2rem",
                borderRadius: "12px 12px 0 0",
              }}
            >
              <h2 style={{ margin: 0, color: "white" }}>Edit User</h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingUser(null);
                  setFormErrors({});
                }}
                className="close-btn"
                style={{ color: "white" }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="user-form">
              <div className="form-group">
                <label>
                  Username: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                  style={{
                    borderColor: formErrors.username ? "#ef4444" : "#e1e8ed",
                  }}
                  placeholder="Enter username"
                />
                {formErrors.username && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.username}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>
                  Email: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  style={{
                    borderColor: formErrors.email ? "#ef4444" : "#e1e8ed",
                  }}
                  placeholder="user@example.com"
                />
                {formErrors.email && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.email}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>
                  Role: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value as
                        | "manager"
                        | "team_lead"
                        | "employee",
                    })
                  }
                  style={{
                    borderColor: formErrors.role ? "#ef4444" : "#e1e8ed",
                  }}
                >
                  <option value="">Select Role</option>
                  <option value="manager">Manager</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="employee">Employee</option>
                </select>
                {formErrors.role && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.role}
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>
                  Available Hours per Week:{" "}
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={editingUser.available_hours_per_week || 40}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      available_hours_per_week: parseInt(e.target.value) || 40,
                    })
                  }
                  style={{
                    borderColor: formErrors.available_hours_per_week
                      ? "#ef4444"
                      : "#e1e8ed",
                  }}
                  placeholder="40"
                />
                {formErrors.available_hours_per_week && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      display: "block",
                    }}
                  >
                    {formErrors.available_hours_per_week}
                  </small>
                )}
                <small className="form-help">
                  Default weekly working hours for this user (1-80 hours)
                </small>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-enterprise btn-primary">
                  <span className="btn-icon">✅</span>
                  Update User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingUser(null);
                    setFormErrors({});
                  }}
                  className="btn-enterprise btn-secondary"
                >
                  <span className="btn-icon">❌</span>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete User"
        message={`Are you sure you want to delete "${deleteConfirmation.username}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />
    </div>
  );
};

export default Users;
