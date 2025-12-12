// import React from 'react';
// import { NavLink, Link } from 'react-router-dom';

// interface NavbarProps {
//   user: any;
//   onLogout: () => void;
// }

// const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {

//   return (
//     <nav className="navbar">
//       <div className="nav-brand">
//         <Link to="/dashboard">NexTrack</Link>
//       </div>
//       <div className="nav-links">
//         <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : undefined}>Dashboard</NavLink>
//         {(user?.role === 'super_admin' || user?.role === 'manager' || user?.role === 'team_lead') && (
//           <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : undefined}>Users</NavLink>
//         )}
//         {user?.role === 'super_admin' && (
//           <NavLink to="/project-assignments" className={({ isActive }) => isActive ? 'active' : undefined}>Assign Projects</NavLink>
//         )}
//         <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : undefined}>Projects</NavLink>
//         <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : undefined}>Tasks</NavLink>
//       </div>
//       <div className="nav-user">
//         <span>{user?.username}</span>
//         <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : undefined} style={{ marginLeft: '1rem', marginRight: '0.5rem' }}>Settings</NavLink>
//         <button onClick={onLogout} className="logout-btn">
//           Logout
//         </button>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;

import React, { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [darkTheme, setDarkTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "dark";
    }
    return false;
  });

  // Listen for dark theme changes
  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      // Only update if the theme change is for the current user
      if (!user?.id || customEvent.detail?.userId === user.id) {
        setDarkTheme(customEvent.detail?.enabled || false);
      }
    };

    window.addEventListener("dark-theme-changed", handleThemeChange);

    // Check initial theme
    const checkTheme = () => {
      setDarkTheme(
        document.documentElement.getAttribute("data-theme") === "dark"
      );
    };
    checkTheme();

    // Also check on DOM mutations (in case theme is set elsewhere)
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      window.removeEventListener("dark-theme-changed", handleThemeChange);
      observer.disconnect();
    };
  }, [user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileDropdown]);

  const handleSettingsClick = () => {
    setShowProfileDropdown(false);
    navigate("/settings");
  };

  const handleLogoutClick = () => {
    setShowProfileDropdown(false);
    onLogout();
  };

  const styles = {
    navbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: darkTheme ? "#1e293b" : "#ffffff",
      padding: "0.8rem 1.5rem",
      boxShadow: darkTheme
        ? "0 2px 8px rgba(0, 0, 0, 0.3)"
        : "0 2px 8px rgba(0, 0, 0, 0.05)",
      fontFamily: "Inter, sans-serif",
      position: "sticky" as const,
      top: 0,
      zIndex: 30,
    },
    brand: {
      fontSize: "1.3rem",
      fontWeight: 700,
      color: darkTheme ? "#60a5fa" : "#0078ff",
      textDecoration: "none",
    },
    navLinks: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    link: (isActive: boolean, name: string) => ({
      textDecoration: "none",
      color: isActive
        ? darkTheme
          ? "#60a5fa"
          : "#0078ff"
        : hoveredLink === name
        ? darkTheme
          ? "#93c5fd"
          : "#005fcc"
        : darkTheme
        ? "#cbd5e1"
        : "#333",
      backgroundColor: isActive
        ? darkTheme
          ? "#1e40af"
          : "#eaf4ff"
        : "transparent",
      fontWeight: 500,
      padding: "0.4rem 0.8rem",
      borderRadius: "6px",
      transition: "all 0.2s",
    }),
    userSection: {
      display: "flex",
      alignItems: "center",
      gap: "0.8rem",
      backgroundColor: darkTheme ? "#1e293b" : "#f9fafb",
      padding: "0.5rem 0.8rem",
      borderRadius: "8px",
      boxShadow: darkTheme
        ? "inset 0 0 4px rgba(255, 255, 255, 0.05)"
        : "inset 0 0 4px rgba(0, 0, 0, 0.05)",
      position: "relative" as const,
    },
    username: {
      fontWeight: 500,
      color: darkTheme ? "#e2e8f0" : "#333",
      fontSize: "0.95rem",
    },
    profileIconButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      backgroundColor: "#6366f1",
      border: "none",
      cursor: "pointer",
      padding: 0,
      transition: "all 0.2s",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    profileIcon: {
      width: "20px",
      height: "20px",
      fill: "white",
    },
    dropdown: {
      position: "absolute" as const,
      top: "calc(100% + 0.5rem)",
      right: 0,
      backgroundColor: darkTheme ? "#1e293b" : "white",
      borderRadius: "8px",
      boxShadow: darkTheme
        ? "0 4px 12px rgba(0, 0, 0, 0.5)"
        : "0 4px 12px rgba(0, 0, 0, 0.15)",
      minWidth: "160px",
      zIndex: 1000,
      overflow: "hidden",
      border: darkTheme ? "1px solid #334155" : "1px solid #e5e7eb",
    },
    dropdownItem: {
      display: "block",
      width: "100%",
      padding: "0.75rem 1rem",
      textDecoration: "none",
      color: darkTheme ? "#e2e8f0" : "#333",
      fontSize: "0.9rem",
      fontWeight: 500,
      border: "none",
      background: "none",
      cursor: "pointer",
      textAlign: "left" as const,
      transition: "background-color 0.2s",
    },
    dropdownItemHover: {
      backgroundColor: darkTheme ? "#334155" : "#f3f4f6",
    },
    dropdownDivider: {
      height: "1px",
      backgroundColor: darkTheme ? "#334155" : "#e5e7eb",
      margin: 0,
      border: "none",
    },
    logoutItem: {
      color: "#ef4444",
    },
  };

  return (
    <nav style={styles.navbar}>
      <div className="nav-brand">
        <Link to="/dashboard">NexTrack</Link>
      </div>

      <div style={styles.navLinks}>
        <NavLink
          to="/dashboard"
          style={({ isActive }) => styles.link(isActive, "dashboard")}
          onMouseEnter={() => setHoveredLink("dashboard")}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Dashboard
        </NavLink>

        {(user?.role === "super_admin" ||
          user?.role === "manager" ||
          user?.role === "team_lead") && (
          <NavLink
            to="/users"
            style={({ isActive }) => styles.link(isActive, "users")}
            onMouseEnter={() => setHoveredLink("users")}
            onMouseLeave={() => setHoveredLink(null)}
          >
            Users
          </NavLink>
        )}

        {/* Assign Projects is now merged into Projects page for superadmin */}
        <NavLink
          to="/projects"
          style={({ isActive }) => styles.link(isActive, "projects")}
          onMouseEnter={() => setHoveredLink("projects")}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Projects
        </NavLink>

        <NavLink
          to="/tasks"
          style={({ isActive }) => styles.link(isActive, "tasks")}
          onMouseEnter={() => setHoveredLink("tasks")}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Tasks
        </NavLink>
      </div>

      <div style={styles.userSection} ref={dropdownRef}>
        <span
          style={{ ...styles.username, cursor: "pointer", userSelect: "none" }}
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          title="Profile menu"
        >
          {user?.username}
        </span>

        <button
          type="button"
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          style={styles.profileIconButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#4f46e5";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#6366f1";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Profile menu"
        >
          <svg
            style={styles.profileIcon}
            viewBox="0 0 24 24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="9" r="3" fill="white" />
            <path d="M6 20c0-2.5 2.5-5 6-5s6 2.5 6 5" fill="white" />
          </svg>
        </button>

        {showProfileDropdown && (
          <div style={styles.dropdown}>
            <button
              type="button"
              onClick={handleSettingsClick}
              style={styles.dropdownItem}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkTheme
                  ? "#334155"
                  : "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Settings
            </button>
            <hr style={styles.dropdownDivider} />
            <button
              type="button"
              onClick={handleLogoutClick}
              style={{ ...styles.dropdownItem, ...styles.logoutItem }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkTheme
                  ? "#7f1d1d"
                  : "#fee2e2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
