import React, { useState, useEffect } from "react";
import axios from "axios";

interface User {
  id: number;
  username: string;
  role: "manager" | "team_lead" | "employee";
  email: string;
  available_hours_per_week?: number;
}

const Users: React.FC = () => {
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://72.60.101.24:5005/api/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create user account only
      await axios.post("http://72.60.101.24:5005/api/users", {
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
      setShowAddForm(false);
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await axios.put(`http://72.60.101.24:5005/api/users/${editingUser.id}`, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        available_hours_per_week: editingUser.available_hours_per_week,
      });

      setShowEditForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await axios.delete(`http://72.60.101.24:5005/api/users/${userId}`);
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user");
      }
    }
  };

  const handleExportUsers = () => {
    const csvContent = [
      ["Username", "Email", "Role", "Available Hours/Week"],
      ...users.map((user) => [
        `"${user.username}"`,
        `"${user.email}"`,
        `"${user.role}"`,
        `"${user.available_hours_per_week || 40}"`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split("\n").filter((line) => line.trim());

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line properly (handle quoted values)
        const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];

        if (values.length >= 3) {
          try {
            const userData = {
              username: values[0]?.replace(/"/g, "").trim() || "",
              email: values[1]?.replace(/"/g, "").trim() || "",
              role: values[2]?.replace(/"/g, "").trim() || "",
              password: "password123", // Default password
              available_hours_per_week:
                parseInt(values[3]?.replace(/"/g, "").trim()) || 40,
            };

            // Check if user already exists
            const existingUser = users.find(
              (u) => u.username === userData.username
            );
            if (existingUser) {
              console.log(
                `User ${userData.username} already exists, skipping...`
              );
              continue;
            }

            // Create user account only
            await axios.post("http://72.60.101.24:5005/api/users", {
              username: userData.username,
              password: userData.password,
              role: userData.role,
              email: userData.email,
            });

            console.log(`Successfully imported user: ${userData.username}`);
          } catch (error) {
            console.error("Error importing user:", error);
          }
        }
      }

      fetchUsers();
      alert("Import completed! Check console for details.");
    };
    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ["Username", "Email", "Role", "Available Hours/Week"],
      ['"john.doe"', '"john.doe@company.com"', '"employee"', '"40"'],
      ['"jane.smith"', '"jane.smith@company.com"', '"team_lead"', '"45"'],
      ['"mike.johnson"', '"mike.johnson@company.com"', '"employee"', '"35"'],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([sampleData], { type: "text/csv;charset=utf-8;" });
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
          <button
            onClick={() => setShowAddForm(true)}
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
          <div className="modal">
            <div className="modal-header">
              <h2>Add New User</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddUser} className="user-form">
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                  required
                >
                  <option value="">Select Role</option>
                  <option value="manager">Manager</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <div className="form-group">
                <label>Available Hours per Week:</label>
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
                  required
                  placeholder="40"
                />
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
                  onClick={() => setShowAddForm(false)}
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
        }}
      >
        <table
          className="users-table"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
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
                      onClick={() => handleDeleteUser(user.id)}
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <div className="modal">
            <div className="modal-header">
              <h2>Edit User</h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setEditingUser(null);
                }}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="user-form">
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
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
                  required
                >
                  <option value="">Select Role</option>
                  <option value="manager">Manager</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <div className="form-group">
                <label>Available Hours per Week:</label>
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
                  required
                  placeholder="40"
                />
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
    </div>
  );
};

export default Users;
