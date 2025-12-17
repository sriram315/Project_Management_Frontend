import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardAPI, userAPI, taskAPI, API_BASE_URL } from "../services/api";
import {
  DashboardFilters as FilterType,
  WeeklyData,
  DashboardData,
} from "../types";
import DashboardFilters from "./DashboardFilters";
import UtilizationChart from "./charts/UtilizationChart";
import ProductivityChart from "./charts/ProductivityChart";
import AvailabilityChart from "./charts/AvailabilityChart";
import TaskStatusChart from "./charts/TaskStatusChart";
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  RocketLaunchIcon,
  PresentationChartLineIcon,
  StopCircleIcon,
} from "@heroicons/react/24/solid";
import axios from "axios";

// Using simple Unicode symbols instead of react-icons to avoid TypeScript issues

interface DashboardProps {
  user: any;
}

interface TaskStats {
  tasks?: Array<{
    id: number;
    name: string;
    status: string;
    actual_hours: number;
    planned_hours: number;
    assignee_id: number;
    project_id: number;
    username: string;
    due_date?: string | null;
    created_at?: string | null;
    available_hours_per_week?: number;
    week?: string;
  }>;
  taskStats?: {
    total?: number;
    completed?: number;
    blocked?: number;
    pending?: number;
    in_progress?: number;
  };
  final?: {
    productivity?: string | number;
    utilization?: string | number;
    available_hours?: number;
  };
  availabilityData?: WeeklyData[];
  productivityData?: WeeklyData[];
  utilizationData?: WeeklyData[];
  totalTasks?: number;
  completed?: number;
  blocked?: number;
  pending?: number;
  productivity?: number;
  utilization?: number;
  available_hours?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();

  // Get persisted filters from localStorage - user-specific storage
  // Note: This is only used for initial state. Filters are properly reset when user changes via useEffect
  // NOTE: Date range is NOT loaded from localStorage - it will always default to current week
  const getInitialFilters = (): FilterType => {
    // Always use user-specific key if user is available
    // Never use the old global 'dashboard-filters' key to avoid cross-user contamination
    if (user?.id && typeof window !== "undefined") {
      const storageKey = `dashboard-filters-${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            projectId: parsed.projectId ?? undefined,
            employeeId: parsed.employeeId ?? undefined,
            // Date range always defaults to undefined - will be set to current week by useEffect
            startDate: undefined,
            endDate: undefined,
          };
        } catch {
          /* ignore parse errors */
        }
      }
    }

    // Return empty filters - they will be set properly by the user-change effect
    return {
      projectId: undefined,
      employeeId: undefined,
      startDate: undefined,
      endDate: undefined,
    };
  };

  const [filters, setFilters] = useState<FilterType>(getInitialFilters());
  const [projects, setProjects] = useState<
    Array<{ id: number; name: string; status: string }>
  >([]);
  const [employees, setEmployees] = useState<
    Array<{ id: number; username: string; email: string; role: string }>
  >([]);
  const [allEmployees, setAllEmployees] = useState<
    Array<{ id: number; username: string; email: string; role: string }>
  >([]);
  const [taskStatusData, setTaskStatusData] = useState<{
    todo: number;
    in_progress: number;
    completed: number;
    blocked: number;
  }>({
    todo: 0,
    in_progress: 0,
    completed: 0,
    blocked: 0,
  });
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    utilizationData: [],
    productivityData: [],
    availabilityData: [],
  });
  const [tasksThisWeek, setTasksThisWeek] = useState<
    Array<{
      id: number;
      title: string;
      assignee: string;
      status: string;
      statusColor: string;
      estimated: number;
      logged: number;
      due_date?: string | null;
    }>
  >([]);
  const [tasksNextWeek, setTasksNextWeek] = useState<
    Array<{
      id: number;
      title: string;
      assignee: string;
      status: string;
      statusColor: string;
      estimated: number;
      logged: number;
      due_date?: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // Pagination state
  const [currentPageThisWeek, setCurrentPageThisWeek] = useState(1);
  const [currentPageNextWeek, setCurrentPageNextWeek] = useState(1);
  const [currentPageTaskStats, setCurrentPageTaskStats] = useState(1);
  const itemsPerPage = 5;
  const [selectedTask, setSelectedTask] = useState<{
    id: number;
    title: string;
    assignee: string;
    status: string;
    estimated: number;
    due_date?: string | null;
    source: "thisWeek" | "nextWeek";
  } | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats>({});
  const [dailyUpdates, setDailyUpdates] = useState<
    Array<{
      id: number;
      task_id: number;
      user_id: number;
      comment: string;
      created_at: string;
      username?: string;
    }>
  >([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [activeTaskView, setActiveTaskView] = useState<
    "thisWeek" | "nextWeek"
  >("thisWeek");

  // Display helper: show hyphen for null/empty API values
  const displayOrHyphen = (value: any): string | number => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number" && isNaN(value)) return "-";
    if (typeof value === "string" && value.trim() === "") return "-";
    return value as any;
  };

  const formatDueDate = (dateStr?: string | null): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const loadDailyUpdates = async (taskId: number) => {
    setLoadingUpdates(true);
    try {
      const updates = await taskAPI.getDailyUpdates(taskId);
      setDailyUpdates(updates);
    } catch (error) {
      console.error("Error fetching daily updates:", error);
      setDailyUpdates([]);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const loadTaskDetails = async (taskId: number) => {
    try {
      const details = await taskAPI.getById(taskId);
      setSelectedTask((prev) => {
        if (!prev || prev.id !== taskId) return prev;
        return {
          ...prev,
          due_date: details?.due_date || prev.due_date || null,
        };
      });
    } catch (error) {
      console.error("Error fetching task details:", error);
    }
  };

  const handleTaskSelection = async (
    task: {
      id: number;
      title: string;
      assignee: string;
      status: string;
      estimated: number;
      due_date?: string | null;
    },
    source: "thisWeek" | "nextWeek"
  ) => {
    const isExpanded =
      selectedTask &&
      selectedTask.source === source &&
      selectedTask.id === task.id;
    if (isExpanded) {
      setSelectedTask(null);
      setDailyUpdates([]);
      return;
    }

    setSelectedTask({
      id: task.id,
      title: task.title,
      assignee: task.assignee,
      status: task.status,
      estimated: task.estimated,
      due_date: task.due_date || null,
      source,
    });

    loadDailyUpdates(task.id);
    loadTaskDetails(task.id);
  };

  const fetchInitialData = async () => {
    try {
      // For employees, fetch only their assigned projects
      // For managers/team leads, fetch only their assigned projects via project_assignments
      // For super admin, fetch all projects
      let projectsPromise;
      if (user?.role === "employee") {
        projectsPromise = userAPI.getUserProjects(user.id);
      } else if (user?.role === "manager" || user?.role === "team_lead") {
        projectsPromise = dashboardAPI.getProjects(user.id, user.role);
      } else {
        projectsPromise = dashboardAPI.getProjects();
      }

      const [projectsRes, employeesRes, taskStatusRes] = await Promise.all([
        projectsPromise,
        dashboardAPI.getEmployees(undefined, user?.id, user?.role), // Fetch employees based on user role (no project filter = get employees from assigned projects for managers)
        dashboardAPI.getTaskStatus({
          userId: user?.id,
          userRole: user?.role,
        }),
      ]);

      setProjects(projectsRes);
      setEmployees(employeesRes);
      setAllEmployees(employeesRes); // Store all employees for reference
      setTaskStatusData(taskStatusRes);

      // Set default date range to Monday-Friday of current week
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // Calculate Monday of current week
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);

      // Calculate Friday of current week (4 days after Monday)
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      // Use local date formatting to avoid UTC shifts from toISOString()
      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Fill ONLY missing fields; preserve any persisted selections from localStorage
      // Note: Filters are now managed by the user-change effect, so we only set defaults if not already set
      setFilters((prev) => {
        // Only update if filters are not already initialized (to avoid overriding user-specific filters)
        if (!prev.startDate || !prev.endDate) {
          return {
            ...prev,
            employeeId:
              prev.employeeId !== undefined
                ? prev.employeeId
                : user?.role === "employee"
                ? user.id
                : undefined,
            startDate: prev.startDate || formatDateLocal(monday),
            endDate: prev.endDate || formatDateLocal(friday),
          };
        }
        return prev;
      });
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Build effective filters so first load is always scoped and dated
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Validate and normalize dates
      const validateDate = (dateStr: string | undefined): string | null => {
        if (!dateStr) return null;
        // Check if date string is in valid format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateStr)) return null;

        const date = new Date(dateStr);
        // Check if date is valid
        if (isNaN(date.getTime())) return null;
        return dateStr;
      };

      let effectiveStartDate = filters.startDate
        ? validateDate(filters.startDate)
        : null;
      let effectiveEndDate = filters.endDate
        ? validateDate(filters.endDate)
        : null;

      // If both dates are provided, validate that start <= end
      if (effectiveStartDate && effectiveEndDate) {
        const start = new Date(effectiveStartDate);
        const end = new Date(effectiveEndDate);
        if (start > end) {
          // Invalid range: swap dates or use defaults
          console.warn(
            "Invalid date range: start date is after end date. Using defaults."
          );
          effectiveStartDate = formatDateLocal(monday);
          effectiveEndDate = formatDateLocal(friday);
        }
      }

      // If only one date is provided, validate it's not invalid
      if (effectiveStartDate && !effectiveEndDate) {
        effectiveEndDate = formatDateLocal(friday);
      }
      if (!effectiveStartDate && effectiveEndDate) {
        effectiveStartDate = formatDateLocal(monday);
      }

      // Use defaults if both are invalid or missing
      if (!effectiveStartDate) {
        effectiveStartDate = formatDateLocal(monday);
      }
      if (!effectiveEndDate) {
        effectiveEndDate = formatDateLocal(friday);
      }

      // Handle single or array employeeId
      let effectiveEmployeeId: number | number[] | undefined;
      if (user?.role === "employee") {
        effectiveEmployeeId = filters.employeeId || user?.id;
      } else {
        effectiveEmployeeId = filters.employeeId;
      }

      // Convert projectId and employeeId to comma-separated strings for API
      const projectIdStr = Array.isArray(filters.projectId)
        ? filters.projectId.join(",")
        : filters.projectId?.toString();

      const employeeIdStr = Array.isArray(effectiveEmployeeId)
        ? effectiveEmployeeId.join(",")
        : effectiveEmployeeId?.toString();

      // For timeline: employees default to their own tasks; managers/team leads see all tasks from their assigned projects (unless employeeId is explicitly selected)
      const timelineEmployeeIdStr =
        user?.role === "employee"
          ? employeeIdStr || String(user?.id)
          : employeeIdStr;
      // For stats/charts: employees default to their own tasks; managers/team leads see all tasks from their assigned projects (unless employeeId is explicitly selected)
      const statsEmployeeIdStr =
        user?.role === "employee"
          ? employeeIdStr || String(user?.id)
          : employeeIdStr;

      // Calculate dates for timeline: always use actual calendar weeks (this week + next week)
      // This ensures "Tasks This Week" and "Tasks Next Week" always show actual calendar weeks
      // regardless of the date filter
      // Reuse monday (already calculated as this week's Monday) and calculate next week from there
      const thisWeekMonday = monday;
      const nextWeekMonday = new Date(thisWeekMonday);
      nextWeekMonday.setDate(thisWeekMonday.getDate() + 7);
      const nextWeekFriday = new Date(nextWeekMonday);
      nextWeekFriday.setDate(nextWeekMonday.getDate() + 4);

      // Timeline dates: from this week Monday to next week Friday
      const timelineStartDate = formatDateLocal(thisWeekMonday);
      const timelineEndDate = formatDateLocal(nextWeekFriday);

      const [tasksTimeline] = await Promise.all([
        // dashboardAPI.getDashboardData({
        //   projectId: projectIdStr,
        //   employeeId: statsEmployeeIdStr,
        //   startDate: effectiveStartDate,
        //   endDate: effectiveEndDate,
        //   userId: user?.id,
        //   userRole: user?.role,
        // }),
        // dashboardAPI.getTaskStatus({
        //   projectId: projectIdStr,
        //   employeeId: statsEmployeeIdStr,
        //   // Don't filter by date for task status - show all tasks from assigned projects
        //   // startDate: effectiveStartDate,
        //   // endDate: effectiveEndDate,
        //   userId: user?.id,
        //   userRole: user?.role,
        // }),
        dashboardAPI.getTasksTimeline({
          role: user?.role || "employee",
          userId: user?.id || 0,
          projectId: projectIdStr,
          employeeId: timelineEmployeeIdStr,
          startDate: timelineStartDate,
          endDate: timelineEndDate,
        }),
      ]);
      // setDashboardData(data);
      // Task status data will be updated from fetchData() which calls newData endpoint
      const thisWeekTasks = tasksTimeline.thisWeek || [];
      const nextWeekTasks = tasksTimeline.nextWeek || [];
      setTasksThisWeek(thisWeekTasks);
      setTasksNextWeek(nextWeekTasks);

      // Reset pagination when data changes
      setCurrentPageThisWeek(1);
      setCurrentPageNextWeek(1);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Force refresh data when component mounts or user changes
  useEffect(() => {
    fetchData();
    // Reset page numbers when filters change
    setCurrentPageThisWeek(1);
    setCurrentPageNextWeek(1);
    setCurrentPageTaskStats(1);
  }, [user?.id, user?.role, forceRefreshKey]);

  // Reset filters when user changes (user.id or user.role changes)
  useEffect(() => {
    if (user?.id) {
      // Reset filters to persisted values (date range always defaults to current week on refresh)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const storageKey = `dashboard-filters-${user.id}`;
      const savedFilters = localStorage.getItem(storageKey);

      if (savedFilters) {
        try {
          const saved = JSON.parse(savedFilters);
          setFilters({
            projectId: saved.projectId ?? undefined,
            employeeId: saved.employeeId ?? undefined,
            // Date range always defaults to current week (Monday-Friday) on page refresh
            startDate: formatDateLocal(monday),
            endDate: formatDateLocal(friday),
          });
        } catch {
          // If parsing fails, use defaults
          setFilters({
            projectId: undefined,
            employeeId: user?.role === "employee" ? user.id : undefined,
            startDate: formatDateLocal(monday),
            endDate: formatDateLocal(friday),
          });
        }
      } else {
        // No saved filters for this user, use defaults
        setFilters({
          projectId: undefined,
          employeeId: user?.role === "employee" ? user.id : undefined,
          startDate: formatDateLocal(monday),
          endDate: formatDateLocal(friday),
        });
      }
    }
  }, [user?.id, user?.role]); // Reset when user changes

  // On page load, fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, [user?.id, user?.role]); // Re-fetch when user changes

  function getThisWeekRange() {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

    // Calculate Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7)); // ensures Monday even if today is Sunday

    // Calculate Friday
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    // Format to YYYY-MM-DD
    const format = (d: any) => d.toISOString().split("T")[0];

    return {
      monday: format(monday),
      friday: format(friday),
    };
  }

  const fetchData = async (overrideFilters?: FilterType) => {
    const activeFilters = overrideFilters ?? filters;
    const { monday, friday } = getThisWeekRange();

    // Use filters if dates are available, otherwise use defaults
    const effectiveStartDate = activeFilters.startDate || monday;
    const effectiveEndDate = activeFilters.endDate || friday;

    // Handle projectId - if undefined, default to all assigned projects for employees/managers/team leads
    let effectiveProjectId: number | number[] | undefined;
    if (activeFilters.projectId !== undefined) {
      // Use filter value if set
      effectiveProjectId = activeFilters.projectId;
    } else if (
      user?.role === "employee" ||
      user?.role === "manager" ||
      user?.role === "team_lead"
    ) {
      // For employees/managers/team leads, default to all their assigned projects
      if (projects.length > 0) {
        effectiveProjectId = projects.map((p) => p.id);
      }
    }
    // For super_admin, leave as undefined to show all projects

    // Handle employeeId based on project selection
    // If project is selected, include all employees assigned to that project
    // If no project is selected, include all employees
    // Exception: if employeeId filter is explicitly set, use that instead
    // Note: Filter out super_admin users from employees list before processing
    let effectiveEmployeeId: number | number[] | undefined;
    let noEmployeesForSelectedProject = false;

    // Filter out super_admin users from employees lists
    const filteredEmployees = employees.filter(
      (emp) => emp && emp.id && emp.role !== "super_admin"
    );
    const filteredAllEmployees = allEmployees.filter(
      (emp) => emp && emp.id && emp.role !== "super_admin"
    );

    // If employeeId filter is explicitly set, use it (for all roles)
    if (activeFilters.employeeId !== undefined) {
      effectiveEmployeeId = activeFilters.employeeId;
    } else if (user?.role === "employee") {
      // For employees, default to their own ID if no filter is set
      effectiveEmployeeId = user?.id;
    } else if (
      user?.role === "manager" ||
      user?.role === "team_lead" ||
      user?.role === "super_admin"
    ) {
      // For manager, team_lead, and super_admin roles
      // Note: super_admin users are excluded from the employees list
      if (activeFilters.projectId !== undefined) {
        // Project is selected - use all employees from that project (excluding super_admin users)
        if (filteredEmployees.length > 0) {
          effectiveEmployeeId = filteredEmployees.map((emp) => emp.id);
        } else {
          // Explicitly signal no employees for this project
          effectiveEmployeeId = -1;
          noEmployeesForSelectedProject = true;
        }
      } else {
        // No project selected - use all employees (excluding super_admin users)
        if (filteredAllEmployees.length > 0) {
          effectiveEmployeeId = filteredAllEmployees.map((emp) => emp.id);
        }
      }
    }

    // Convert projectId and employeeId to comma-separated strings for API
    const projectIdStr = Array.isArray(effectiveProjectId)
      ? effectiveProjectId.join(",")
      : effectiveProjectId?.toString();

    const employeeIdStr = Array.isArray(effectiveEmployeeId)
      ? effectiveEmployeeId.join(",")
      : effectiveEmployeeId?.toString();

    // Build payload - only include projectId and employeeId if they have values
    const payload: {
      projectId?: string;
      employeeId?: string;
      startDate: string;
      endDate: string;
    } = {
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
    };

    // Only include projectId if it has a value
    if (projectIdStr) {
      payload.projectId = projectIdStr;
    }

    // Only include employeeId if it has a value
    if (employeeIdStr) {
      payload.employeeId = employeeIdStr;
    }

    try {
      // const res = await axios.post(
      //   `${API_BASE_URL}/dashboard/raw-tasks`,
      //   payload
      // );
      const res = await axios.post(
        `${API_BASE_URL}/dashboard/newData`,
        payload
      );

      // If no employees are assigned to the selected project, force zeroed stats/availability
      const adjustedData =
        noEmployeesForSelectedProject && activeFilters.projectId !== undefined
          ? {
              ...res.data,
              taskStats: { total: 0, completed: 0, blocked: 0, pending: 0, in_progress: 0 },
              tasks: [],
              productivityData: [],
              utilizationData: [],
              availabilityData: [],
              final: {
                ...(res.data?.final || {}),
                available_hours: 0,
                productivity: 0,
                utilization: 0,
              },
            }
          : res.data;

      setTaskStats(adjustedData);

      // Update taskStatusData from the response
      if (adjustedData?.taskStats) {
        setTaskStatusData({
          todo: adjustedData.taskStats.todo || 0,
          in_progress: adjustedData.taskStats.in_progress || 0,
          completed: adjustedData.taskStats.completed || 0,
          blocked: adjustedData.taskStats.blocked || 0,
        });
      }

      // Reset pagination when new data is fetched
      setCurrentPageTaskStats(1);
    } catch (error) {
      console.error("Error fetching task stats:", error);
    }
  };

  const clearFilters = () => {
    setFilters({
      projectId: undefined,
      employeeId: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    // Force a refresh after clearing filters
    setForceRefreshKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    // Explicitly refetch using the current filters only when refresh is clicked
    fetchDashboardData();
    fetchData();
    setForceRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    if (user && projects.length > 0) {
      fetchDashboardData();
      fetchData();
    }
  }, [forceRefreshKey, user, projects]);

  // Fetch employees when project filter changes
  useEffect(() => {
    const fetchEmployeesForProject = async () => {
      if (!user) return;

      const currentProjectId = filters.projectId;
      const currentEmployeeId = filters.employeeId;

      try {
        // Convert projectId to comma-separated string if array
        const projectIdStr = Array.isArray(currentProjectId)
          ? currentProjectId.join(",")
          : currentProjectId?.toString();

        const employeesRes = await dashboardAPI.getEmployees(
          projectIdStr,
          user.id,
          user.role
        );
        setEmployees(employeesRes);

        // If current employeeId (single or array) contains IDs not in the filtered list, remove them
        if (currentEmployeeId) {
          const employeeIds = Array.isArray(currentEmployeeId)
            ? currentEmployeeId
            : [currentEmployeeId];
          const validEmployeeIds = employeeIds.filter((id) =>
            employeesRes.some((e: any) => e.id === id)
          );

          if (validEmployeeIds.length !== employeeIds.length) {
            setFilters((prev) => ({
              ...prev,
              employeeId:
                validEmployeeIds.length === 0
                  ? undefined
                  : validEmployeeIds.length === 1
                  ? validEmployeeIds[0]
                  : validEmployeeIds,
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching employees for project:", error);
      }
    };

    fetchEmployeesForProject();
  }, [filters.projectId, user]);

  // After projects and employees are loaded, scrub the filters state:
  useEffect(() => {
    if (!projects.length && !employees.length) return;

    const arraysEqual = (a?: number | number[], b?: number | number[]) => {
      const arrA = Array.isArray(a)
        ? [...a].sort((x, y) => Number(x) - Number(y))
        : a === undefined
        ? []
        : [a];
      const arrB = Array.isArray(b)
        ? [...b].sort((x, y) => Number(x) - Number(y))
        : b === undefined
        ? []
        : [b];
      if (arrA.length !== arrB.length) return false;
      for (let i = 0; i < arrA.length; i++)
        if (arrA[i] !== arrB[i]) return false;
      return true;
    };

    setFilters((prev) => {
      // Validate projectId (preserve array vs single type)
      let validProjectId: number | number[] | undefined = undefined;
      if (Array.isArray(prev.projectId)) {
        const valid = prev.projectId.filter((id) =>
          projects.some((p) => p.id === id)
        );
        validProjectId = valid.length > 0 ? valid : undefined; // keep array, do not collapse to single
      } else if (prev.projectId) {
        validProjectId = projects.some((p) => p.id === prev.projectId)
          ? prev.projectId
          : undefined;
      }

      // Validate employeeId (preserve array vs single type)
      let validEmployeeId: number | number[] | undefined = undefined;
      if (Array.isArray(prev.employeeId)) {
        const valid = prev.employeeId.filter((id) =>
          employees.some((e) => e.id === id)
        );
        validEmployeeId = valid.length > 0 ? valid : undefined; // keep array, do not collapse to single
      } else if (prev.employeeId) {
        validEmployeeId = employees.some((e) => e.id === prev.employeeId)
          ? prev.employeeId
          : undefined;
      }

      const next: FilterType = {
        ...prev,
        projectId: validProjectId,
        employeeId: validEmployeeId,
        startDate: prev.startDate,
        endDate: prev.endDate,
      };

      // Deep-ish equality for ids (arrays by value, singles by value)
      const isSame =
        arraysEqual(prev.projectId as any, next.projectId as any) &&
        arraysEqual(prev.employeeId as any, next.employeeId as any) &&
        prev.startDate === next.startDate &&
        prev.endDate === next.endDate;

      return isSame ? prev : next;
    });
  }, [projects, employees]);

  // Fetch dashboard data on initial mount and manual refresh only (not on filter change)
  // useEffect(() => {
  //   fetchDashboardData();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [forceRefreshKey, user]);

  // When filters change, also update localStorage (user-specific)
  const persistFilters = (newFilters: FilterType) => {
    // Normalize projectId and employeeId for storage (keep arrays as arrays)
    const normalizedFilters = {
      ...newFilters,
      projectId: newFilters.projectId
        ? Array.isArray(newFilters.projectId)
          ? newFilters.projectId
          : Number(newFilters.projectId)
        : undefined,
      employeeId: newFilters.employeeId
        ? Array.isArray(newFilters.employeeId)
          ? newFilters.employeeId
          : Number(newFilters.employeeId)
        : undefined,
      startDate: newFilters.startDate,
      endDate: newFilters.endDate,
    };

    // Store filters with user-specific key
    const storageKey = user?.id
      ? `dashboard-filters-${user.id}`
      : "dashboard-filters";
    localStorage.setItem(storageKey, JSON.stringify(normalizedFilters));
    setFilters(normalizedFilters);
  };

  // The filter handler: only updates state/local storage; refresh button will fetch
  const handleFilterChange = (newFilters: Partial<FilterType>) => {
    setFilters((prev) => {
      const updatedFilters: FilterType = {
        ...prev,
        ...newFilters,
      };

      // Persist updated filters for user (without triggering fetch)
      // Note: Date range is NOT saved to localStorage - it will always default to current week on refresh
      const storageKey = user?.id
        ? `dashboard-filters-${user.id}`
        : "dashboard-filters";
      const normalizedForStorage = {
        projectId: Array.isArray(updatedFilters.projectId)
          ? updatedFilters.projectId
          : updatedFilters.projectId !== undefined
          ? Number(updatedFilters.projectId)
          : undefined,
        employeeId: Array.isArray(updatedFilters.employeeId)
          ? updatedFilters.employeeId
          : updatedFilters.employeeId !== undefined
          ? Number(updatedFilters.employeeId)
          : undefined,
        // Explicitly exclude startDate and endDate from being saved
      };
      localStorage.setItem(storageKey, JSON.stringify(normalizedForStorage));

      return updatedFilters;
    });
  };

  // Calculate metrics from data
  const totalTasks =
    taskStatusData.todo +
    taskStatusData.in_progress +
    taskStatusData.completed +
    taskStatusData.blocked;
  const completedTasks = taskStatusData.completed;
  const blockedTasks = taskStatusData.blocked;

  // Calculate productivity: use overall metrics from backend if available, otherwise calculate from weekly data
  // Productivity = (Planned / Actual) × 100 (only for completed tasks)
  const calculateProductivity = () => {
    // Prefer overallMetrics from backend (more accurate - aggregates all tasks)
    if (
      dashboardData.overallMetrics &&
      dashboardData.overallMetrics.productivity !== undefined &&
      dashboardData.overallMetrics.productivity !== null
    ) {
      return Math.round(dashboardData.overallMetrics.productivity);
    }

    // Fallback: calculate from weekly data using hours-based formula
    // Only use weeks that have productivity values (completed tasks)
    if (
      !dashboardData.productivityData ||
      dashboardData.productivityData.length === 0
    ) {
      return null;
    }

    // Filter to only weeks with productivity values (completed tasks)
    const weeksWithProductivity = dashboardData.productivityData.filter(
      (week) => week.productivity !== null && week.productivity !== undefined
    );

    if (weeksWithProductivity.length === 0) {
      return null; // No completed tasks
    }

    // Calculate overall productivity: (total planned hours / total actual hours) × 100
    // Only for completed tasks
    const totalActualHours = weeksWithProductivity.reduce(
      (sum, week) => sum + (week.hours || 0),
      0
    );
    const totalPlannedHours = weeksWithProductivity.reduce(
      (sum, week) => sum + (week.plannedHours || 0),
      0
    );

    if (totalActualHours > 0) {
      return Math.round((totalPlannedHours / totalActualHours) * 100);
    }

    return null;
  };
  
  const productivity = calculateProductivity();

  // Calculate utilization: use overall metrics from backend if available, otherwise calculate from weekly data
  // Utilization = (Planned / Available) × 100
  const calculateUtilization = () => {
    // Prefer overallMetrics from backend (more accurate - aggregates all tasks)
    if (
      dashboardData.overallMetrics &&
      dashboardData.overallMetrics.utilization !== undefined
    ) {
      return Math.round(dashboardData.overallMetrics.utilization);
    }

    // Fallback: calculate from weekly data
    if (
      !dashboardData.utilizationData ||
      dashboardData.utilizationData.length === 0
    ) {
      return null;
    }

    // Calculate overall utilization: (total planned hours / total available hours) × 100
    const totalPlannedHours = dashboardData.productivityData.reduce(
      (sum, week) => sum + (week.plannedHours || 0),
      0
    );
    const totalAvailableHours = dashboardData.utilizationData.reduce(
      (sum, week) => sum + (week.availableHours || 0),
      0
    );

    if (totalAvailableHours > 0) {
      return Math.round((totalPlannedHours / totalAvailableHours) * 100);
    }

    return null;
  };

  const utilization = calculateUtilization();

  // Calculate available hours: sum of available hours from availability data
  const calculateAvailableHours = () => {
    if (
      !dashboardData.availabilityData ||
      dashboardData.availabilityData.length === 0
    ) {
      return null;
    }

    // Sum all available hours from all weeks
    const totalAvailableHours = dashboardData.availabilityData.reduce(
      (sum, week) => sum + (week.availableHours || 0),
      0
    );
    return totalAvailableHours > 0 ? Math.round(totalAvailableHours) : null;
  };
  const availableHours = calculateAvailableHours();
  const trendData =
    taskStats?.utilizationData && taskStats.utilizationData.length > 0
      ? taskStats.utilizationData
      : taskStats?.productivityData || [];

  // Metric cards
  const baseStats: Array<{
    label: string;
    value: number | string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    trend: string;
    trendColor: string;
  }> = [
    {
      label: "Total Tasks",
      // value: displayOrHyphen(totalTasks),
      value: taskStats?.taskStats?.total || 0,
      icon: ClipboardDocumentListIcon,
      color: "bg-indigo-500",
      trend: "+12% vs last week",
      trendColor: "text-green-600",
    },
    {
      label: "Completed",
      // value: displayOrHyphen(completedTasks),
      value: taskStats?.taskStats?.completed || 0,
      icon: CheckCircleIcon,
      color: "bg-indigo-500",
      trend: "+3 this week",
      trendColor: "text-green-600",
    },
    {
      label: "Blocked",
      // value: displayOrHyphen(blockedTasks),
      value: taskStats?.taskStats?.blocked || 0,
      icon: ExclamationTriangleIcon,
      color: "bg-indigo-500",
      trend: "needs attention",
      trendColor: "text-red-600",
    },
    {
      label: "Pending",
      // value: displayOrHyphen(totalTasks - completedTasks),
      value: taskStats?.taskStats?.pending || 0,
      icon: ClockIcon,
      color: "bg-indigo-500",
      trend: "+3 this week",
      trendColor: "text-green-600",
    },
    {
      label: "Productivity",
      // value:
      //   typeof productivity === "number" && !isNaN(productivity)
      //     ? `${productivity}%`
      //     : "0%",
      value: `${taskStats?.final?.productivity || 0}%`,
      icon: RocketLaunchIcon,
      color: "bg-indigo-500",
      trend: "+5% improvement",
      trendColor: "text-green-600",
    },
    {
      label: "Utilization",
      // value:
      //   typeof utilization === "number" && !isNaN(utilization)
      //     ? `${utilization}%`
      //     : "0%",
      value: `${taskStats?.final?.utilization || 0}%`,
      icon: PresentationChartLineIcon,
      color: "bg-indigo-500",
      trend: "+2% this week",
      trendColor: "text-green-600",
    },
    {
      label: "Available Hours",
      // value:
      //   typeof availableHours === "number" && !isNaN(availableHours)
      //     ? availableHours
      //     : displayOrHyphen(availableHours),
      value: taskStats?.final?.available_hours || 0,
      icon: StopCircleIcon,
      color: "bg-indigo-500",
      trend: "per week",
      trendColor: "text-gray-600",
    },
  ];

  // Use base stats only (Budget card removed)
  const stats = baseStats;

  // Color styles for metric cards (borders). Icon background uses utilization color.
  const metricColorVariants = [
    {
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      border: "#667eea",
    },
    {
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      border: "#f5576c",
    },
    {
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      border: "#4facfe",
    },
    {
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      border: "#43e97b",
    },
    {
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      border: "#fa709a",
    },
    {
      gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
      border: "#30cfd0",
    }, // Utilization blue
    {
      gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      border: "#a8edea",
    },
  ];
  const utilizationIconBackground =
    metricColorVariants[5]?.gradient || metricColorVariants[0].gradient;
  const totalTasksBorderColor = metricColorVariants[0].border;

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header with Filters */}
        <div className="dashboard-header-section">
          <div className="dashboard-header-content">
            <div className="dashboard-title-section">
              <h1 className="dashboard-title">Project Dashboard</h1>
              <p className="dashboard-subtitle">
                Welcome back,{" "}
                <span className="username-highlight">
                  {user?.username || "User"}
                </span>
                !
              </p>
            </div>
            <div className="dashboard-actions">
              <DashboardFilters
                filters={filters}
                projects={projects}
                employees={employees}
                onFilterChange={handleFilterChange}
                userRole={user?.role}
              />
              <button
                onClick={handleRefresh}
                className="refresh-button"
              >
                <span className="refresh-icon">🔄</span>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        {/* <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${stats.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          {stats.map((stat) => {
            return (
              <div key={stat.label} className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm border border-gray-200">
                <div className="pt-6 px-6 pb-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                      <p className="text-3xl font-bold mt-2 text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`${stat.color} p-3 rounded-lg flex items-center justify-center`}>
                      <span className="text-2xl">{stat.icon}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div> */}

        {/* Metric Cards - All in One Row (7 columns) */}
        <div className="metrics-grid metrics-grid-single-row">
          {stats.map((stat) => {
            const IconComponent = stat.icon;

            return (
              <div
                key={stat.label}
                className="metric-card"
                style={{
                  borderLeftColor: totalTasksBorderColor,
                }}
              >
                <div className="metric-card-content">
                  <div className="metric-card-header">
                    <div
                      className="metric-icon-wrapper"
                      style={{ background: utilizationIconBackground }}
                    >
                      <IconComponent className="metric-icon" />
                    </div>
                    <div className="metric-info">
                      <p className="metric-label">{stat.label}</p>
                      <p className="metric-value">{stat.value}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tasks This Week and Next Week */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks This Week */}
        {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Tasks This Week</h3>
              <div className="mt-4 space-y-3">
                {tasksThisWeek.slice(0, 4).map((task) => {
                  const statusTextClass = task.status === 'Completed'
                    ? 'text-green-600'
                    : task.status === 'In Progress'
                    ? 'text-cyan-600'
                    : task.status === 'Blocked'
                    ? 'text-red-600'
                    : 'text-muted-foreground';
                  const barColor = task.status === 'Completed'
                    ? '#22c55e'
                    : task.status === 'In Progress'
                    ? '#06b6d4'
                    : task.status === 'Blocked'
                    ? '#ef4444'
                    : '#f59e0b';
                  return (
                    <div key={task.id} className="flex items-center justify-between p-4 pb-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors" style={{ marginBottom: '10px' }}>
                      <div className="flex items-center gap-3 flex-1 " >
                        <div className="px-2" style={{ width: '4px', alignSelf: 'stretch', backgroundColor: barColor, borderRadius: '4px' }}></div>
                        <div className="flex-1" style={{ paddingLeft: '20px' }}>
                          <p className="font-medium text-sm text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500">{task.assignee}</p>
                          <p className="text-xs text-gray-600 mt-1">Estimated: {task.estimated}h</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${statusTextClass}`}>{task.status}</span>
                    </div>
                  );
                })}
                {tasksThisWeek.length === 0 && (
                  <div className="w-full flex items-center justify-center text-gray-400 text-2xl">-</div>
                )}
              </div>
            </div>
          </div>

          {/* Tasks Next Week */}
        {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">Tasks Next Week</h3>
              <div className="mt-4 space-y-3">
                {tasksNextWeek.slice(0, 4).map((task) => {
                  const statusTextClass = task.status === 'Completed'
                    ? 'text-green-600'
                    : task.status === 'In Progress'
                    ? 'text-cyan-600'
                    : task.status === 'Blocked'
                    ? 'text-red-600'
                    : 'text-muted-foreground';
                  const barColor = task.status === 'Completed'
                    ? '#22c55e'
                    : task.status === 'In Progress'
                    ? '#06b6d4'
                    : task.status === 'Blocked'
                    ? '#ef4444'
                    : '#f59e0b';
                  return (
                    <div key={task.id} className="flex items-center justify-between p-4 pb-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors" style={{ marginBottom: '10px' }}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className="px-2" style={{ width: '4px', alignSelf: 'stretch', backgroundColor: barColor, borderRadius: '4px' }}></div>
                        <div className="flex-1" style={{ paddingLeft: '20px' }}>
                          <p className="font-medium text-sm text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500">{task.assignee}</p>
                          <p className="text-xs text-gray-600 mt-1">Estimated: {task.estimated}h</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${statusTextClass}`}>{task.status}</span>
                    </div>
                  );
                })}
                {tasksNextWeek.length === 0 && (
                  <div className="w-full flex items-center justify-center text-gray-400 text-2xl">-</div>
                )}
              </div>
            </div>
          </div>
        </div> */}

        <div className="dashboard-main-grid">
          <div className="dashboard-left-col">
            {/* Tasks view with compact tabs */}
            <div className="tasks-section">
              <div className="tasks-panel">
                <div className="tasks-nav">
                  <button
                    className={`tasks-tab ${
                      activeTaskView === "thisWeek" ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveTaskView("thisWeek");
                      setCurrentPageThisWeek(1);
                    }}
                  >
                    Tasks This Week
                  </button>
                  <button
                    className={`tasks-tab ${
                      activeTaskView === "nextWeek" ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveTaskView("nextWeek");
                      setCurrentPageNextWeek(1);
                    }}
                  >
                    Tasks Next Week
                  </button>
                </div>

                {activeTaskView === "thisWeek" ? (
                  <div className="task-card task-card-compact">
                    <div className="task-card-header">
                      <div className="task-card-title-section">
                        <h3 className="task-card-title">📅 Tasks This Week</h3>
                        {tasksThisWeek.length > 0 && (
                          <span className="task-count-badge">
                            {tasksThisWeek.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="task-table-container">
                      <table className="task-table">
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Assignee</th>
                            <th className="status-column">Status</th>
                            <th>Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasksThisWeek.length === 0 && (
                            <tr>
                              <td colSpan={4} className="empty-task-message">
                                <div className="empty-state-content">
                                  <span className="empty-icon">📋</span>
                                  <p>No tasks for this week</p>
                                </div>
                              </td>
                            </tr>
                          )}
                          {tasksThisWeek
                            .slice(
                              (currentPageThisWeek - 1) * itemsPerPage,
                              currentPageThisWeek * itemsPerPage
                            )
                            .map((task) => {
                              const statusConfig =
                                task.status === "Completed"
                                  ? {
                                      class: "status-completed",
                                      color: "#10b981",
                                      bg: "#d1fae5",
                                    }
                                  : task.status === "In Progress"
                                  ? {
                                      class: "status-in-progress",
                                      color: "#06b6d4",
                                      bg: "#cffafe",
                                    }
                                  : task.status === "Blocked"
                                  ? {
                                      class: "status-blocked",
                                      color: "#ef4444",
                                      bg: "#fee2e2",
                                    }
                                  : {
                                      class: "status-todo",
                                      color: "#6366f1",
                                      bg: "#e0e7ff",
                                    };
                              const isExpanded =
                                selectedTask &&
                                selectedTask.source === "thisWeek" &&
                                selectedTask.id === task.id;
                              return (
                                <React.Fragment key={`fragment-${task.id}`}>
                                  <tr
                                    className={`task-row ${
                                      isExpanded ? "expanded" : ""
                                    }`}
                                  >
                                    <td>
                                      <a
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleTaskSelection(task, "thisWeek");
                                        }}
                                        className="task-link"
                                      >
                                        {task.title}
                                      </a>
                                    </td>
                                    <td className="task-assignee">
                                      {task.assignee}
                                    </td>
                                    <td className="status-column">
                                      <span
                                        className="task-status-badge"
                                        style={{
                                          color: statusConfig.color,
                                          backgroundColor: statusConfig.bg,
                                        }}
                                      >
                                        {task.status}
                                      </span>
                                    </td>
                                    <td className="task-hours">
                                      {task.estimated} hrs
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr
                                      key={`details-${task.id}`}
                                      className="task-details-row"
                                    >
                                      <td colSpan={4}>
                                        <div className="task-details-panel">
                                          <div className="task-detail-item">
                                            <span className="task-detail-label">
                                              📆 Due Date:
                                            </span>
                                            <span className="task-detail-value">
                                              {formatDueDate(
                                                selectedTask?.id === task.id
                                                  ? selectedTask?.due_date
                                                  : task.due_date
                                              )}
                                            </span>
                                          </div>
                                          {dailyUpdates.length > 0 && (
                                            <div className="daily-updates-section">
                                              <div className="daily-updates-header">
                                                💬 Daily Updates
                                              </div>
                                              <div className="daily-updates-list">
                                                {dailyUpdates.map((update) => (
                                                  <div
                                                    key={update.id}
                                                    className="daily-update-card"
                                                  >
                                                    <div className="daily-update-header">
                                                      <span className="daily-update-author">
                                                        {update.username ||
                                                          "Unknown"}
                                                      </span>
                                                      <span className="daily-update-date">
                                                        {new Date(
                                                          update.created_at
                                                        ).toLocaleDateString(
                                                          "en-US",
                                                          {
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                          }
                                                        )}
                                                      </span>
                                                    </div>
                                                    <div className="daily-update-comment">
                                                      {update.comment}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {loadingUpdates && (
                                            <div className="loading-updates">
                                              Loading updates...
                                            </div>
                                          )}
                                          {!loadingUpdates &&
                                            dailyUpdates.length === 0 && (
                                              <div className="no-updates">
                                                No daily updates available
                                              </div>
                                            )}
                                          <div className="task-details-actions">
                                            <button
                                              onClick={() => {
                                                setSelectedTask(null);
                                                setDailyUpdates([]);
                                              }}
                                              className="close-details-button"
                                            >
                                              Close
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for This Week */}
                    {tasksThisWeek.length > itemsPerPage && (
                      <div className="pagination-container">
                        <div className="pagination-info">
                          Showing {(currentPageThisWeek - 1) * itemsPerPage + 1} to{" "}
                          {Math.min(
                            currentPageThisWeek * itemsPerPage,
                            tasksThisWeek.length
                          )}{" "}
                          of {tasksThisWeek.length} tasks
                        </div>
                        <div className="pagination-controls">
                          <button
                            onClick={() =>
                              setCurrentPageThisWeek((prev) =>
                                Math.max(1, prev - 1)
                              )
                            }
                            disabled={currentPageThisWeek === 1}
                            className={`pagination-button ${
                              currentPageThisWeek === 1 ? "disabled" : ""
                            }`}
                          >
                            Previous
                          </button>
                          <span className="pagination-page-info">
                            Page {currentPageThisWeek} of{" "}
                            {Math.ceil(tasksThisWeek.length / itemsPerPage)}
                          </span>
                          <button
                            onClick={() =>
                              setCurrentPageThisWeek((prev) =>
                                Math.min(
                                  Math.ceil(tasksThisWeek.length / itemsPerPage),
                                  prev + 1
                                )
                              )
                            }
                            disabled={
                              currentPageThisWeek >=
                              Math.ceil(tasksThisWeek.length / itemsPerPage)
                            }
                            className={`pagination-button ${
                              currentPageThisWeek >=
                              Math.ceil(tasksThisWeek.length / itemsPerPage)
                                ? "disabled"
                                : ""
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="task-card task-card-compact">
                    <div className="task-card-header">
                      <div className="task-card-title-section">
                        <h3 className="task-card-title">📅 Tasks Next Week</h3>
                        {tasksNextWeek.length > 0 && (
                          <span className="task-count-badge">
                            {tasksNextWeek.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="task-table-container">
                      <table className="task-table">
                        <thead>
                          <tr>
                            <th>Task</th>
                            <th>Assignee</th>
                            <th className="status-column">Status</th>
                            <th>Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasksNextWeek.length === 0 && (
                            <tr>
                              <td colSpan={4} className="empty-task-message">
                                <div className="empty-state-content">
                                  <span className="empty-icon">📋</span>
                                  <p>No tasks for next week</p>
                                </div>
                              </td>
                            </tr>
                          )}
                          {tasksNextWeek
                            .slice(
                              (currentPageNextWeek - 1) * itemsPerPage,
                              currentPageNextWeek * itemsPerPage
                            )
                            .map((task) => {
                              const statusConfig =
                                task.status === "Completed"
                                  ? {
                                      class: "status-completed",
                                      color: "#10b981",
                                      bg: "#d1fae5",
                                    }
                                  : task.status === "In Progress"
                                  ? {
                                      class: "status-in-progress",
                                      color: "#06b6d4",
                                      bg: "#cffafe",
                                    }
                                  : task.status === "Blocked"
                                  ? {
                                      class: "status-blocked",
                                      color: "#ef4444",
                                      bg: "#fee2e2",
                                    }
                                  : {
                                      class: "status-todo",
                                      color: "#6366f1",
                                      bg: "#e0e7ff",
                                    };
                              const isExpanded =
                                selectedTask &&
                                selectedTask.source === "nextWeek" &&
                                selectedTask.id === task.id;
                              return (
                                <React.Fragment key={`fragment-nw-${task.id}`}>
                                  <tr
                                    className={`task-row ${
                                      isExpanded ? "expanded" : ""
                                    }`}
                                  >
                                    <td>
                                      <a
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleTaskSelection(task, "nextWeek");
                                        }}
                                        className="task-link"
                                      >
                                        {task.title}
                                      </a>
                                    </td>
                                    <td className="task-assignee">
                                      {task.assignee}
                                    </td>
                                    <td className="status-column">
                                      <span
                                        className="task-status-badge"
                                        style={{
                                          color: statusConfig.color,
                                          backgroundColor: statusConfig.bg,
                                        }}
                                      >
                                        {task.status}
                                      </span>
                                    </td>
                                    <td className="task-hours">
                                      {task.estimated} hrs
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr
                                      key={`details-nw-${task.id}`}
                                      className="task-details-row"
                                    >
                                      <td colSpan={4}>
                                        <div className="task-details-panel">
                                          <div className="task-detail-item">
                                            <span className="task-detail-label">
                                              📆 Due Date:
                                            </span>
                                            <span className="task-detail-value">
                                              {formatDueDate(
                                                selectedTask?.id === task.id
                                                  ? selectedTask?.due_date
                                                  : task.due_date
                                              )}
                                            </span>
                                          </div>
                                          {dailyUpdates.length > 0 && (
                                            <div className="daily-updates-section">
                                              <div className="daily-updates-header">
                                                💬 Daily Updates
                                              </div>
                                              <div className="daily-updates-list">
                                                {dailyUpdates.map((update) => (
                                                  <div
                                                    key={update.id}
                                                    className="daily-update-card"
                                                  >
                                                    <div className="daily-update-header">
                                                      <span className="daily-update-author">
                                                        {update.username ||
                                                          "Unknown"}
                                                      </span>
                                                      <span className="daily-update-date">
                                                        {new Date(
                                                          update.created_at
                                                        ).toLocaleDateString(
                                                          "en-US",
                                                          {
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                          }
                                                        )}
                                                      </span>
                                                    </div>
                                                    <div className="daily-update-comment">
                                                      {update.comment}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {loadingUpdates && (
                                            <div className="loading-updates">
                                              Loading updates...
                                            </div>
                                          )}
                                          {!loadingUpdates &&
                                            dailyUpdates.length === 0 && (
                                              <div className="no-updates">
                                                No daily updates available
                                              </div>
                                            )}
                                          <div className="task-details-actions">
                                            <button
                                              onClick={() => {
                                                setSelectedTask(null);
                                                setDailyUpdates([]);
                                              }}
                                              className="close-details-button"
                                            >
                                              Close
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for Next Week */}
                    {tasksNextWeek.length > itemsPerPage && (
                      <div className="pagination-container">
                        <div className="pagination-info">
                          Showing {(currentPageNextWeek - 1) * itemsPerPage + 1} to{" "}
                          {Math.min(
                            currentPageNextWeek * itemsPerPage,
                            tasksNextWeek.length
                          )}{" "}
                          of {tasksNextWeek.length} tasks
                        </div>
                        <div className="pagination-controls">
                          <button
                            onClick={() =>
                              setCurrentPageNextWeek((prev) =>
                                Math.max(1, prev - 1)
                              )
                            }
                            disabled={currentPageNextWeek === 1}
                            className={`pagination-button ${
                              currentPageNextWeek === 1 ? "disabled" : ""
                            }`}
                          >
                            Previous
                          </button>
                          <span className="pagination-page-info">
                            Page {currentPageNextWeek} of{" "}
                            {Math.ceil(tasksNextWeek.length / itemsPerPage)}
                          </span>
                          <button
                            onClick={() =>
                              setCurrentPageNextWeek((prev) =>
                                Math.min(
                                  Math.ceil(tasksNextWeek.length / itemsPerPage),
                                  prev + 1
                                )
                              )
                            }
                            disabled={
                              currentPageNextWeek >=
                              Math.ceil(tasksNextWeek.length / itemsPerPage)
                            }
                            className={`pagination-button ${
                              currentPageNextWeek >=
                              Math.ceil(tasksNextWeek.length / itemsPerPage)
                                ? "disabled"
                                : ""
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tasks for selected date range (below Tasks This Week/Next Week) */}
            <div className="task-card">
              <div className="task-card-header">
                <div className="task-card-title-section">
                  <h3 className="task-card-title">
                    📅 Tasks for the selected date range
                  </h3>
                  {taskStats?.tasks !== undefined && (
                    <span className="task-count-badge">
                      {taskStats?.tasks?.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="task-table-container">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Project</th>
                      <th>Assignee</th>
                      <th className="status-column">Status</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!taskStats?.tasks || taskStats.tasks.length === 0) && (
                      <tr>
                        <td colSpan={5} className="empty-task-message">
                          <div className="empty-state-content">
                            <span className="empty-icon">📋</span>
                            <p>No tasks in this date range</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {taskStats?.tasks
                      ?.slice(
                        (currentPageTaskStats - 1) * itemsPerPage,
                        currentPageTaskStats * itemsPerPage
                      )
                      .map((task) => {
                        const statusConfig =
                          task.status === "completed"
                            ? {
                                class: "status-completed",
                                color: "#10b981",
                                bg: "#d1fae5",
                              }
                            : task.status === "in_progress"
                            ? {
                                class: "status-in-progress",
                                color: "#06b6d4",
                                bg: "#cffafe",
                              }
                            : task.status === "blocked"
                            ? {
                                class: "status-blocked",
                                color: "#ef4444",
                                bg: "#fee2e2",
                              }
                            : {
                                class: "status-todo",
                                color: "#6366f1",
                                bg: "#e0e7ff",
                              };
                        const isExpanded =
                          selectedTask &&
                          selectedTask.source === "thisWeek" &&
                          selectedTask.id === task.id;
                        // Get project name from projects array using project_id
                        const projectName =
                          projects.find((p) => p.id === task.project_id)
                            ?.name || `Project ${task.project_id}`;
                        return (
                          <React.Fragment key={`fragment-task-${task.id}`}>
                            <tr
                              className={`task-row ${
                                isExpanded ? "expanded" : ""
                              }`}
                            >
                              <td>
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleTaskSelection(
                                      {
                                        id: task.id,
                                        title: task.name,
                                        assignee:
                                          task.username ||
                                          String(task.assignee_id),
                                        status: task.status,
                                        estimated: task.planned_hours,
                                        due_date: task.due_date,
                                      },
                                      "thisWeek"
                                    );
                                  }}
                                  className="task-link"
                                >
                                  {task?.name}
                                </a>
                              </td>
                              <td className="task-project">{projectName}</td>
                              <td className="task-assignee">
                                {task.username || `User ${task.assignee_id}`}
                              </td>
                              <td className="status-column">
                                <span
                                  className="task-status-badge"
                                  style={{
                                    color: statusConfig.color,
                                    backgroundColor: statusConfig.bg,
                                  }}
                                >
                                  {task.status}
                                </span>
                              </td>
                              <td className="task-hours">
                                {(task.actual_hours !== 0 &&
                                task.actual_hours !== null
                                  ? task.actual_hours
                                  : task.planned_hours) || 0}
                                hrs
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr
                                key={`details-${task.id}`}
                                className="task-details-row"
                              >
                                <td colSpan={5}>
                                  <div className="task-details-panel">
                                    <div className="task-detail-item">
                                      <span className="task-detail-label">
                                        📆 Due Date:
                                      </span>
                                      <span className="task-detail-value">
                                        {formatDueDate(
                                          selectedTask?.id === task.id
                                            ? selectedTask?.due_date
                                            : task.due_date
                                        )}
                                      </span>
                                    </div>
                                    {dailyUpdates.length > 0 && (
                                      <div className="daily-updates-section">
                                        <div className="daily-updates-header">
                                          💬 Daily Updates
                                        </div>
                                        <div className="daily-updates-list">
                                          {dailyUpdates.map((update) => (
                                            <div
                                              key={update.id}
                                              className="daily-update-card"
                                            >
                                              <div className="daily-update-header">
                                                <span className="daily-update-author">
                                                  {update.username ||
                                                    "Unknown"}
                                                </span>
                                                <span className="daily-update-date">
                                                  {new Date(
                                                    update.created_at
                                                  ).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                      year: "numeric",
                                                      month: "short",
                                                      day: "numeric",
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    }
                                                  )}
                                                </span>
                                              </div>
                                              <div className="daily-update-comment">
                                                {update.comment}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {loadingUpdates && (
                                      <div className="loading-updates">
                                        Loading updates...
                                      </div>
                                    )}
                                    {!loadingUpdates &&
                                      dailyUpdates.length === 0 && (
                                        <div className="no-updates">
                                          No daily updates available
                                        </div>
                                      )}
                                    <div className="task-details-actions">
                                      <button
                                        onClick={() => {
                                          setSelectedTask(null);
                                          setDailyUpdates([]);
                                        }}
                                        className="close-details-button"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Pagination for Tasks */}
              {taskStats?.tasks && taskStats.tasks.length > itemsPerPage && (
                <div className="pagination-container">
                  <div className="pagination-info">
                    Showing {(currentPageTaskStats - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(
                      currentPageTaskStats * itemsPerPage,
                      taskStats.tasks?.length || 0
                    )}{" "}
                    of {taskStats.tasks?.length || 0} tasks
                  </div>
                  <div className="pagination-controls">
                    <button
                      onClick={() =>
                        setCurrentPageTaskStats((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPageTaskStats === 1}
                      className={`pagination-button ${
                        currentPageTaskStats === 1 ? "disabled" : ""
                      }`}
                    >
                      Previous
                    </button>
                    <span className="pagination-page-info">
                      Page {currentPageTaskStats} of{" "}
                      {Math.ceil(
                        (taskStats.tasks?.length || 0) / itemsPerPage
                      )}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPageTaskStats((prev) =>
                          Math.min(
                            Math.ceil(
                              (taskStats.tasks?.length || 0) / itemsPerPage
                            ),
                            prev + 1
                          )
                        )
                      }
                      disabled={
                        currentPageTaskStats >=
                        Math.ceil(
                          (taskStats.tasks?.length || 0) / itemsPerPage
                        )
                      }
                      className={`pagination-button ${
                        currentPageTaskStats >=
                        Math.ceil(
                          (taskStats.tasks?.length || 0) / itemsPerPage
                        )
                          ? "disabled"
                          : ""
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column charts - 2x2 grid */}
          <div className="charts-section charts-right">
            <div className="charts-grid">
              {/* Productivity */}
              <div className="chart-card chart-card-tall">
                <div className="chart-card-header">
                  <div className="chart-title-section">
                    <h3 className="chart-title">⚡ Productivity</h3>
                    <p className="chart-subtitle">
                      Actual vs Planned hours (Productivity = Planned / Actual ×
                      100)
                    </p>
                  </div>
                </div>
                <div className="chart-content-wrapper">
                  {taskStats.productivityData &&
                  taskStats.productivityData.length > 0 ? (
                    <ProductivityChart data={taskStats.productivityData} />
                  ) : (
                    <div className="chart-empty-state">
                      <span className="empty-chart-icon">📈</span>
                      <p>No data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Utilization (swapped with Team Availability) */}
              <div className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-title-section">
                    <h3 className="chart-title">📊 Utilization</h3>
                    <p className="chart-subtitle">
                      Team utilization percentage over time
                    </p>
                  </div>
                </div>
                <div className="chart-content-wrapper">
                  {taskStats.utilizationData &&
                  taskStats.utilizationData.length > 0 ? (
                    <UtilizationChart data={taskStats.utilizationData} />
                  ) : (
                    <div className="chart-empty-state">
                      <span className="empty-chart-icon">📈</span>
                      <p>No data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Status Distribution */}
              <div className="chart-card chart-card-tall">
                <div className="chart-card-header">
                  <div className="chart-title-section">
                    <h3 className="chart-title">🎯 Task Status Distribution</h3>
                    <p className="chart-subtitle">Overview of task statuses</p>
                  </div>
                </div>
                <div className="chart-content-wrapper">
                  {totalTasks === 0 ? (
                    <div className="chart-empty-state">
                      <span className="empty-chart-icon">📊</span>
                      <p>No tasks available</p>
                    </div>
                  ) : (
                    <TaskStatusChart data={taskStatusData} />
                  )}
                </div>
              </div>

              {/* Team Availability (swapped with Utilization) */}
              <div className="chart-card">
                <div className="chart-card-header">
                  <div className="chart-title-section">
                    <h3 className="chart-title">👥 Team Availability</h3>
                    <p className="chart-subtitle">
                      Total available hours per week
                    </p>
                  </div>
                </div>
                <div className="chart-content-wrapper">
                  {!taskStats.availabilityData ||
                  taskStats.availabilityData.length === 0 ? (
                    <div className="chart-empty-state">
                      <span className="empty-chart-icon">📈</span>
                      <p>No data available</p>
                    </div>
                  ) : (
                    <AvailabilityChart
                      key={`availability-${filters.employeeId || "all"}-${
                        filters.projectId || "all"
                      }`}
                      data={taskStats.availabilityData}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;