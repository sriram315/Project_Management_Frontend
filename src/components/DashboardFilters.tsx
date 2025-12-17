import React from "react";
import { DashboardFilters as FilterType } from "../types";
import CustomMultiSelect from "./CustomMultiSelect";
import "./DashboardFilters.css";

interface DashboardFiltersProps {
  filters: FilterType;
  projects: Array<{ id: number; name: string; status: string }>;
  employees: Array<{
    id: number;
    username: string;
    email: string;
    role: string;
  }>;
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
    const ids = projectIds
      .map((id) => parseInt(String(id)))
      .filter((id) => !isNaN(id));
    onFilterChange({
      ...filters,
      projectId: ids.length === 0 ? undefined : ids.length === 1 ? ids[0] : ids,
    });
  };

  const handleEmployeeChange = (employeeIds: (string | number)[]) => {
    const ids = employeeIds
      .map((id) => parseInt(String(id)))
      .filter((id) => !isNaN(id));
    onFilterChange({
      ...filters,
      employeeId:
        ids.length === 0 ? undefined : ids.length === 1 ? ids[0] : ids,
    });
  };

  // Helper function to format date as YYYY-MM-DD (local time, no timezone issues)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to get the Friday of a given date
  const getFriday = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Calculate days to add to get Friday
    // If Sunday (0), add 5 days; if Monday (1), add 4 days; ... if Friday (5), add 0 days; if Saturday (6), add -1 day (previous Friday)
    const diff = day === 0 ? 5 : day === 6 ? -1 : 5 - day;
    d.setDate(d.getDate() + diff);
    return formatDateLocal(d);
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    // Normalize any dd-mm-yyyy values to yyyy-mm-dd for the HTML date input
    const normalizeToInputDate = (v: string) => {
      if (!v) return v;
      const parts = v.split("-");
      if (
        parts.length === 3 &&
        parts[0].length === 2 &&
        parts[2].length === 4
      ) {
        // dd-mm-yyyy -> yyyy-mm-dd
        const [dd, mm, yyyy] = parts;
        return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
      return v;
    };

    const normalized = normalizeToInputDate(value);

    // Validate date range
    // Start date: Allow any date selection (including future dates)
    // End date: Automatically set to Friday of the selected week
    let newStartDate = filters.startDate;
    let newEndDate = filters.endDate;

    if (field === "startDate") {
      if (normalized) {
        // Allow any date selection for start date
        newStartDate = normalized;
        
        // Always set the end date to Friday of the selected week
        // This ensures consistent behavior for both previous and future weeks
        const start = new Date(newStartDate);
        newEndDate = getFriday(start);
        
        // If the selected date is Saturday, show the next Friday
        if (start.getDay() === 6) {
          start.setDate(start.getDate() + 6);
          newEndDate = getFriday(start);
        }
      } else {
        newStartDate = undefined;
      }
    } else if (field === "endDate") {
      if (normalized) {
        const selectedDate = new Date(normalized);
        // Automatically set to Friday of the selected week
        newEndDate = getFriday(selectedDate);

        // If end date is before start date, adjust start date to the Monday of that week
        if (newStartDate && new Date(newEndDate) < new Date(newStartDate)) {
          const end = new Date(newEndDate);
          // Get Monday of the same week (4 days before Friday)
          end.setDate(end.getDate() - 4);
          newStartDate = formatDateLocal(end);
        }
      } else {
        newEndDate = undefined;
      }
    }

    onFilterChange({
      ...filters,
      startDate: newStartDate,
      endDate: newEndDate,
    });
  };

  // Ensure values rendered in the input are in yyyy-mm-dd
  const formatForInput = (v?: string) => {
    if (!v) return "";
    const parts = v.split("-");
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return v;
  };

  // Compute constraints: end date cannot be before start date
  const startDateForInput = formatForInput(filters.startDate);
  const endDateForInput = formatForInput(filters.endDate);
  
  // Calculate max date (10 years from now) to allow future date selection
  // This functionality works for all roles: employee, manager, and superadmin
  const getMaxDate = (): string => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    return formatDateLocal(maxDate);
  };
  
  const maxDateForInput = getMaxDate();

  // Prepare project options for CustomMultiSelect (no "all" option, empty array = all)
  // Filter out invalid projects and ensure all fields are strings
  const projectOptions = projects
    .filter((project) => project && project.id && project.name)
    .map((project) => ({
      value: Number(project.id),
      label: String(project.name || `Project ${project.id}`),
    }));

  // Prepare employee options for CustomMultiSelect (no "all" option, empty array = all)
  // Filter out invalid employees and superadmin users, ensure all fields are strings
  const employeeOptions = employees
    .filter(
      (employee) =>
        employee &&
        employee.id &&
        employee.username &&
        employee.role !== "super_admin" &&
        employee.role !== "superadmin"
    )
    .map((employee) => ({
      value: Number(employee.id),
      label: `${String(employee.username || `User ${employee.id}`)} (${String(
        employee.role || "employee"
      )})`,
    }));

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-2">
        <label className="white">
          Projects:
        </label>
        <CustomMultiSelect
          value={getProjectIds()}
          onChange={handleProjectChange}
          options={projectOptions}
          placeholder="All Projects"
        />
      </div>

      {/* Hide employee filter for employee role */}
      {userRole !== "employee" && (
        <div className="flex flex-col gap-2">
          <label className="white">
            Team Members:
          </label>
          <CustomMultiSelect
            value={getEmployeeIds()}
            onChange={handleEmployeeChange}
            options={employeeOptions}
            placeholder="All Team Members"
          />
        </div>
      )}

      {/* Date Range Picker - Available for all roles (employee, manager, superadmin) */}
      <div className="flex flex-col gap-2">
        <label className="white">
          Date Range:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDateForInput}
            onChange={(e) => handleDateChange("startDate", e.target.value)}
            className="w-[140px] bg-background border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Start Date"
            max={maxDateForInput}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <input
            type="date"
            value={endDateForInput}
            onChange={(e) => handleDateChange("endDate", e.target.value)}
            className="w-[140px] bg-background border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="End Date"
            min={startDateForInput || undefined}
            max={maxDateForInput}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
