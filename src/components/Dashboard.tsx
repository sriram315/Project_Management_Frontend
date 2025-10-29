import React, { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';
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
  const [filters, setFilters] = useState<FilterType>({
    projectId: undefined,
    employeeId: undefined,
    startDate: undefined,
    endDate: undefined,
  });
  const [projects, setProjects] = useState<Array<{ id: number; name: string; status: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; username: string; email: string; role: string }>>([]);
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

  // Display helper: show hyphen for null/empty API values
  const displayOrHyphen = (value: any): string | number => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number' && isNaN(value)) return '-';
    if (typeof value === 'string' && value.trim() === '') return '-';
    return value as any;
  };

  const fetchInitialData = async () => {
    try {
      const [projectsRes, employeesRes, taskStatusRes] = await Promise.all([
        dashboardAPI.getProjects(),
        dashboardAPI.getEmployees(),
        dashboardAPI.getTaskStatus(),
      ]);

      setProjects(projectsRes);
      setEmployees(employeesRes);
      setTaskStatusData(taskStatusRes);

      // Set default date range to last week
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      
      setFilters(prev => ({
        ...prev,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      }));
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, taskStatusData, tasksTimeline] = await Promise.all([
        dashboardAPI.getDashboardData({
          projectId: filters.projectId?.toString(),
          employeeId: filters.employeeId?.toString(),
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
        dashboardAPI.getTaskStatus({
          projectId: filters.projectId?.toString(),
          employeeId: filters.employeeId?.toString(),
          startDate: filters.startDate,
          endDate: filters.endDate,
        }),
        dashboardAPI.getTasksTimeline({
          role: user?.role || 'employee',
          userId: user?.id || 0,
          projectId: filters.projectId?.toString(),
          employeeId: filters.employeeId?.toString(),
        })
      ]);
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

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [filters, fetchDashboardData]);

  const handleFilterChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  // Calculate metrics from data
  const totalTasks = taskStatusData.todo + taskStatusData.in_progress + taskStatusData.completed + taskStatusData.blocked;
  const completedTasks = taskStatusData.completed;
  const productivity = dashboardData.productivityData.length > 0 
    ? Math.round((dashboardData.productivityData[dashboardData.productivityData.length - 1].completed / 
        dashboardData.productivityData[dashboardData.productivityData.length - 1].hours) * 100) 
    : 0;
  const utilization = dashboardData.utilizationData.length > 0 
    ? Math.round(dashboardData.utilizationData[dashboardData.utilizationData.length - 1].utilization) 
    : 0;

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
      label: "Productivity",
      value: displayOrHyphen(`${isNaN(productivity) ? '-' : productivity}%`),
      icon: "⭐",
      color: "bg-indigo-500",
      trend: "+5% improvement",
      trendColor: "text-green-600",
    },
    {
      label: "Utilization",
      value: displayOrHyphen(`${isNaN(utilization) ? '-' : utilization}%`),
      icon: "⏰",
      color: "bg-indigo-500",
      trend: "+2% this week",
      trendColor: "text-green-600",
    },
  ];

  // Add Budget card only for admin and manager
  const stats = user?.role === "admin" || user?.role === "manager" 
    ? [
        ...baseStats,
        {
          label: "Budget",
          value: displayOrHyphen("$250K"),
          icon: "💰",
          color: "bg-indigo-500",
          trend: "78% utilized",
          trendColor: "text-blue-600",
        },
      ]
    : baseStats;

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
      <DashboardFilters
        filters={filters}
        projects={projects}
        employees={employees}
        onFilterChange={handleFilterChange}
      />
        </div>

        {/* Metric Cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${stats.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
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
        </div>

        {/* Tasks This Week and Next Week */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks This Week */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                    <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div style={{ width: '4px', alignSelf: 'stretch', backgroundColor: barColor, borderRadius: '4px' }}></div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500">{task.assignee}</p>
                          <p className="text-xs text-gray-600 mt-1">Estimated: {task.estimated}h | Logged: {task.logged}h</p>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                    <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <div style={{ width: '4px', alignSelf: 'stretch', backgroundColor: barColor, borderRadius: '4px' }}></div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{task.title}</p>
                          <p className="text-xs text-gray-500">{task.assignee}</p>
                          <p className="text-xs text-gray-600 mt-1">Estimated: {task.estimated}h | Logged: {task.logged}h</p>
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
                {dashboardData.utilizationData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">-</div>
                ) : (
                  <UtilizationChart data={dashboardData.utilizationData} />
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
                {dashboardData.productivityData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">-</div>
                ) : (
                  <ProductivityChart data={dashboardData.productivityData} />
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
