import React from 'react';
import { DashboardFilters as FilterType } from '../types';
import CustomSelect from './CustomSelect';
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

  // Prepare project options for CustomSelect
  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    ...projects.map(project => ({
      value: project.id,
      label: project.name
    }))
  ];

  // Prepare employee options for CustomSelect
  const employeeOptions = [
    { value: 'all', label: 'All Employees' },
    ...employees.map(employee => ({
      value: employee.id,
      label: `${employee.username} (${employee.role})`
    }))
  ];

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Project:</label>
        <CustomSelect
          value={filters.projectId || 'all'}
          onChange={handleProjectChange}
          options={projectOptions}
          placeholder="Select Project"
        />
      </div>

      {/* Hide employee filter for employee role */}
      {userRole !== 'employee' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground">Employee:</label>
          <CustomSelect
            value={filters.employeeId || 'all'}
            onChange={handleEmployeeChange}
            options={employeeOptions}
            placeholder="Select Employee"
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
