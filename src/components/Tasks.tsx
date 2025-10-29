import React, { useState, useEffect } from 'react';
import { taskAPI, projectAPI, teamAPI, userAPI } from '../services/api';
import { Task, Project, TeamMember } from '../types';
import AddTask from './AddTask';
import KanbanBoard from './KanbanBoard';
import '../App.css';

interface TaskFilters {
  projectId: number | null;
  assigneeId: number | null;
  dueDate: string;
}

interface TasksProps {
  user?: any;
}

const Tasks: React.FC<TasksProps> = ({ user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    projectId: null,
    assigneeId: null,
    dueDate: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let tasksData: Task[], projectsData: Project[], teamData: TeamMember[];
      
      if (user?.role === 'employee') {
        // For employees, fetch only their assigned tasks and projects
        [tasksData, projectsData] = await Promise.all([
          userAPI.getUserTasks(user.id),
          userAPI.getUserProjects(user.id)
        ]);
        teamData = []; // Employees don't need team member list
      } else {
        // For managers and team leads, fetch all data
        [tasksData, projectsData, teamData] = await Promise.all([
          taskAPI.getAll(),
          projectAPI.getAll(),
          teamAPI.getAll()
        ]);
      }
      
      setTasks(tasksData);
      setProjects(projectsData);
      setTeamMembers(teamData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Filter by project
    if (filters.projectId) {
      filtered = filtered.filter(task => task.project_id === filters.projectId);
    }

    // Filter by assignee
    if (filters.assigneeId) {
      filtered = filtered.filter(task => task.assignee_id === filters.assigneeId);
    }

    // Filter by due date
    if (filters.dueDate) {
      filtered = filtered.filter(task => {
        if (!task.due_date) return false;
        return task.due_date === filters.dueDate;
      });
    }

    setFilteredTasks(filtered);
  };

  const handleFilterChange = (key: keyof TaskFilters, value: string | number | null) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      projectId: null,
      assigneeId: null,
      dueDate: ''
    });
  };

  const handleTaskAdded = () => {
    fetchData();
    setShowAddTask(false);
  };

  const handleDeleteTask = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskAPI.delete(id);
        fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete task');
      }
    }
  };

  const handleTaskUpdate = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="users-page">
        <div className="loading">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>{user?.role === 'employee' ? 'My Tasks' : 'Task Management'}</h1>
        {user?.role !== 'employee' && (
          <button 
            className="btn-enterprise btn-primary"
            onClick={() => setShowAddTask(true)}
          >
            + Add New Task
          </button>
        )}
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="project-filter">Project</label>
            <select
              id="project-filter"
              value={filters.projectId || ''}
              onChange={(e) => handleFilterChange('projectId', e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {user?.role !== 'employee' && (
            <div className="filter-group">
              <label htmlFor="assignee-filter">Employee</label>
              <select
                id="assignee-filter"
                value={filters.assigneeId || ''}
                onChange={(e) => handleFilterChange('assigneeId', e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">All Employees</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label htmlFor="due-date-filter">Due Date</label>
            <input
              type="date"
              id="due-date-filter"
              value={filters.dueDate}
              onChange={(e) => handleFilterChange('dueDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <button 
              className="btn-secondary"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="filter-results">
          <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="page-content">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks found. {tasks.length === 0 ? 'Create your first task to get started!' : 'Try adjusting your filters.'}</p>
          </div>
        ) : (
          <KanbanBoard 
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </div>

      {showAddTask && (
        <AddTask
          onTaskAdded={handleTaskAdded}
          onClose={() => {
            setShowAddTask(false);
            setEditingTask(null);
          }}
          projectId={editingTask?.project_id}
          assigneeId={editingTask?.assignee_id}
        />
      )}
    </div>
  );
};

export default Tasks;