import React from 'react';
import { TeamMember } from '../types';

interface TeamTableProps {
  members: TeamMember[];
}

const TeamTable: React.FC<TeamTableProps> = ({ members }) => {
  return (
    <div className="team-section">
      <h2>Team Management</h2>
      <div className="team-table-container">
        <table className="team-table">
          <thead>
            <tr>
              <th>Team Member</th>
              <th>Role</th>
              <th>Projects</th>
              <th>Tasks This Week</th>
              <th>Planned Hours</th>
              <th>Available Hours</th>
              <th>Productivity</th>
              <th>Utilization</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="employee-info">
                    <div className="avatar">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span>{member.name}</span>
                  </div>
                </td>
                <td>{member.role}</td>
                <td>
                  {member.projects ? member.projects.split(',').map((project: string) => (
                    <span key={project.trim()} className="project-tag">
                      {project.trim()}
                    </span>
                  )) : <span className="project-tag">No Projects</span>}
                </td>
                <td>{member.tasks_count}</td>
                <td>{member.planned_hours}</td>
                <td>{member.available_hours}</td>
                <td>{member.productivity}%</td>
                <td>{member.utilization}%</td>
                <td>
                  <span className={`status ${member.status}`}>
                    {member.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamTable;
