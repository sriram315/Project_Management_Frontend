import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Navbar from './components/Navbar';
import Users from './components/Users';
import Projects from './components/Projects';
import Tasks from './components/Tasks';
import TeamManagement from './components/TeamManagement';
import ProjectDetails from './components/ProjectDetails';
import './App.css';

interface User {
  id: number;
  username: string;
  role: 'manager' | 'team_lead' | 'employee';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedAuth = localStorage.getItem('isAuthenticated');
    
    if (savedUser && savedAuth === 'true') {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setIsAuthenticated(true);
    setUser(userData);
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  };

  const canAccessUsers = (userRole: string) => {
    return userRole === 'manager' || userRole === 'team_lead';
  };

  const canAccessProjects = (userRole: string) => {
    return userRole === 'manager' || userRole === 'team_lead' || userRole === 'employee';
  };

  const canAccessTasks = (userRole: string) => {
    return userRole === 'manager' || userRole === 'team_lead' || userRole === 'employee';
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.2rem',
          color: '#666'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Navbar user={user} onLogout={handleLogout} />}
        <Routes>
          <Route 
            path="/login" 
            element={
              !isAuthenticated ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? (
                <Dashboard user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route 
            path="/users" 
            element={
              isAuthenticated && user && canAccessUsers(user.role) ? (
                <Users />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route 
            path="/projects" 
            element={
              isAuthenticated && user && canAccessProjects(user.role) ? (
                <Projects user={user} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route 
            path="/tasks" 
            element={
              isAuthenticated && user && canAccessTasks(user.role) ? (
                <Tasks user={user} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route 
            path="/team-management/:projectId" 
            element={
              isAuthenticated && user && canAccessProjects(user.role) ? (
                <TeamManagement />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route 
            path="/project-details/:projectId" 
            element={
              isAuthenticated && user && user.role === 'employee' ? (
                <ProjectDetails />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;