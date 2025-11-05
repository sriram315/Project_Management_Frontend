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
        {(user?.role === 'manager' || user?.role === 'team_lead') && (
          <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : undefined}>Users</NavLink>
        )}
        <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : undefined}>Projects</NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : undefined}>Tasks</NavLink>
      </div>
      <div className="nav-user">
        <span>{user?.username}</span>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

