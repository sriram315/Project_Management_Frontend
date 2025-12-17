import React, { useState, useEffect } from "react";
import axios from "axios";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import ConfirmationModal from "./ConfirmationModal";
import { API_BASE_URL, userAPI } from "../services/api";
import { PencilIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/outline";

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

const Users: React.FC<UsersProps> = ({ user: currentUser }) => {
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
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    userId: number | null;
    username: string;
  }>({
    isOpen: false,
    userId: null,
    username: "",
  });
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [employeeProjects, setEmployeeProjects] = useState<any[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [loadingEmployeeDetails, setLoadingEmployeeDetails] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset form when Add User form is opened
  useEffect(() => {
    if (showAddForm) {
      setNewUser({
        username: "",
        password: "",
        role: "",
        email: "",
        available_hours_per_week: 40,
      });
      setFormErrors({});
      setShowPassword(false);
    }
  }, [showAddForm]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (
        currentUser?.id &&
        (currentUser?.role === "manager" || currentUser?.role === "team_lead")
      ) {
        params.append("userId", String(currentUser.id));
        params.append("userRole", currentUser.role);
      }
      const url = `${API_BASE_URL}/users${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const response = await axios.get(url);
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const validateAddUserForm = () => {
    const errors: { [key: string]: string } = {};

    // Username validation (First/Last Name)
    if (!newUser.username.trim()) {
      errors.username = "Name is required";
    } else if (newUser.username.trim().length < 3) {
      errors.username = "Name must be at least 3 characters";
    } else if (!/^[a-zA-Z\s'-]+$/.test(newUser.username.trim())) {
      errors.username =
        "Name can only contain letters, spaces, hyphens, and apostrophes";
    } else if (newUser.username.trim().split(/\s+/).length < 2) {
      errors.username = "Please enter both first and last name";
    }

    // Password validation: 8-15 chars, at least 1 upper, 1 lower, 1 special
    if (!newUser.password) {
      errors.password = "Password is required";
    } else {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>\/?`~]).{8,15}$/;
      if (!passwordRegex.test(newUser.password)) {
        errors.password =
          "Password must be 8-15 characters, include at least one uppercase, one lowercase, and one special character";
      }
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
      const errorResponse = error.response?.data;
      const errorMessage =
        errorResponse?.message || "Failed to create user. Please try again.";
      const errorField = errorResponse?.field;

      // If the backend specifies which field has the error, set it in formErrors
      if (errorField && (errorField === "username" || errorField === "email")) {
        setFormErrors({
          [errorField]: errorMessage,
        });
        showToast(errorMessage, "error");
      } else {
        // Generic error - show in toast
        showToast(errorMessage, "error");
      }
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
    setShowPassword(false);
    setShowAddForm(true);
  };

  const validateEditUserForm = () => {
    if (!editingUser) return false;
    const errors: { [key: string]: string } = {};

    // Username validation (First/Last Name)
    if (!editingUser.username.trim()) {
      errors.username = "Name is required";
    } else if (editingUser.username.trim().length < 3) {
      errors.username = "Name must be at least 3 characters";
    } else if (!/^[a-zA-Z\s'-]+$/.test(editingUser.username.trim())) {
      errors.username =
        "Name can only contain letters, spaces, hyphens, and apostrophes";
    } else if (editingUser.username.trim().split(/\s+/).length < 2) {
      errors.username = "Please enter both first and last name";
    } else {
      const usernameExist = users.some(
        (user) =>
          user.username.toLowerCase() === editingUser.username.toLowerCase() &&
          user.id !== editingUser.id
      );
      if (usernameExist) {
        errors.username = "This name is already in use";
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
      const errorResponse = error.response?.data;
      const errorMessage =
        errorResponse?.message || "Failed to update user. Please try again.";
      const errorField = errorResponse?.field;

      // If the backend specifies which field has the error, set it in formErrors
      if (errorField && (errorField === "username" || errorField === "email")) {
        setFormErrors({
          [errorField]: errorMessage,
        });
        showToast(errorMessage, "error");
      } else {
        // Generic error - show in toast
        showToast(errorMessage, "error");
      }
    }
  };

  const handleViewEmployeeDetails = async (user: User) => {
    setViewingUser(user);
    setShowViewModal(true);
    setLoadingEmployeeDetails(true);
    setEmployeeProjects([]);
    setEmployeeTasks([]);

    try {
      const [projects, tasks] = await Promise.all([
        userAPI.getUserProjects(user.id).catch(() => []), // Return empty array on error
        userAPI.getUserTasks(user.id).catch(() => []), // Return empty array on error
      ]);
      setEmployeeProjects(projects || []);
      setEmployeeTasks(tasks || []);
    } catch (err: any) {
      console.error("Error fetching user details:", err);
      showToast("Failed to load user details", "error");
    } finally {
      setLoadingEmployeeDetails(false);
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
      await axios.delete(`${API_BASE_URL}/users/${deleteConfirmation.userId}`);
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
              marginBottom: "0.5rem",
              color: "white",
            }}
          >
            Users Management
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              marginTop: "0.25rem",
              color: "rgba(255, 255, 255, 0.9)",
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
            className="search-input bg-background"
            style={{
              padding: "0.65rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              width: "280px",
              fontSize: "0.9rem",
            }}
          />
          {currentUser?.role === "super_admin" && (
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
          {currentUser?.role === "super_admin" && (
            <button
              onClick={handleExportUsers}
              className="bg-white"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                transition: "all 0.2s",
                color: "#374151",
              }}
            >
              <span style={{ fontSize: "1rem" }}>⬇</span>
              Export
            </button>
          )}
          {currentUser?.role === "super_admin" && (
            <label
              className="bg-white"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1.25rem",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                transition: "all 0.2s",
                color: "#374151",
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
            className="bg-white"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.25rem",
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
                margin: 0,
                borderRadius: "12px 12px 0 0",
              }}
            >
              <h2 style={{ margin: 0, color: "white" }}>Add New User</h2>
              <button
                onClick={() => {
                  setNewUser({
                    username: "",
                    password: "",
                    role: "",
                    email: "",
                    available_hours_per_week: 40,
                  });
                  setFormErrors({});
                  setShowPassword(false);
                  setShowAddForm(false);
                }}
                className="close-btn"
                style={{ color: "white" }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                key="add-user-form"
                onSubmit={handleAddUser}
                className="user-form"
              >
              <div className="form-group">
                <label>
                  Username: <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => {
                    setNewUser({ ...newUser, username: e.target.value });
                    // Clear username error when user starts typing
                    if (formErrors.username) {
                      setFormErrors({ ...formErrors, username: "" });
                    }
                  }}
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
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    style={{
                      borderColor: formErrors.password ? "#ef4444" : "#e1e8ed",
                      paddingRight: "2.5rem",
                      width: "100%",
                    }}
                    placeholder="8-15 chars, 1 upper, 1 lower, 1 special"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "0.5rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#666",
                      fontSize: "1.1rem",
                      width: "1.5rem",
                      height: "1.5rem",
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
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
                  onChange={(e) => {
                    setNewUser({ ...newUser, email: e.target.value });
                    // Clear email error when user starts typing
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: "" });
                    }
                  }}
                  style={{
                    borderColor: formErrors.email ? "#ef4444" : "#e1e8ed",
                  }}
                  placeholder="user@example.com"
                  autoComplete="off"
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
                  <option value="employee">Team Member</option>
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
                    setNewUser({
                      username: "",
                      password: "",
                      role: "",
                      email: "",
                      available_hours_per_week: 40,
                    });
                    setFormErrors({});
                    setShowPassword(false);
                    setShowAddForm(false);
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
        </div>
      )}

      <div
        className="users-table-container bg-white"
        style={{
          borderRadius: "0.5rem",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          boxShadow:
            "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
          maxHeight: "600px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ overflow: "auto", flex: 1 }}>
          <table
            className="users-table"
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
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
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  Role
                </th>
                <th
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  Hours/Week
                </th>
                <th
                  style={{
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#6b7280",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    transition: "background-color 0.15s ease-in-out",
                    backgroundColor: "#ffffff",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <td style={{ padding: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          borderRadius: "9999px",
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
                            fontSize: "0.875rem",
                            color: "#111827",
                            lineHeight: "1.25rem",
                          }}
                        >
                          {user.username}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            marginTop: "0.125rem",
                          }}
                        >
                          @{(user.email || "").split("@")[0]}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#374151",
                      }}
                    >
                      <span style={{ fontSize: "0.875rem" }}>✉️</span>
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0.25rem 0.625rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        backgroundColor:
                          user.role === "manager"
                            ? "#d1fae5"
                            : user.role === "team_lead"
                            ? "#fef3c7"
                            : user.role === "super_admin"
                            ? "#ede9fe"
                            : "#dbeafe",
                        color:
                          user.role === "manager"
                            ? "#065f46"
                            : user.role === "team_lead"
                            ? "#92400e"
                            : user.role === "super_admin"
                            ? "#5b21b6"
                            : "#1e40af",
                      }}
                    >
                      {user.role === "manager"
                        ? "Manager"
                        : user.role === "team_lead"
                        ? "Team Lead"
                        : user.role === "super_admin"
                        ? "Super Admin"
                        : "Team Member"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        color: "#374151",
                      }}
                    >
                      <span style={{ fontSize: "0.875rem" }}>🕒</span>
                      <span>{user.available_hours_per_week || 40}h/week</span>
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {currentUser?.role === "super_admin" &&
                      user.role !== "super_admin" ? (
                        <>
                          <button
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "2rem",
                              height: "2rem",
                              padding: "0",
                              backgroundColor: "#ffffff",
                              color: "#374151",
                              border: "1px solid #d1d5db",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              transition: "all 0.2s ease-in-out",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f9fafb";
                              e.currentTarget.style.borderColor = "#9ca3af";
                              e.currentTarget.style.color = "#111827";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#ffffff";
                              e.currentTarget.style.borderColor = "#d1d5db";
                              e.currentTarget.style.color = "#374151";
                            }}
                          >
                            <PencilIcon
                              style={{ width: "1rem", height: "1rem" }}
                            />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteUser(user.id, user.username)
                            }
                            title="Delete User"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "2rem",
                              height: "2rem",
                              padding: "0",
                              backgroundColor: "#ef4444",
                              color: "#ffffff",
                              border: "1px solid #ef4444",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              transition: "all 0.2s ease-in-out",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#dc2626";
                              e.currentTarget.style.borderColor = "#dc2626";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#ef4444";
                              e.currentTarget.style.borderColor = "#ef4444";
                            }}
                          >
                            <TrashIcon
                              style={{ width: "1rem", height: "1rem" }}
                            />
                          </button>
                          <button
                            onClick={() => handleViewEmployeeDetails(user)}
                            title="View User Details"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "2rem",
                              height: "2rem",
                              padding: "0",
                              backgroundColor: "#6366f1",
                              color: "#ffffff",
                              border: "1px solid #6366f1",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                              transition: "all 0.2s ease-in-out",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#4f46e5";
                              e.currentTarget.style.borderColor = "#4f46e5";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#6366f1";
                              e.currentTarget.style.borderColor = "#6366f1";
                            }}
                          >
                            <EyeIcon
                              style={{ width: "1rem", height: "1rem" }}
                            />
                          </button>
                        </>
                      ) : currentUser?.role === "super_admin" &&
                        user.role === "super_admin" ? (
                        <button
                          onClick={() => handleViewEmployeeDetails(user)}
                          title="View User Details"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "2rem",
                            height: "2rem",
                            padding: "0",
                            backgroundColor: "#6366f1",
                            color: "#ffffff",
                            border: "1px solid #6366f1",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease-in-out",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#4f46e5";
                            e.currentTarget.style.borderColor = "#4f46e5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#6366f1";
                            e.currentTarget.style.borderColor = "#6366f1";
                          }}
                        >
                          <EyeIcon style={{ width: "1rem", height: "1rem" }} />
                        </button>
                      ) : (currentUser?.role === "manager" &&
                          (user.role === "employee" ||
                            user.role === "team_lead")) ||
                        (currentUser?.role === "team_lead" &&
                          user.role === "employee") ? (
                        <button
                          onClick={() => handleViewEmployeeDetails(user)}
                          title="View User Details"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "2rem",
                            height: "2rem",
                            padding: "0",
                            backgroundColor: "#6366f1",
                            color: "#ffffff",
                            border: "1px solid #6366f1",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease-in-out",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#4f46e5";
                            e.currentTarget.style.borderColor = "#4f46e5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#6366f1";
                            e.currentTarget.style.borderColor = "#6366f1";
                          }}
                        >
                          <EyeIcon style={{ width: "1rem", height: "1rem" }} />
                        </button>
                      ) : (
                        <span
                          style={{ color: "#9ca3af", fontSize: "0.875rem" }}
                        >
                          View only
                        </span>
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
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "#6b7280",
              backgroundColor: "#ffffff",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: "400",
                color: "#6b7280",
              }}
            >
              No users found. Try adjusting your search or add new users.
            </p>
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
                  onChange={(e) => {
                    setEditingUser({
                      ...editingUser,
                      username: e.target.value,
                    });
                    // Clear username error when user starts typing
                    if (formErrors.username) {
                      setFormErrors({ ...formErrors, username: "" });
                    }
                  }}
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
                  onChange={(e) => {
                    setEditingUser({ ...editingUser, email: e.target.value });
                    // Clear email error when user starts typing
                    if (formErrors.email) {
                      setFormErrors({ ...formErrors, email: "" });
                    }
                  }}
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
                  <option value="employee">Team Member</option>
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

      {/* User Details Modal */}
      {showViewModal && viewingUser && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                margin: "-2rem -2rem 1.5rem -2rem",
                padding: "1.5rem 2rem",
                borderRadius: "12px 12px 0 0",
                position: "relative",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>
                User Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
              >
                ×
              </button>
            </div>

            {loadingEmployeeDetails ? (
              <div
                className="text-foreground"
                style={{ padding: "2rem", textAlign: "center" }}
              >
                <p>Loading user details...</p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem",
                }}
              >
                {/* Basic Information */}
                <div>
                  <h3
                    className="text-foreground"
                    style={{
                      marginBottom: "1rem",
                      fontSize: "1.125rem",
                      fontWeight: 600,
                    }}
                  >
                    Basic Information
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label
                        className="text-muted-foreground"
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          marginBottom: "0.25rem",
                        }}
                      >
                        Username
                      </label>
                      <div
                        className="bg-gray-50 text-foreground"
                        style={{ padding: "0.5rem", borderRadius: "6px" }}
                      >
                        {viewingUser.username}
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-muted-foreground"
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          marginBottom: "0.25rem",
                        }}
                      >
                        Email
                      </label>
                      <div
                        className="bg-gray-50 text-foreground"
                        style={{ padding: "0.5rem", borderRadius: "6px" }}
                      >
                        {viewingUser.email || "N/A"}
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-muted-foreground"
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          marginBottom: "0.25rem",
                        }}
                      >
                        Role
                      </label>
                      <div
                        className="bg-gray-50 text-foreground"
                        style={{
                          padding: "0.5rem",
                          borderRadius: "6px",
                          textTransform: "capitalize",
                        }}
                      >
                        {viewingUser.role.replace("_", " ")}
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-muted-foreground"
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          marginBottom: "0.25rem",
                        }}
                      >
                        Available Hours/Week
                      </label>
                      <div
                        className="bg-gray-50 text-foreground"
                        style={{ padding: "0.5rem", borderRadius: "6px" }}
                      >
                        {viewingUser.available_hours_per_week || 40} hours
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assigned Projects */}
                <div>
                  <h3
                    className="text-foreground"
                    style={{
                      marginBottom: "1rem",
                      fontSize: "1.125rem",
                      fontWeight: 600,
                    }}
                  >
                    Assigned Projects ({employeeProjects.length})
                  </h3>
                  {employeeProjects.length > 0 ? (
                    <div
                      className="border-gray-200"
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              className="text-muted-foreground"
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Project Name
                            </th>
                            <th
                              className="text-muted-foreground"
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Status
                            </th>
                            <th
                              className="text-muted-foreground"
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Allocated Hours/Week
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeProjects.map((project: any) => (
                            <tr
                              key={project.id}
                              className="border-gray-200"
                              style={{ borderBottom: "1px solid #f3f4f6" }}
                            >
                              <td
                                className="text-foreground"
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {project.name}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                <span
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    textTransform: "capitalize",
                                    backgroundColor:
                                      project.status === "active"
                                        ? "#d1fae5"
                                        : project.status === "completed"
                                        ? "#dbeafe"
                                        : "#f3f4f6",
                                    color:
                                      project.status === "active"
                                        ? "#065f46"
                                        : project.status === "completed"
                                        ? "#1e40af"
                                        : "#6b7280",
                                  }}
                                >
                                  {project.status}
                                </span>
                              </td>
                              <td
                                className="text-foreground"
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {project.allocated_hours_per_week || "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      className="bg-gray-50 text-muted-foreground"
                      style={{
                        padding: "1.5rem",
                        textAlign: "center",
                        borderRadius: "8px",
                      }}
                    >
                      No projects assigned
                    </div>
                  )}
                </div>

                {/* Assigned Tasks */}
                <div>
                  <h3
                    className="text-foreground"
                    style={{
                      marginBottom: "1rem",
                      fontSize: "1.125rem",
                      fontWeight: 600,
                    }}
                  >
                    Assigned Tasks ({employeeTasks.length})
                  </h3>
                  {employeeTasks.length > 0 ? (
                    <div
                      className="border-gray-200"
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              className="text-muted-foreground"
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Task Name
                            </th>
                            <th
                              className="text-muted-foreground"
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Project
                            </th>
                            <th
                              className="text-muted-foreground"
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Status
                            </th>
                            <th
                              className="text-muted-foreground"
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Planned Hours
                            </th>
                            <th
                              className="text-muted-foreground"
                              style={{
                                padding: "0.75rem",
                                textAlign: "left",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Due Date
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeTasks.map((task: any) => (
                            <tr
                              key={task.id}
                              className="border-gray-200"
                              style={{ borderBottom: "1px solid #f3f4f6" }}
                            >
                              <td
                                className="text-foreground"
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {task.name}
                              </td>
                              <td
                                className="text-foreground"
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {task.project_name || "N/A"}
                              </td>
                              <td
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                <span
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    textTransform: "capitalize",
                                    backgroundColor:
                                      task.status === "completed"
                                        ? "#d1fae5"
                                        : task.status === "in_progress"
                                        ? "#dbeafe"
                                        : task.status === "blocked"
                                        ? "#fee2e2"
                                        : "#f3f4f6",
                                    color:
                                      task.status === "completed"
                                        ? "#065f46"
                                        : task.status === "in_progress"
                                        ? "#1e40af"
                                        : task.status === "blocked"
                                        ? "#991b1b"
                                        : "#6b7280",
                                  }}
                                >
                                  {task.status.replace("_", " ")}
                                </span>
                              </td>
                              <td
                                className="text-foreground"
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {task.planned_hours}h
                              </td>
                              <td
                                className="text-foreground"
                                style={{
                                  padding: "0.75rem",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {task.due_date
                                  ? new Date(task.due_date).toLocaleDateString()
                                  : "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      className="bg-gray-50 text-muted-foreground"
                      style={{
                        padding: "1.5rem",
                        textAlign: "center",
                        borderRadius: "8px",
                      }}
                    >
                      No tasks assigned
                    </div>
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                marginTop: "1.5rem",
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                onClick={() => setShowViewModal(false)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
