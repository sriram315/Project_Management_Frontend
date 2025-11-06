// Shared types for the entire application
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'manager' | 'team_lead' | 'employee';
  available_hours_per_week?: number;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  available_hours: number;
  status: 'online' | 'away' | 'offline';
  tasks_count: number;
  planned_hours: number;
  productivity: number;
  utilization: number;
  projects?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'completed' | 'dropped';
  progress: number;
  calculated_progress?: number;
  budget?: number;
  estimated_hours?: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  total_tasks?: number;
  team_members_count?: number;
}

export interface Task {
  id: number;
  name: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  priority: 'p1' | 'p2' | 'p3' | 'p4';
  assignee_id: number;
  assignee_name?: string;
  project_id: number;
  project_name?: string;
  planned_hours: number;
  actual_hours: number;
  task_type: 'development' | 'testing' | 'design' | 'documentation' | 'review' | 'meeting' | 'other';
  due_date?: string;
  attachments?: string;
  work_description?: string;
  productivity_rating?: number;
  created_at?: string;
  updated_at?: string;
  // Workload tracking fields
  workload_warning_level?: 'none' | 'high' | 'critical';
  workload_warnings?: string;
  utilization_percentage?: number;
  allocation_utilization?: number;
  weeks_until_due?: number;
  current_task_count?: number;
  total_workload_hours?: number;
  available_hours?: number;
  allocated_hours?: number;
}

export interface Metrics {
  total_available_hours: number;
  total_planned_hours: number;
  productivity: number;
  utilization: number;
}

// Dashboard specific types
export interface DashboardFilters {
  projectId?: number | number[]; // Support both single and multiple projects
  employeeId?: number | number[]; // Support both single and multiple employees
  startDate?: string;
  endDate?: string;
}

export interface WeeklyData {
  week: string;
  utilization: number;
  completed: number;
  hours: number;
  productivity: number;
  plannedHours: number;
  availableHours: number;
  totalAvailableHours?: number; // Total available hours for utilization calculation
}

export interface DashboardData {
  utilizationData: WeeklyData[];
  productivityData: WeeklyData[];
  availabilityData: WeeklyData[];
}
