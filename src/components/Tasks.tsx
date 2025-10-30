import React, { useState, useEffect } from 'react';
import { taskAPI, projectAPI, teamAPI, userAPI } from '../services/api';
import { Task, Project, TeamMember } from '../types';
import AddTask from './AddTask';
import EditTask from './EditTask';
import KanbanBoard from './KanbanBoard';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import { FilterX } from 'lucide-react';
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
  const { toast, showToast, hideToast } = useToast();

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
    showToast('Task created successfully!', 'success');
  };

  const handleTaskUpdated = () => {
    fetchData();
    setEditingTask(null);
    showToast('Task updated successfully!', 'success');
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await taskAPI.delete(id);
      fetchData();
      showToast('Task deleted successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete task';
      showToast(errorMessage, 'error');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
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
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#000', marginBottom: '0.5rem' }}>
            {user?.role === 'employee' ? 'My Tasks' : 'Task Management'}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Manage and track all your tasks in one place
          </p>
        </div>
        {user?.role !== 'employee' && (
          <button 
            onClick={() => setShowAddTask(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>+</span>
            Add New Task
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
              onClick={clearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                marginTop: '1.55rem'
              }}
            >
              <FilterX size={18} />
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
            onEditTask={handleEditTask}
          />
        )}
      </div>

      {showAddTask && (
        <AddTask
          onTaskAdded={handleTaskAdded}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {editingTask && (
        <EditTask
          task={editingTask}
          onTaskUpdated={handleTaskUpdated}
          onClose={() => setEditingTask(null)}
        />
      )}

      {toast.isVisible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default Tasks;