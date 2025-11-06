import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, userAPI } from '../services/api';
import { DashboardFilters as FilterType, WeeklyData } from '../types';
import DashboardFilters from './DashboardFilters';
import UtilizationChart from './charts/UtilizationChart';
import ProductivityChart from './charts/ProductivityChart';
import AvailabilityChart from './charts/AvailabilityChart';
import TaskStatusChart from './charts/TaskStatusChart';
// Using simple Unicode symbols instead of react-icons to avoid TypeScript issues

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();

  // Try to get persisted filters from localStorage
  const getInitialFilters = (): FilterType => {
    if (typeof window !== 'undefined' && localStorage.getItem('dashboard-filters')) {
      try {
        const saved = JSON.parse(localStorage.getItem('dashboard-filters')!);
        return {
          projectId: saved.projectId ?? undefined, // Can be number or number[]
          employeeId: saved.employeeId ?? undefined, // Can be number or number[]
          startDate: saved.startDate ?? undefined,
          endDate: saved.endDate ?? undefined,
        };
      } catch {
        /* ignore */
      }
    }
    // fallback, use current week as default
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      projectId: undefined,
      employeeId: user?.role === 'employee' ? user.id : undefined,
      startDate: undefined,
      endDate: undefined,
    };
  };

  const [filters, setFilters] = useState<FilterType>(getInitialFilters());
  const [projects, setProjects] = useState<Array<{ id: number; name: string; status: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; username: string; email: string; role: string }>>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; username: string; email: string; role: string }>>([]);
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
  const [dashboardData, setDashboardData] = useState<{
    utilizationData: WeeklyData[];
    productivityData: WeeklyData[];
    availabilityData: WeeklyData[];
  }>({
    utilizationData: [],
    productivityData: [],
    availabilityData: [],
  });
  const [tasksThisWeek, setTasksThisWeek] = useState<Array<{ id: number; title: string; assignee: string; status: string; statusColor: string; estimated: number; logged: number }>>([]);
  const [tasksNextWeek, setTasksNextWeek] = useState<Array<{ id: number; title: string; assignee: string; status: string; statusColor: string; estimated: number; logged: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [selectedTask, setSelectedTask] = useState<{
    id: number;
    title: string;
    assignee: string;
    status: string;
    estimated: number;
    source: 'thisWeek' | 'nextWeek';
  } | null>(null);

  // Display helper: show hyphen for null/empty API values
  const displayOrHyphen = (value: any): string | number => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && isNaN(value)) return '-';
    if (typeof value === 'string' && value.trim() === '') return '-';
    return value as any;
  };

  const fetchInitialData = async () => {
    try {
      // For employees, fetch only their assigned projects
      // For managers/team leads, fetch only their assigned projects via project_assignments
      // For super admin, fetch all projects
      let projectsPromise;
      if (user?.role === 'employee') {
        projectsPromise = userAPI.getUserProjects(user.id);
      } else if (user?.role === 'manager' || user?.role === 'team_lead') {
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
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      
      // Calculate Friday of current week (4 days after Monday)
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      
      // Use local date formatting to avoid UTC shifts from toISOString()
      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Fill ONLY missing fields; preserve any persisted selections from localStorage
      setFilters(prev => ({
        ...prev,
        employeeId: prev.employeeId !== undefined ? prev.employeeId : (user?.role === 'employee' ? user.id : undefined),
        startDate: prev.startDate || formatDateLocal(monday),
        endDate: prev.endDate || formatDateLocal(friday),
      }));
    } catch (error) {-
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      // Build effective filters so first load is always scoped and dated
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const effectiveStartDate = filters.startDate || formatDateLocal(monday);
      const effectiveEndDate = filters.endDate || formatDateLocal(friday);
      
      // Handle single or array employeeId
      let effectiveEmployeeId: number | number[] | undefined;
      if (user?.role === 'employee') {
        effectiveEmployeeId = filters.employeeId || user?.id;
      } else {
        effectiveEmployeeId = filters.employeeId;
      }
      
      // Convert projectId and employeeId to comma-separated strings for API
      const projectIdStr = Array.isArray(filters.projectId) 
        ? filters.projectId.join(',')
        : filters.projectId?.toString();
      
      const employeeIdStr = Array.isArray(effectiveEmployeeId)
        ? effectiveEmployeeId.join(',')
        : effectiveEmployeeId?.toString();

      // For timeline: employees default to their own tasks; managers/team leads see all tasks from their assigned projects (unless employeeId is explicitly selected)
      const timelineEmployeeIdStr = (user?.role === 'employee')
        ? (employeeIdStr || String(user?.id))
        : employeeIdStr;
      // For stats/charts: employees default to their own tasks; managers/team leads see all tasks from their assigned projects (unless employeeId is explicitly selected)
      const statsEmployeeIdStr = (user?.role === 'employee')
        ? (employeeIdStr || String(user?.id))
        : employeeIdStr;

      const [data, taskStatusData, tasksTimeline] = await Promise.all([
        dashboardAPI.getDashboardData({
          projectId: projectIdStr,
          employeeId: statsEmployeeIdStr,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          userId: user?.id,
          userRole: user?.role,
        }),
        dashboardAPI.getTaskStatus({
          projectId: projectIdStr,
          employeeId: statsEmployeeIdStr,
          // Don't filter by date for task status - show all tasks from assigned projects
          // startDate: effectiveStartDate,
          // endDate: effectiveEndDate,
          userId: user?.id,
          userRole: user?.role,
        }),
        dashboardAPI.getTasksTimeline({
          role: user?.role || 'employee',
          userId: user?.id || 0,
          projectId: projectIdStr,
          employeeId: timelineEmployeeIdStr,
        })
      ]);
      console.log('Dashboard data received:', {
        utilizationData: data.utilizationData?.length || 0,
        productivityData: data.productivityData?.length || 0,
        availabilityData: data.availabilityData?.length || 0,
      });
      console.log('Task status data received:', taskStatusData);
      console.log('Tasks timeline received:', tasksTimeline);
      console.log('Tasks timeline - thisWeek length:', tasksTimeline.thisWeek?.length || 0);
      console.log('Tasks timeline - nextWeek length:', tasksTimeline.nextWeek?.length || 0);
      console.log('Tasks timeline - thisWeek data:', tasksTimeline.thisWeek);
      console.log('Tasks timeline - nextWeek data:', tasksTimeline.nextWeek);
      
      setDashboardData(data);
      setTaskStatusData(taskStatusData);
      setTasksThisWeek(tasksTimeline.thisWeek || []);
      setTasksNextWeek(tasksTimeline.nextWeek || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // On page load, set filters (same as before)
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch employees when project filter changes
  useEffect(() => {
    const fetchEmployeesForProject = async () => {
      if (!user) return;
      
      const currentProjectId = filters.projectId;
      const currentEmployeeId = filters.employeeId;
      
      try {
        // Convert projectId to comma-separated string if array
        const projectIdStr = Array.isArray(currentProjectId)
          ? currentProjectId.join(',')
          : currentProjectId?.toString();
        
        const employeesRes = await dashboardAPI.getEmployees(projectIdStr, user.id, user.role);
        setEmployees(employeesRes);
        
        // If current employeeId (single or array) contains IDs not in the filtered list, remove them
        if (currentEmployeeId) {
          const employeeIds = Array.isArray(currentEmployeeId) ? currentEmployeeId : [currentEmployeeId];
          const validEmployeeIds = employeeIds.filter(id => employeesRes.some((e: any) => e.id === id));
          
          if (validEmployeeIds.length !== employeeIds.length) {
            setFilters(prev => ({ 
              ...prev, 
              employeeId: validEmployeeIds.length === 0 
                ? undefined 
                : validEmployeeIds.length === 1 
                  ? validEmployeeIds[0] 
                  : validEmployeeIds
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching employees for project:', error);
      }
    };

    fetchEmployeesForProject();
  }, [filters.projectId, user]);

  // After projects and employees are loaded, scrub the filters state:
  useEffect(() => {
    if (!projects.length && !employees.length) return;

    const arraysEqual = (a?: number | number[], b?: number | number[]) => {
      const arrA = Array.isArray(a) ? [...a].sort((x, y) => Number(x) - Number(y)) : (a === undefined ? [] : [a]);
      const arrB = Array.isArray(b) ? [...b].sort((x, y) => Number(x) - Number(y)) : (b === undefined ? [] : [b]);
      if (arrA.length !== arrB.length) return false;
      for (let i = 0; i < arrA.length; i++) if (arrA[i] !== arrB[i]) return false;
      return true;
    };

    setFilters((prev) => {
      // Validate projectId (preserve array vs single type)
      let validProjectId: number | number[] | undefined = undefined;
      if (Array.isArray(prev.projectId)) {
        const valid = prev.projectId.filter(id => projects.some(p => p.id === id));
        validProjectId = valid.length > 0 ? valid : undefined; // keep array, do not collapse to single
      } else if (prev.projectId) {
        validProjectId = projects.some(p => p.id === prev.projectId) ? prev.projectId : undefined;
      }

      // Validate employeeId (preserve array vs single type)
      let validEmployeeId: number | number[] | undefined = undefined;
      if (Array.isArray(prev.employeeId)) {
        const valid = prev.employeeId.filter(id => employees.some(e => e.id === id));
        validEmployeeId = valid.length > 0 ? valid : undefined; // keep array, do not collapse to single
      } else if (prev.employeeId) {
        validEmployeeId = employees.some(e => e.id === prev.employeeId) ? prev.employeeId : undefined;
      }

      const next: FilterType = {
        ...prev,
        projectId: validProjectId,
        employeeId: validEmployeeId,
        startDate: prev.startDate,
        endDate: prev.endDate,
      };

      // Deep-ish equality for ids (arrays by value, singles by value)
      const isSame = (
        arraysEqual(prev.projectId as any, next.projectId as any) &&
        arraysEqual(prev.employeeId as any, next.employeeId as any) &&
        prev.startDate === next.startDate &&
        prev.endDate === next.endDate
      );

      return isSame ? prev : next;
    });
  }, [projects, employees]);

  // Fetch dashboard data on initial mount and manual refresh only (not on filter change)
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceRefreshKey, user]);

  // When filters change, also update localStorage
  const persistFilters = (newFilters: FilterType) => {
    // Normalize projectId and employeeId for storage (keep arrays as arrays)
    const normalizedFilters = {
      ...newFilters,
      projectId: newFilters.projectId 
        ? (Array.isArray(newFilters.projectId) ? newFilters.projectId : Number(newFilters.projectId))
        : undefined,
      employeeId: newFilters.employeeId 
        ? (Array.isArray(newFilters.employeeId) ? newFilters.employeeId : Number(newFilters.employeeId))
        : undefined,
      startDate: newFilters.startDate,
      endDate: newFilters.endDate
    };
    
    localStorage.setItem('dashboard-filters', JSON.stringify(normalizedFilters));
    setFilters(normalizedFilters);
  };

  // The filter handler: changes state only
  const handleDashboardFilterChange = (newFilters: FilterType) => {
    persistFilters(newFilters);
  };

  // Calculate metrics from data
  const totalTasks = taskStatusData.todo + taskStatusData.in_progress + taskStatusData.completed + taskStatusData.blocked;
  const completedTasks = taskStatusData.completed;
  
  // Calculate productivity: use average of all weeks in the date range, similar to how task status works
  // Use the productivity value directly from the backend data (like taskStatusData is used directly)
  const calculateProductivity = () => {
    if (!dashboardData.productivityData || dashboardData.productivityData.length === 0) {
      return null;
    }
    // Calculate average productivity across all weeks with valid values
    const productivityValues: number[] = dashboardData.productivityData
      .map(week => {
        const val = week?.productivity;
        return val !== null && val !== undefined && !isNaN(val) ? val : null;
      })
      .filter((val): val is number => val !== null && typeof val === 'number');
    if (productivityValues.length > 0) {
      const avg = productivityValues.reduce((sum, val) => sum + val, 0) / productivityValues.length;
      return Math.round(avg);
    }
    // Fallback to last week's value if available
    const lastWeek = dashboardData.productivityData[dashboardData.productivityData.length - 1];
    if (lastWeek?.productivity !== null && lastWeek?.productivity !== undefined && !isNaN(lastWeek.productivity)) {
      return Math.round(lastWeek.productivity);
    }
    return null;
  };
  const productivity = calculateProductivity();
  
  // Calculate utilization: use average of all weeks in the date range, similar to how task status works
  // Use the utilization value directly from the backend data (like taskStatusData is used directly)
  const calculateUtilization = () => {
    if (!dashboardData.utilizationData || dashboardData.utilizationData.length === 0) {
      return null;
    }
    // Calculate average utilization across all weeks with valid values
    const utilizationValues: number[] = dashboardData.utilizationData
      .map(week => {
        const val = week?.utilization;
        return val !== null && val !== undefined && !isNaN(val) ? val : null;
      })
      .filter((val): val is number => val !== null && typeof val === 'number');
    if (utilizationValues.length > 0) {
      const avg = utilizationValues.reduce((sum, val) => sum + val, 0) / utilizationValues.length;
      return Math.round(avg);
    }
    // Fallback to last week's value if available
    const lastWeek = dashboardData.utilizationData[dashboardData.utilizationData.length - 1];
    if (lastWeek?.utilization !== null && lastWeek?.utilization !== undefined && !isNaN(lastWeek.utilization)) {
      return Math.round(lastWeek.utilization);
    }
    return null;
  };
  const utilization = calculateUtilization();
  
  // Debug logging
  console.log('Calculated metrics:', {
    totalTasks,
    completedTasks,
    productivity,
    utilization,
    taskStatusData,
    dashboardDataLength: dashboardData.productivityData.length,
  });

  // Metric cards
  const baseStats: Array<{
    label: string;
    value: number | string;
    icon: string;
    color: string;
    trend: string;
    trendColor: string;
  }> = [
    {
      label: "Total Tasks",
      value: displayOrHyphen(totalTasks),
      icon: "📄",
      color: "bg-indigo-500",
      trend: "+12% vs last week",
      trendColor: "text-green-600",
    },
    {
      label: "Completed",
      value: displayOrHyphen(completedTasks),
      icon: "✅",
      color: "bg-indigo-500",
      trend: "+3 this week",
      trendColor: "text-green-600",
    },
    {
      label: "Pending",
      value: displayOrHyphen(totalTasks - completedTasks),
      icon: "⌛",
      color: "bg-indigo-500",
      trend: "+3 this week",
      trendColor: "text-green-600",
    },
    {
      label: "Productivity",
      value: (typeof productivity === 'number' && !isNaN(productivity)) ? `${productivity}%` : '0%',
      icon: "⭐",
      color: "bg-indigo-500",
      trend: "+5% improvement",
      trendColor: "text-green-600",
    },
    {
      label: "Utilization",
      value: (typeof utilization === 'number' && !isNaN(utilization)) ? `${utilization}%` : '0%',
      icon: "⏰",
      color: "bg-indigo-500",
      trend: "+2% this week",
      trendColor: "text-green-600",
    },
  ];

  // Use base stats only (Budget card removed)
  const stats = baseStats;

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="space-y-6">
        {/* Header with Filters */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Project Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.username || 'User'}!</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: '1rem' }}>
            <DashboardFilters
              filters={filters}
              projects={projects}
              employees={employees}
              onFilterChange={handleDashboardFilterChange}
              userRole={user?.role}
            />
            <button
              onClick={() => setForceRefreshKey(k => k + 1)}
              style={{
                padding: '9px 18px',
                marginBottom: 24,
                borderRadius: 8,
                background: '#6366f1',
                color: 'white',
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(60,60,60,0.03)'}}
            >
              🔄 Refresh
            </button>
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

        {/* Metric Cards */}
<div className="w-full mt-6">
  <div className="flex gap-4 flex-wrap md:flex-nowrap justify-between">
    {stats.map((stat) => (
      <div
        key={stat.label}
        className="flex-1 border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-sm border border-gray-200 p-6"
        style={{ minWidth: 0 }}
      >
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
    ))}
  </div>
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
                    : 'text-gray-600';
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
                    : 'text-gray-600';
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

  {/* Tasks This Week and Next Week (Tables with hyperlinks) */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Tasks This Week</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="users-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Estimated Hours</th>
              </tr>
            </thead>
            <tbody>
              {tasksThisWeek.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>No tasks</td>
                </tr>
              )}
              {tasksThisWeek.map((task) => {
                const statusTextClass =
                  task.status === 'Completed'
                    ? 'text-green-600'
                    : task.status === 'In Progress'
                    ? 'text-cyan-600'
                    : task.status === 'Blocked'
                    ? 'text-red-600'
                    : 'text-gray-600';
                const isExpanded = selectedTask && selectedTask.source === 'thisWeek' && selectedTask.id === task.id;
                return (
                  <>
                    <tr key={`row-${task.id}`} className="user-row">
                      <td>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); setSelectedTask(isExpanded ? null : { id: task.id, title: task.title, assignee: task.assignee, status: task.status, estimated: task.estimated, source: 'thisWeek' }); }}
                          style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {task.title}
                        </a>
                      </td>
                      <td>{task.assignee}</td>
                      <td><span className={`text-xs font-semibold ${statusTextClass}`}>{task.status}</span></td>
                      <td>{task.estimated} hrs</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`details-${task.id}`}>
                        <td colSpan={4}>
                          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-2">
                            <div className="text-sm"><span className="text-gray-500">Task:</span> <span className="font-medium">{task.title}</span></div>
                            <div className="text-sm mt-1"><span className="text-gray-500">Assignee:</span> <span className="font-medium">{task.assignee}</span></div>
                            <div className="text-sm mt-1"><span className="text-gray-500">Status:</span> <span className="font-medium">{task.status}</span></div>
                            <div className="text-sm mt-1"><span className="text-gray-500">Estimated:</span> <span className="font-medium">{task.estimated} hrs</span></div>
                            <div className="mt-3 flex justify-end">
                              <button onClick={() => setSelectedTask(null)} style={{ padding: '8px 12px', borderRadius: 8, background: '#e5e7eb', border: '1px solid #d1d5db', cursor: 'pointer' }}>Close</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Tasks Next Week</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="users-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Estimated Hours</th>
              </tr>
            </thead>
            <tbody>
              {tasksNextWeek.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af' }}>No tasks</td>
                </tr>
              )}
              {tasksNextWeek.map((task) => {
                const statusTextClass =
                  task.status === 'Completed'
                    ? 'text-green-600'
                    : task.status === 'In Progress'
                    ? 'text-cyan-600'
                    : task.status === 'Blocked'
                    ? 'text-red-600'
                    : 'text-gray-600';
                const isExpanded = selectedTask && selectedTask.source === 'nextWeek' && selectedTask.id === task.id;
                return (
                  <>
                    <tr key={`row-nw-${task.id}`} className="user-row">
                      <td>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); setSelectedTask(isExpanded ? null : { id: task.id, title: task.title, assignee: task.assignee, status: task.status, estimated: task.estimated, source: 'nextWeek' }); }}
                          style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {task.title}
                        </a>
                      </td>
                      <td>{task.assignee}</td>
                      <td><span className={`text-xs font-semibold ${statusTextClass}`}>{task.status}</span></td>
                      <td>{task.estimated} hrs</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`details-nw-${task.id}`}>
                        <td colSpan={4}>
                          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mt-2">
                            <div className="text-sm"><span className="text-gray-500">Task:</span> <span className="font-medium">{task.title}</span></div>
                            <div className="text-sm mt-1"><span className="text-gray-500">Assignee:</span> <span className="font-medium">{task.assignee}</span></div>
                            <div className="text-sm mt-1"><span className="text-gray-500">Status:</span> <span className="font-medium">{task.status}</span></div>
                            <div className="text-sm mt-1"><span className="text-gray-500">Estimated:</span> <span className="font-medium">{task.estimated} hrs</span></div>
                            <div className="mt-3 flex justify-end">
                              <button onClick={() => setSelectedTask(null)} style={{ padding: '8px 12px', borderRadius: 8, background: '#e5e7eb', border: '1px solid #d1d5db', cursor: 'pointer' }}>Close</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>



        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Utilization Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Utilization</h3>
                <p className="text-xs text-gray-500">Team utilization percentage over time</p>
              </div>
              <div className="h-[300px]">
                {dashboardData.utilizationData && dashboardData.utilizationData.length > 0 ? (
                  <UtilizationChart data={dashboardData.utilizationData} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">-</div>
                )}
              </div>
            </div>
          </div>

          {/* Productivity Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Productive Hours</h3>
                <p className="text-xs text-gray-500">Completed vs Allocated hours</p>
              </div>
              <div className="h-[300px]">
                {dashboardData.productivityData && dashboardData.productivityData.length > 0 ? (
                  <ProductivityChart data={dashboardData.productivityData} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">-</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Team Availability + Task Status Distribution (side-by-side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Availability */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Team Availability</h3>
                <p className="text-xs text-gray-500">Total available hours per week</p>
              </div>
              <div className="h-[300px]">
                {dashboardData.availabilityData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">-</div>
                ) : (
                  <AvailabilityChart data={dashboardData.availabilityData} />
                )}
              </div>
            </div>
          </div>

          {/* Task Status Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Task Status Distribution</h3>
              </div>
              <div className="h-[300px]">
                {totalTasks === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">-</div>
                ) : (
                  <TaskStatusChart data={taskStatusData} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

