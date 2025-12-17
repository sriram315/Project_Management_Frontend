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

// Function to get the start (Monday) and end (Friday) of the current work week
const getCurrentWorkWeek = () => {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const monday = new Date(now);
  monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)); // Adjust to Monday
  
  // Calculate Friday of the current week
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4); // Add 4 days to get to Friday
  
  // Format as YYYY-MM-DD for date inputs
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  
  return {
    monday: formatDate(monday),
    friday: formatDate(friday)
  };
};

// Given any date string, return the Friday of that same week (ISO yyyy-mm-dd)
const getFridayOfWeek = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDay(); // 0=Sun, 6=Sat
  const diff = day === 0 ? 5 : day === 6 ? -1 : 5 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
};

const { monday: startOfWeek, friday: endOfWeek } = getCurrentWorkWeek();
const initialTaskFilters: TaskFilters = {
  projectId: null,
  projectName: null,
  assigneeId: null,
  startDate: startOfWeek,
  dueDate: endOfWeek,
};

const Tasks: React.FC<TasksProps> = ({ user }) => {
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(initialTaskFilters);
  const [pendingFilters, setPendingFilters] =
    useState<TaskFilters>(initialTaskFilters);
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

  const mapEmployeesToTeamMembers = (
    employeesData: any[],
    projectIdToNameMap: Map<number, string>,
    employeeProjectMap: Map<number, Set<string>>
  ) => {
    return employeesData.map((emp: any) => {
      let projectsStr = emp.projects || emp.project_names || "";
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
        projects: projectsStr,
      };
    });
  };

  const buildEmployeeProjectMap = (
    tasksData: Task[],
    projectIdToNameMap: Map<number, string>
  ) => {
    const employeeProjectMap = new Map<number, Set<string>>();
    tasksData.forEach((task) => {
      if (task.assignee_id && task.project_id) {
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
    return employeeProjectMap;
  };

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

        const employeeProjectMap = buildEmployeeProjectMap(
          fetchedTasks,
          projectIdToNameMap
        );

        teamData = mapEmployeesToTeamMembers(
          employeesData,
          projectIdToNameMap,
          employeeProjectMap
        );
      } else {
        // For super admin, fetch all data but keep employees project-scoped for filtering
        const [fetchedTasks, fetchedProjects, employeesData] =
          await Promise.all([
            taskAPI.getAll(),
            projectAPI.getAll(),
            dashboardAPI.getEmployees(), // include project info
          ]);

        tasksData = fetchedTasks;
        projectsData = fetchedProjects;

        const projectIdToNameMap = new Map<number, string>();
        fetchedProjects.forEach((project) => {
          projectIdToNameMap.set(project.id, project.name);
        });

        const employeeProjectMap = buildEmployeeProjectMap(
          fetchedTasks,
          projectIdToNameMap
        );

        teamData = mapEmployeesToTeamMembers(
          employeesData,
          projectIdToNameMap,
          employeeProjectMap
        );
      }

      setTasks(tasksData);
      setProjects(projectsData);
      setTeamMembers(teamData);
      setAllTeamMembers(teamData);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };
  // When project filter changes, refresh team members to only those in the project
  useEffect(() => {
    const loadTeamMembersForProject = async () => {
      if (user?.role === "employee") return;
      const projectId = pendingFilters.projectId;
      if (!projectId) {
        setTeamMembers(allTeamMembers);
        return;
      }
      try {
        const projectIdStr = projectId.toString();
        const employees = await dashboardAPI.getEmployees(
          projectIdStr,
          user?.id,
          user?.role
        );
        // Reuse existing maps for project names
        const projectIdToNameMap = new Map<number, string>();
        projects.forEach((p) => projectIdToNameMap.set(p.id, p.name));
        const employeeProjectMap = buildEmployeeProjectMap(tasks, projectIdToNameMap);
        const mapped = mapEmployeesToTeamMembers(
          employees,
          projectIdToNameMap,
          employeeProjectMap
        );
        setTeamMembers(mapped);
        // Clear invalid assignee selection if not in the new list
        if (
          pendingFilters.assigneeId &&
          !mapped.some((m) => m.id === pendingFilters.assigneeId)
        ) {
          handleFilterChange("assigneeId", null);
        }
      } catch (err) {
        console.error("Failed to load team members for project filter", err);
        // fallback to all team members
        setTeamMembers(allTeamMembers);
      }
    };
    loadTeamMembersForProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFilters.projectId]);

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
    // Update pending (form) state only; apply on submit
    if (key === "startDate" && typeof value === "string" && value) {
      const friday = getFridayOfWeek(value);
      setPendingFilters((prev) => ({
        ...prev,
        startDate: value,
        dueDate: friday,
      }));
      return;
    }

    setPendingFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
  };

  const clearFilters = () => {
    const { monday: startOfWeek, friday: endOfWeek } = getCurrentWorkWeek();
    const resetFilters: TaskFilters = {
      projectId: null,
      projectName: null,
      assigneeId: null,
      startDate: startOfWeek,
      dueDate: endOfWeek,
    };
    setPendingFilters(resetFilters);
    setFilters(resetFilters);
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
      <div className="page-header">
        <div>
          <h1 style={{ color: "white" }}>
            {user?.role === "employee" ? "My Tasks" : "Task Management"}
          </h1>
          <p style={{ fontSize: "0.9rem", marginTop: "0.25rem", opacity: 0.9, color: "rgba(255, 255, 255, 0.9)" }}>
            Manage and track all your tasks in one place
          </p>
        </div>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Search tasks by name, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{
              width: "300px",
            }}
          />
          <button
            onClick={() => setShowAddTask(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              color: "white",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: "600",
              transition: "all 0.3s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>+</span>
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
              value={pendingFilters.projectId?.toString() || ""}
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
                value={pendingFilters.assigneeId?.toString() || ""}
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
                value={pendingFilters.startDate}
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
                value={pendingFilters.dueDate}
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
            <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
  onClick={handleApplyFilters}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.5rem",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    height: "42px",
    width: "160px",
    boxSizing: "border-box",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
  }}
>
  Apply
</button>

<button
  onClick={clearFilters}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.5rem",
    color: "#475569",
    border: "2px solid #e2e8f0",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "600",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    height: "42px",
    width: "160px",
    boxSizing: "border-box",
    backgroundColor: "white",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.borderColor = "#cbd5e1";
    e.currentTarget.style.backgroundColor = "#f8fafc";
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.borderColor = "#e2e8f0";
    e.currentTarget.style.backgroundColor = "white";
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
  }}
>
  <FilterX size={18} />
  Clear
</button>

            </div>
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