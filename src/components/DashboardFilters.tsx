import React from 'react';
import { DashboardFilters as FilterType } from '../types';

interface DashboardFiltersProps {
  filters: FilterType;
  projects: Array<{ id: number; name: string; status: string }>;
  employees: Array<{ id: number; username: string; email: string; role: string }>;
  onFilterChange: (filters: FilterType) => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  projects,
  employees,
  onFilterChange,
}) => {
  const handleProjectChange = (projectId: string) => {
    onFilterChange({
      ...filters,
      projectId: projectId === 'all' ? undefined : parseInt(projectId),
    });
  };

  const handleEmployeeChange = (employeeId: string) => {
    onFilterChange({
      ...filters,
      employeeId: employeeId === 'all' ? undefined : parseInt(employeeId),
    });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Project:</label>
        <select
          value={filters.projectId || 'all'}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="w-[180px] bg-background border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Employee:</label>
        <select
          value={filters.employeeId || 'all'}
          onChange={(e) => handleEmployeeChange(e.target.value)}
          className="w-[180px] bg-background border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Employees</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.username} ({employee.role})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Date Range:</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="w-[140px] bg-background border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Start Date"
          />
          <span className="text-sm text-gray-500">to</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="w-[140px] bg-background border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="End Date"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
