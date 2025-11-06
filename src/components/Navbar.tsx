import React from 'react';
import { NavLink, Link } from 'react-router-dom';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/dashboard">NexTrack</Link>
      </div>
      <div className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : undefined}>Dashboard</NavLink>
        {(user?.role === 'super_admin' || user?.role === 'manager' || user?.role === 'team_lead') && (
          <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : undefined}>Users</NavLink>
        )}
        {user?.role === 'super_admin' && (
          <NavLink to="/project-assignments" className={({ isActive }) => isActive ? 'active' : undefined}>Assign Projects</NavLink>
        )}
        <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : undefined}>Projects</NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : undefined}>Tasks</NavLink>
      </div>
      <div className="nav-user">
        <span>{user?.username}</span>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : undefined} style={{ marginLeft: '1rem', marginRight: '0.5rem' }}>Settings</NavLink>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

