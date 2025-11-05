import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { projectTeamAPI } from '../services/api';
import ManageTeamMembers from './ManageTeamMembers';
import '../App.css';

const TeamManagement: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const projectName = location.state?.projectName || 'Unknown Project';

  const handleClose = () => {
    navigate('/projects');
  };

  if (!projectId) {
    return (
      <div className="page-container">
        <div className="error-message">Project ID not found</div>
      </div>
    );
  }

  return (
    <ManageTeamMembers
      projectId={parseInt(projectId)}
      projectName={projectName}
      onClose={handleClose}
    />
  );
};

export default TeamManagement;
