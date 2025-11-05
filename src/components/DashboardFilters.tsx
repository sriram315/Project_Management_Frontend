import React from 'react';
import { DashboardFilters as FilterType } from '../types';
import CustomMultiSelect from './CustomMultiSelect';
import './DashboardFilters.css';

interface DashboardFiltersProps {
  filters: FilterType;
  projects: Array<{ id: number; name: string; status: string }>;
  employees: Array<{ id: number; username: string; email: string; role: string }>;
  onFilterChange: (filters: FilterType) => void;
  userRole?: string; // Add user role to control visibility
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filters,
  projects,
  employees,
  onFilterChange,
  userRole,
}) => {
  // Normalize projectId to array format
  const getProjectIds = (): number[] => {
    if (!filters.projectId) return [];
    if (Array.isArray(filters.projectId)) return filters.projectId;
    return [filters.projectId];
  };

  // Normalize employeeId to array format
  const getEmployeeIds = (): number[] => {
    if (!filters.employeeId) return [];
    if (Array.isArray(filters.employeeId)) return filters.employeeId;
    return [filters.employeeId];
  };

  const handleProjectChange = (projectIds: (string | number)[]) => {
    const ids = projectIds.map(id => parseInt(String(id))).filter(id => !isNaN(id));
    onFilterChange({
      ...filters,
      projectId: ids.length === 0 ? undefined : ids.length === 1 ? ids[0] : ids,
    });
  };

  const handleEmployeeChange = (employeeIds: (string | number)[]) => {
    const ids = employeeIds.map(id => parseInt(String(id))).filter(id => !isNaN(id));
    onFilterChange({
      ...filters,
      employeeId: ids.length === 0 ? undefined : ids.length === 1 ? ids[0] : ids,
    });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    // Normalize any dd-mm-yyyy values to yyyy-mm-dd for the HTML date input
    const normalizeToInputDate = (v: string) => {
      if (!v) return v;
      const parts = v.split('-');
      if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
        // dd-mm-yyyy -> yyyy-mm-dd
        const [dd, mm, yyyy] = parts;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
      return v;
    };

    const normalized = normalizeToInputDate(value);
    onFilterChange({
      ...filters,
      [field]: normalized || undefined,
    });
  };

  // Ensure values rendered in the input are in yyyy-mm-dd
  const formatForInput = (v?: string) => {
    if (!v) return '';
    const parts = v.split('-');
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    return v;
  };

  // Compute constraints: end date cannot be before start date
  const startDateForInput = formatForInput(filters.startDate);
  const endDateForInput = formatForInput(filters.endDate);

  // Prepare project options for CustomMultiSelect (no "all" option, empty array = all)
  // Filter out invalid projects and ensure all fields are strings
  const projectOptions = projects
    .filter(project => project && project.id && project.name)
    .map(project => ({
      value: Number(project.id),
      label: String(project.name || `Project ${project.id}`)
    }));

  // Prepare employee options for CustomMultiSelect (no "all" option, empty array = all)
  // Filter out invalid employees and ensure all fields are strings
  const employeeOptions = employees
    .filter(employee => employee && employee.id && employee.username)
    .map(employee => ({
      value: Number(employee.id),
      label: `${String(employee.username || `User ${employee.id}`)} (${String(employee.role || 'employee')})`
    }));

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Projects:</label>
        <CustomMultiSelect
          value={getProjectIds()}
          onChange={handleProjectChange}
          options={projectOptions}
          placeholder="All Projects"
        />
      </div>

      {/* Hide employee filter for employee role */}
      {userRole !== 'employee' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Employees:</label>
          <CustomMultiSelect
            value={getEmployeeIds()}
            onChange={handleEmployeeChange}
            options={employeeOptions}
            placeholder="All Employees"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Date Range:</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDateForInput}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="w-[140px] bg-background border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Start Date"
            max={endDateForInput || undefined}
          />
          <span className="text-sm text-gray-500">to</span>
          <input
            type="date"
            value={endDateForInput}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="w-[140px] bg-background border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="End Date"
            min={startDateForInput || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
