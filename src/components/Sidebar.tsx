import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import "../App.css";

interface SidebarProps {
  user?: { username: string; role: string } | null;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const roleLabel = user?.role
    ? user.role === "super_admin"
      ? "Superadmin"
      : user.role.replace("_", " ")
    : "";
  const initials =
    (user?.username || "U")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <aside className="sidebar-nav">
      <div className="sidebar-brand">NexTrack</div>
      {user && (
        <div className="sidebar-user" ref={menuRef}>
          <button
            className="sidebar-user-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="User menu"
          >
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{user.username}</span>
              <span className="sidebar-user-role">{roleLabel}</span>
            </div>
            <div className="sidebar-user-avatar">{initials}</div>
          </button>
          {menuOpen && (
            <div className="sidebar-user-menu">
              <NavLink to="/settings" className="sidebar-user-menu-item">
                Settings
              </NavLink>
              <button
                className="sidebar-user-menu-item danger"
                onClick={onLogout}
                type="button"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
      <nav className="sidebar-links">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon"></span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/users"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon"></span>
          <span>Users</span>
        </NavLink>
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon"></span>
          <span>Projects</span>
        </NavLink>
        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon"></span>
          <span>Tasks</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;

