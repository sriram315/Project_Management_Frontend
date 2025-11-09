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


import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [hoveredLogout, setHoveredLogout] = useState(false);

  const styles = {
    navbar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      padding: '0.8rem 1.5rem',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      fontFamily: 'Inter, sans-serif',
      position: 'sticky' as const,
      top: 0,
      zIndex: 10,
    },
    brand: {
      fontSize: '1.3rem',
      fontWeight: 700,
      color: '#0078ff',
      textDecoration: 'none',
    },
    navLinks: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    },
    link: (isActive: boolean, name: string) => ({
      textDecoration: 'none',
      color: isActive ? '#0078ff' : hoveredLink === name ? '#005fcc' : '#333',
      backgroundColor: isActive ? '#eaf4ff' : 'transparent',
      fontWeight: 500,
      padding: '0.4rem 0.8rem',
      borderRadius: '6px',
      transition: 'all 0.2s',
    }),
    userSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.8rem',
      backgroundColor: '#f9fafb',
      padding: '0.5rem 0.8rem',
      borderRadius: '8px',
      boxShadow: 'inset 0 0 4px rgba(0, 0, 0, 0.05)',
    },
    username: {
      fontWeight: 500,
      color: '#333',
      fontSize: '0.95rem',
    },
    settingsLink: (isActive: boolean) => ({
      textDecoration: 'none',
      color: isActive ? '#fff' : '#0078ff',
      backgroundColor: isActive ? '#0078ff' : hoveredLink === 'settings' ? '#eaf4ff' : 'transparent',
      padding: '0.4rem 0.8rem',
      borderRadius: '6px',
      fontWeight: 500,
      transition: 'all 0.2s',
      marginLeft: '1rem',
      marginRight: '0.5rem',
    }),
    logoutBtn: {
      backgroundColor: hoveredLogout ? '#e63b3b' : '#ff4b4b',
      color: 'white',
      border: 'none',
      padding: '0.45rem 0.9rem',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '0.9rem',
      transition: 'all 0.2s',
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
          style={({ isActive }) => styles.link(isActive, 'dashboard')}
          onMouseEnter={() => setHoveredLink('dashboard')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Dashboard
        </NavLink>

        {(user?.role === 'super_admin' || user?.role === 'manager' || user?.role === 'team_lead') && (
          <NavLink
            to="/users"
            style={({ isActive }) => styles.link(isActive, 'users')}
            onMouseEnter={() => setHoveredLink('users')}
            onMouseLeave={() => setHoveredLink(null)}
          >
            Users
          </NavLink>
        )}

        {user?.role === 'super_admin' && (
          <NavLink
            to="/project-assignments"
            style={({ isActive }) => styles.link(isActive, 'project-assignments')}
            onMouseEnter={() => setHoveredLink('project-assignments')}
            onMouseLeave={() => setHoveredLink(null)}
          >
            Assign Projects
          </NavLink>
        )}

        <NavLink
          to="/projects"
          style={({ isActive }) => styles.link(isActive, 'projects')}
          onMouseEnter={() => setHoveredLink('projects')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Projects
        </NavLink>

        <NavLink
          to="/tasks"
          style={({ isActive }) => styles.link(isActive, 'tasks')}
          onMouseEnter={() => setHoveredLink('tasks')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Tasks
        </NavLink>
      </div>

      <div style={styles.userSection}>
        <span style={styles.username}>{user?.username}</span>

        <NavLink
          to="/settings"
          style={({ isActive }) => styles.settingsLink(isActive)}
          onMouseEnter={() => setHoveredLink('settings')}
          onMouseLeave={() => setHoveredLink(null)}
        >
          Settings
        </NavLink>

        <button
          onClick={onLogout}
          style={styles.logoutBtn}
          onMouseEnter={() => setHoveredLogout(true)}
          onMouseLeave={() => setHoveredLogout(false)}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
