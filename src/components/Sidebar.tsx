import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react";
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
      : user.role === "employee"
        ? "Team Member"
        : user.role.replace("_", " ")
    : "";


  return (
    <aside className="sidebar-nav">
      <div className="sidebar-brand">
        <div
          className="sidebar-brand-icon"
          style={{
            width: "35px",
            height: "35px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "800",
            fontSize: "18px",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.5)",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            flexShrink: 0,
            marginLeft: "8px",
            marginTop: "4px",
            textShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          N
        </div>
        <span className="sidebar-brand-text">NexTrack</span>
      </div>
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
            <ChevronUp size={16} className={`sidebar-user-chevron ${menuOpen ? "open" : ""}`} />
          </button>
          {menuOpen && (
            <div className="sidebar-user-menu">
              <NavLink to="/settings" className="sidebar-user-menu-item">
                <Settings size={16} style={{ marginRight: "0.5rem" }} />
                Settings
              </NavLink>
              <button
                className="sidebar-user-menu-item danger"
                onClick={onLogout}
                type="button"
              >
                <LogOut size={16} style={{ marginRight: "0.5rem" }} />
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
          <span className="sidebar-link-icon">
            <LayoutDashboard size={20} />
          </span>
          <span>Dashboard</span>
        </NavLink>
        {user?.role !== "employee" && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            <span className="sidebar-link-icon">
              <Users size={20} />
            </span>
            <span>Users</span>
          </NavLink>
        )}
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon">
            <Briefcase size={20} />
          </span>
          <span>Projects</span>
        </NavLink>
        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-link-icon">
            <CheckSquare size={20} />
          </span>
          <span>Tasks</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;

