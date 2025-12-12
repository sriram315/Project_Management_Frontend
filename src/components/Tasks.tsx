import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  taskAPI,
  projectAPI,
  teamAPI,
  userAPI,
  dashboardAPI,
} from "../services/api";
import { Task, Project, TeamMember } from "../types";
import AddTask from "./AddTask";
import EditTask from "./EditTask";
import KanbanBoard from "./KanbanBoard";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import { FilterX } from "lucide-react";
import CustomSelect from "./CustomSelect";
import "../App.css";
import Projects from "./Projects";

interface TaskFilters {
  projectId: number | null;
  projectName: string | null;
  assigneeId: number | null;
  startDate: string;
  dueDate: string;
}

interface TasksProps {
  user?: any;
}

const Tasks: React.FC<TasksProps> = ({ user }) => {
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    projectId: null,
    projectName: null,
    assigneeId: null,
    startDate: "",
    dueDate: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  // If navigated from Dashboard with a requested status, scroll to that column
  useEffect(() => {
    const state = (location as any)?.state as
      | { scrollToStatus?: "todo" | "in_progress" | "blocked" | "completed" }
      | undefined;
    if (state?.scrollToStatus) {
      // Delay until Kanban renders
      const timer = setTimeout(() => {
        const el = document.getElementById(`kanban-${state.scrollToStatus}`);
        if (el) {
          el.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "start",
          });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [location, filteredTasks]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      let tasksData: Task[];
      let projectsData: Project[];
      let teamData: TeamMember[];

      if (user?.role === "employee") {
        // For employees, fetch only their assigned tasks and projects
        [tasksData, projectsData] = await Promise.all([
          userAPI.getUserTasks(user.id),
          userAPI.getUserProjects(user.id),
        ]);
        teamData = []; // Employees don't need team member list
      } else if (user?.role === "manager" || user?.role === "team_lead") {
        // For managers and team leads, fetch only their assigned projects and employees
        const [fetchedTasks, fetchedProjects, employeesData] =
          await Promise.all([
            taskAPI.getAll(user.id, user.role),
            projectAPI.getAll(user.id, user.role),
            dashboardAPI.getEmployees(undefined, user.id, user.role), // Get employees from assigned projects only
          ]);

        tasksData = fetchedTasks;
        projectsData = fetchedProjects;

        // Build a map of project IDs to project names for reliable lookup
        const projectIdToNameMap = new Map<number, string>();
        fetchedProjects.forEach((project) => {
          projectIdToNameMap.set(project.id, project.name);
        });

        // Build a map of employee IDs to their assigned project names from tasks
        const employeeProjectMap = new Map<number, Set<string>>();
        fetchedTasks.forEach((task) => {
          if (task.assignee_id && task.project_id) {
            // Use project name from projects array for consistency, fallback to task.project_name
            const projectName =
              projectIdToNameMap.get(task.project_id) || task.project_name;
            if (projectName) {
              if (!employeeProjectMap.has(task.assignee_id)) {
                employeeProjectMap.set(task.assignee_id, new Set());
              }
              employeeProjectMap.get(task.assignee_id)?.add(projectName);
            }
          }
        });

        // Convert employees to teamMembers format
        teamData = employeesData.map((emp: any) => {
          // Get projects from API response, or derive from tasks data
          let projectsStr = emp.projects || emp.project_names || "";

          // If projects field is missing, derive from tasks
          if (!projectsStr && employeeProjectMap.has(emp.id)) {
            const projectSet = employeeProjectMap.get(emp.id);
            if (projectSet && projectSet.size > 0) {
              projectsStr = Array.from(projectSet).join(",");
            }
          }

          return {
            id: emp.id,
            name: emp.username,
            role: emp.role,
            available_hours: emp.available_hours_per_week || 40,
            status: "online" as const,
            tasks_count: 0,
            planned_hours: 0,
            productivity: 0,
            utilization: 0,
            projects: projectsStr, // Include projects field for filtering
          };
        });
      } else {
        // For super admin, fetch all data
        [tasksData, projectsData, teamData] = await Promise.all([
          taskAPI.getAll(),
          projectAPI.getAll(),
          teamAPI.getAll(),
        ]);
      }

      setTasks(tasksData);
      setProjects(projectsData);
      setTeamMembers(teamData);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Filter by project
    if (filters.projectId) {
      filtered = filtered.filter(
        (task) => task.project_id === filters.projectId
      );
    }

    // Filter by assignee
    if (filters.assigneeId) {
      filtered = filtered.filter(
        (task) => task.assignee_id === filters.assigneeId
      );
    }

    // Default filter: Show only tasks from the next 3 weeks (when no date filters are set)
    if (!filters.startDate && !filters.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate 3 weeks from today
      const threeWeeksFromNow = new Date(today);
      threeWeeksFromNow.setDate(today.getDate() + 21); // 3 weeks = 21 days
      threeWeeksFromNow.setHours(23, 59, 59, 999);

      filtered = filtered.filter((task) => {
        // Check if task has a due_date within the next 3 weeks
        if (task.due_date) {
          const dueDate = new Date(task.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate >= today && dueDate <= threeWeeksFromNow) {
            return true;
          }
        }
        
        // Also check start_date if due_date is not available or outside range
        const taskStartDate = (task as any).start_date;
        if (taskStartDate) {
          const startDate = new Date(taskStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (startDate >= today && startDate <= threeWeeksFromNow) {
            return true;
          }
        }
        
        // If task has no dates or dates are outside range, exclude it
        return false;
      });
    }

    // Filter by date range (when both start and due dates are selected, show tasks within the range)
    // When only one date is selected, apply that filter independently
    if (filters.startDate || filters.dueDate) {
      const selectedStartDate = filters.startDate
        ? new Date(filters.startDate)
        : null;
      if (selectedStartDate) {
        selectedStartDate.setHours(0, 0, 0, 0);
      }

      const selectedDueDate = filters.dueDate ? new Date(filters.dueDate) : null;
      if (selectedDueDate) {
        selectedDueDate.setHours(23, 59, 59, 999); // Include the entire selected day
      }

      filtered = filtered.filter((task) => {
        const taskStartDate = (task as any).start_date
          ? new Date((task as any).start_date)
          : null;
        const taskDueDate = task.due_date ? new Date(task.due_date) : null;

        // Normalize dates for comparison
        if (taskStartDate) taskStartDate.setHours(0, 0, 0, 0);
        if (taskDueDate) taskDueDate.setHours(0, 0, 0, 0);

        // When both dates are selected, show tasks that overlap with the date range
        if (selectedStartDate && selectedDueDate) {
          // Task overlaps if:
          // - Task starts within range, OR
          // - Task ends within range, OR
          // - Task spans the entire range
          if (taskStartDate) {
            if (
              (taskStartDate >= selectedStartDate &&
                taskStartDate <= selectedDueDate) ||
              (taskDueDate &&
                taskDueDate >= selectedStartDate &&
                taskDueDate <= selectedDueDate) ||
              (taskStartDate <= selectedStartDate &&
                taskDueDate &&
                taskDueDate >= selectedDueDate)
            ) {
              return true;
            }
          } else if (taskDueDate) {
            // If only due_date exists, check if it's within range
            if (
              taskDueDate >= selectedStartDate &&
              taskDueDate <= selectedDueDate
            ) {
              return true;
            }
          }
          return false;
        }

        // When only start date is selected
        if (selectedStartDate && !selectedDueDate) {
          if (taskStartDate && taskStartDate >= selectedStartDate) {
            return true;
          }
          if (taskDueDate && !taskStartDate && taskDueDate >= selectedStartDate) {
            return true;
          }
          return false;
        }

        // When only due date is selected
        if (selectedDueDate && !selectedStartDate) {
          if (taskDueDate && taskDueDate <= selectedDueDate) {
            return true;
          }
          if (taskStartDate && !taskDueDate && taskStartDate <= selectedDueDate) {
            return true;
          }
          return false;
        }

        return false;
      });
    }

    // Text search across task name and description
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          (task.name || "").toLowerCase().includes(term) ||
          (task.description || "").toLowerCase().includes(term)
      );
    }

    setFilteredTasks(filtered);
  };

  const handleFilterChange = (
    key: keyof TaskFilters,
    value: string | number | null
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      projectId: null,
      projectName: null,
      assigneeId: null,
      startDate: "",
      dueDate: "",
    });
  };

  const handleTaskAdded = () => {
    fetchData();
    setShowAddTask(false);
    showToast("Task created successfully!", "success");
    window.dispatchEvent(new CustomEvent("tasks:changed"));
  };

  const handleTaskUpdated = () => {
    fetchData();
    setEditingTask(null);
    showToast("Task updated successfully!", "success");
    window.dispatchEvent(new CustomEvent("tasks:changed"));
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await taskAPI.delete(id);
      fetchData();
      showToast("Task deleted successfully!", "success");
      window.dispatchEvent(new CustomEvent("tasks:changed"));
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to delete task";
      showToast(errorMessage, "error");
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskUpdate = () => {
    fetchData();
    window.dispatchEvent(new CustomEvent("tasks:changed"));
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
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1
            className="text-foreground"
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              marginBottom: "0.5rem",
            }}
          >
            {user?.role === "employee" ? "My Tasks" : "Task Management"}
          </h1>
          <p
            className="text-muted-foreground"
            style={{ fontSize: "0.95rem", marginTop: "0.25rem" }}
          >
            Manage and track all your tasks in one place
          </p>
        </div>
        <div
          className="header-actions"
          style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
        >
          <input
            type="text"
            placeholder="Search tasks by name, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-background"
            style={{
              padding: "0.65rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              width: "280px",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />
          <button
            onClick={() => setShowAddTask(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 1.25rem",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "500",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>+</span>
            Add New Task
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="project-filter">Project</label>
            <CustomSelect
              value={filters.projectId?.toString() || ""}
              onChange={(value) => {
                const projectId = value ? parseInt(value) : null;
                const selectedProject = projectId
                  ? projects.find((project) => project.id === projectId)
                  : null;

                handleFilterChange("projectId", projectId);
                handleFilterChange(
                  "projectName",
                  selectedProject?.name || null
                );
                // Clear assignee filter when project changes to avoid showing invalid options
                if (projectId !== filters.projectId) {
                  handleFilterChange("assigneeId", null);
                }
              }}
              options={[
                { value: "", label: "All Projects" },
                ...projects.map((project) => ({
                  value: project.id.toString(),
                  label: project.name,
                })),
              ]}
              placeholder="Select Project"
            />
          </div>

          {user?.role !== "employee" && (
            <div className="filter-group">
              <label htmlFor="assignee-filter">Team Member</label>
              <CustomSelect
                value={filters.assigneeId?.toString() || ""}
                onChange={(value) =>
                  handleFilterChange(
                    "assigneeId",
                    value ? parseInt(value) : null
                  )
                }
                options={[
                  { value: "", label: "All Team Members" },
                  ...teamMembers
                    .map((member) => {
                      // Handle projects field - could be string, array, or undefined
                      let projectList: string[] = [];
                      if (member.projects) {
                        if (typeof member.projects === "string") {
                          projectList = member.projects
                            .split(",")
                            .map((p: string) => p.trim())
                            .filter((p: string) => p.length > 0);
                        } else if (Array.isArray(member.projects)) {
                          projectList = (member.projects as any[])
                            .map((p: any) =>
                              typeof p === "string" ? p.trim() : String(p)
                            )
                            .filter((p: string) => p.length > 0);
                        }
                      }
                      return {
                        projects: projectList,
                        name: member.name,
                        id: member.id,
                      };
                    })
                    .filter((member) => {
                      // If no project filter is selected, show all members
                      if (
                        !filters.projectName ||
                        filters.projectName === null ||
                        filters.projectName.length === 0
                      ) {
                        return true;
                      }
                      // If project filter is selected, only show members assigned to that project
                      if (!member.projects || member.projects.length === 0) {
                        return false; // If member has no projects, don't show them when a project is filtered
                      }
                      // Normalize project name for comparison (case-insensitive, trimmed)
                      const selectedProjectName = filters.projectName
                        .trim()
                        .toLowerCase();
                      // Check if any of the member's projects match the selected project
                      return member.projects.some(
                        (project: string) =>
                          project.trim().toLowerCase() === selectedProjectName
                      );
                    })
                    .map((member) => {
                      return {
                        value: member.id.toString(),
                        label: member.name,
                      };
                    }),
                ]}
                placeholder="Select Team Member"
              />
            </div>
          )}

          <div className="filter-group">
            <label htmlFor="start-date-filter">Start Date</label>
            <input
              type="date"
              id="start-date-filter"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              style={{
                padding: "0.75rem",
                border: "2px solid #e1e8ed",
                borderRadius: "8px",
                fontSize: "1rem",
                height: "42px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="due-date-filter">Due Date</label>
            <input
              type="date"
              id="due-date-filter"
              value={filters.dueDate}
              onChange={(e) => handleFilterChange("dueDate", e.target.value)}
              style={{
                padding: "0.75rem",
                border: "2px solid #e1e8ed",
                borderRadius: "8px",
                fontSize: "1rem",
                height: "42px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div className="filter-group">
            <label style={{ opacity: 0 }}>Actions</label>
            <button
              onClick={clearFilters}
              className="bg-white"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.25rem",
                color: "#374151",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                transition: "all 0.2s",
                height: "42px",
                boxSizing: "border-box",
              }}
            >
              <FilterX size={18} />
              Clear Filters
            </button>
          </div>
        </div>

        <div className="filter-results">
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="page-content">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <p>
              No tasks found.{" "}
              {tasks.length === 0
                ? "Create your first task to get started!"
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
            user={user}
          />
        )}
      </div>

      {showAddTask && (
        <AddTask
          onTaskAdded={handleTaskAdded}
          onClose={() => setShowAddTask(false)}
          user={user}
        />
      )}

      {editingTask && (
        <EditTask
          task={editingTask}
          onTaskUpdated={handleTaskUpdated}
          onClose={() => setEditingTask(null)}
          user={user}
        />
      )}

      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
};

export default Tasks;
