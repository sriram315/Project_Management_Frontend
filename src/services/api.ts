import { Project, TeamMember, Task } from "../types";

const API_BASE_URL = "http://72.60.101.240:5005/api";

export interface CreateProjectData {
  name: string;
  description?: string;
  budget?: number;
  estimated_hours?: number;
  start_date?: string;
  end_date?: string;
  status?: "active" | "inactive" | "completed" | "dropped";
}

export interface CreateTaskData {
  name: string;
  description?: string;
  assignee_id: number;
  project_id: number;
  planned_hours: number;
  priority: "p1" | "p2" | "p3" | "p4";
  task_type:
    | "development"
    | "testing"
    | "design"
    | "documentation"
    | "review"
    | "meeting"
    | "other";
  due_date?: string;
  attachments?: string;
  status?: "todo" | "in_progress" | "completed" | "blocked";
}

export interface UpdateTaskData {
  name?: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed" | "blocked";
  priority?: "p1" | "p2" | "p3" | "p4";
  assignee_id?: number;
  project_id?: number;
  planned_hours?: number;
  actual_hours?: number;
  task_type?:
    | "development"
    | "testing"
    | "design"
    | "documentation"
    | "review"
    | "meeting"
    | "other";
  due_date?: string;
  attachments?: string;
  work_description?: string;
  productivity_rating?: number;
}

// Project API functions
export const projectAPI = {
  // Get all projects
  getAll: async (): Promise<Project[]> => {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }
    return response.json();
  },

  // Create new project
  create: async (
    projectData: CreateProjectData
  ): Promise<{ id: number; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create project");
    }

    return response.json();
  },

  // Update project
  update: async (
    id: number,
    projectData: Partial<CreateProjectData>
  ): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update project");
    }

    return response.json();
  },

  // Delete project
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete project");
    }

    return response.json();
  },
};

// Team API functions
export const teamAPI = {
  // Get all team members
  getAll: async (): Promise<TeamMember[]> => {
    const response = await fetch(`${API_BASE_URL}/team`);
    if (!response.ok) {
      throw new Error("Failed to fetch team members");
    }
    return response.json();
  },
};

// Project Team API functions
export const projectTeamAPI = {
  // Get team members for a specific project
  getProjectTeam: async (projectId: number): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/team`);
    if (!response.ok) {
      throw new Error("Failed to fetch project team members");
    }
    return response.json();
  },

  // Get available team members for a project
  getAvailableTeam: async (projectId: number): Promise<any[]> => {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/available-team`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch available team members");
    }
    return response.json();
  },

  // Add team member to project
  addTeamMember: async (
    projectId: number,
    userId: number,
    allocatedHoursPerWeek: number,
    username?: string,
    role?: string
  ): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/team`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        allocated_hours_per_week: allocatedHoursPerWeek,
        username: username,
        role: role,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add team member to project");
    }

    return response.json();
  },

  // Remove team member from project
  removeTeamMember: async (
    projectId: number,
    teamMemberId: number
  ): Promise<{ message: string }> => {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/team/${teamMemberId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to remove team member from project"
      );
    }

    return response.json();
  },

  // Update team member hours
  updateTeamMember: async (
    projectId: number,
    userId: number,
    allocatedHoursPerWeek: number
  ): Promise<{ message: string }> => {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/team/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allocated_hours_per_week: allocatedHoursPerWeek,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update team member hours");
    }

    return response.json();
  },
};

// Task API functions
export const taskAPI = {
  // Get all tasks
  getAll: async (): Promise<Task[]> => {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }
    return response.json();
  },

  // Get tasks by project
  getByProject: async (projectId: number): Promise<Task[]> => {
    const response = await fetch(`${API_BASE_URL}/tasks/project/${projectId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch project tasks");
    }
    return response.json();
  },

  // Get tasks by assignee
  getByAssignee: async (assigneeId: number): Promise<Task[]> => {
    const response = await fetch(
      `${API_BASE_URL}/tasks/assignee/${assigneeId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch assignee tasks");
    }
    return response.json();
  },

  // Create new task
  create: async (
    taskData: CreateTaskData
  ): Promise<{ id: number; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create task");
    }

    return response.json();
  },

  // Update task
  update: async (
    id: number,
    taskData: UpdateTaskData
  ): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update task");
    }

    return response.json();
  },

  // Delete task
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete task");
    }

    return response.json();
  },

  // Validate workload before creating task
  validateWorkload: async (data: {
    assignee_id: number;
    project_id: number;
    planned_hours: number;
    due_date: string;
  }): Promise<{
    isValid: boolean;
    warningLevel: "none" | "high" | "critical";
    warnings: string[];
    workload: {
      currentHours: number;
      newTaskHours: number;
      totalHours: number;
      availableHours: number;
      utilizationPercentage: number;
      allocatedHours: number;
      allocationUtilization: number;
      weeksUntilDue: number;
      currentTaskCount: number;
    };
  }> => {
    const response = await fetch(`${API_BASE_URL}/tasks/validate-workload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to validate workload");
    }

    return response.json();
  },
};

// Auth API functions
export const authAPI = {
  // Login
  login: async (
    username: string,
    password: string
  ): Promise<{ id: number; username: string; role: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    return response.json();
  },
};

// User-specific API functions
export const userAPI = {
  // Get projects assigned to a specific user
  getUserProjects: async (userId: number): Promise<Project[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/projects`);
    if (!response.ok) {
      throw new Error("Failed to fetch user projects");
    }
    return response.json();
  },

  // Get project details for a specific user
  getUserProjectDetails: async (
    userId: number,
    projectId: number
  ): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/projects/${projectId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch project details");
    }
    return response.json();
  },

  // Get tasks assigned to a specific user
  getUserTasks: async (userId: number): Promise<Task[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/tasks`);
    if (!response.ok) {
      throw new Error("Failed to fetch user tasks");
    }
    return response.json();
  },

  // Get tasks for a specific project assigned to a specific user
  getUserProjectTasks: async (
    userId: number,
    projectId: number
  ): Promise<Task[]> => {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/projects/${projectId}/tasks`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch project tasks");
    }
    return response.json();
  },
};

// Dashboard API
export const dashboardAPI = {
  getDashboardData: async (filters?: {
    projectId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.append("projectId", filters.projectId);
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    const response = await fetch(`${API_BASE_URL}/dashboard/data?${params}`);
    if (!response.ok) throw new Error("Failed to fetch dashboard data");
    return response.json();
  },

  getProjects: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/projects`);
    if (!response.ok) throw new Error("Failed to fetch projects");
    return response.json();
  },

  getEmployees: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/employees`);
    if (!response.ok) throw new Error("Failed to fetch employees");
    return response.json();
  },

  getTaskStatus: async (filters?: {
    projectId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();

    if (filters?.projectId) queryParams.append("projectId", filters.projectId);
    if (filters?.employeeId)
      queryParams.append("employeeId", filters.employeeId);
    if (filters?.startDate) queryParams.append("startDate", filters.startDate);
    if (filters?.endDate) queryParams.append("endDate", filters.endDate);

    const url = `${API_BASE_URL}/dashboard/task-status?${queryParams.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch task status data");
    return response.json();
  },

  getTasksTimeline: async (params: {
    role: string;
    userId: number;
    projectId?: string;
    employeeId?: string;
  }) => {
    const query = new URLSearchParams();
    query.append("role", params.role);
    query.append("userId", String(params.userId));
    if (params.projectId) query.append("projectId", params.projectId);
    if (params.employeeId) query.append("employeeId", params.employeeId);
    const response = await fetch(
      `${API_BASE_URL}/dashboard/tasks-timeline?${query.toString()}`
    );
    if (!response.ok) throw new Error("Failed to fetch tasks timeline");
    return response.json() as Promise<{ thisWeek: any[]; nextWeek: any[] }>;
  },
};

export default {
  authAPI,
  userAPI,
  teamAPI,
  projectAPI,
  projectTeamAPI,
  taskAPI,
  dashboardAPI,
};
