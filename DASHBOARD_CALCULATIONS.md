# Dashboard Metrics Calculation Documentation

This document defines the exact formulas used for calculating **Utilization**, **Productivity**, and **Available Hours** in the Project Management Dashboard. All implementations must strictly follow these calculations.

## Overview

The dashboard displays three key metrics over time (grouped by weeks):

1. **Utilization** - Percentage of available time that is planned/allocated
2. **Productivity** - Efficiency metric based on actual vs planned hours or productivity ratings
3. **Available Hours** - Remaining capacity after accounting for planned work

---

## 1. Utilization Calculation

### Formula
```
Utilization % = (Total Planned Hours / Total Available Hours) × 100
```

### Calculation Steps

1. **Group by Week**: All tasks are grouped by week using `DATE_FORMAT(due_date, '%Y-W%u')`

2. **For Each Week**:
   - **Total Planned Hours**: Sum of all `planned_hours` from tasks where `due_date` falls in that week
   - **Total Available Hours**: Sum of all `available_hours_per_week` from users who have tasks in that week
   - **Per Employee Calculation**: 
     - For each employee with tasks in that week:
       - Sum their `planned_hours` for that week
       - Get their `available_hours_per_week` from users table
     - Aggregate across all employees: Sum all planned hours and sum all available hours

3. **Final Calculation**:
   ```
   Utilization = (SUM(planned_hours) / SUM(available_hours_per_week)) × 100
   ```

### SQL Logic (from backend)
```sql
SELECT 
  week,
  SUM(planned_hours) as planned_hours,
  SUM(available_hours) as available_hours,
  ROUND((SUM(planned_hours) / NULLIF(SUM(available_hours), 0)) * 100, 1) as utilization_percentage
FROM (
  SELECT 
    DATE_FORMAT(t.due_date, '%Y-W%u') as week,
    t.assignee_id,
    SUM(t.planned_hours) as planned_hours,
    MAX(u.available_hours_per_week) as available_hours
  FROM tasks t
  JOIN users u ON t.assignee_id = u.id
  WHERE [filters apply]
  GROUP BY DATE_FORMAT(t.due_date, '%Y-W%u'), t.assignee_id
) as employee_utilization
GROUP BY week
```

### Important Notes
- Utilization can exceed 100% (overutilization) when planned hours > available hours
- Only counts tasks that have a `due_date` in the filtered date range
- Includes all task statuses (todo, in_progress, completed, blocked)

---

## 2. Productivity Calculation

### Formula
Productivity uses a **weighted average** when productivity ratings exist, otherwise falls back to actual vs planned hours.

### Primary Calculation (with Productivity Ratings)
```
Productivity = SUM(productivity_rating × planned_hours) / SUM(planned_hours)
```
For tasks that have a `productivity_rating`, use weighted average.

### Fallback Calculation (without Productivity Ratings)
```
Productivity = (SUM(actual_hours) / SUM(planned_hours)) × 100
```
When no tasks have productivity ratings, use actual vs planned hours ratio.

### Calculation Steps

1. **Group by Week**: All tasks grouped by week

2. **For Each Week**:
   - Count completed tasks: `COUNT(CASE WHEN status = 'completed' THEN 1 END)`
   - Sum actual hours: `SUM(actual_hours)`
   - Sum planned hours: `SUM(planned_hours)`
   - Check if any tasks have `productivity_rating`:
     - **If YES**: Calculate weighted average:
       ```
       Productivity = SUM(productivity_rating × planned_hours) / SUM(planned_hours)
       ```
       (Only for tasks where `productivity_rating IS NOT NULL`)
     - **If NO**: Calculate ratio:
       ```
       Productivity = (SUM(actual_hours) / SUM(planned_hours)) × 100
       ```

### SQL Logic (from backend)
```sql
SELECT 
  DATE_FORMAT(t.due_date, '%Y-W%u') as week,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  SUM(t.actual_hours) as actual_hours,
  SUM(t.planned_hours) as planned_hours,
  CASE 
    WHEN SUM(CASE WHEN t.productivity_rating IS NOT NULL THEN t.planned_hours ELSE 0 END) > 0 THEN
      -- Use weighted average: SUM(rating × planned_hours) / SUM(planned_hours)
      ROUND(
        SUM(CASE WHEN t.productivity_rating IS NOT NULL THEN t.productivity_rating * t.planned_hours ELSE 0 END) / 
        NULLIF(SUM(CASE WHEN t.productivity_rating IS NOT NULL THEN t.planned_hours ELSE 0 END), 0),
        1
      )
    ELSE
      -- Calculate overall: SUM(actual_hours) / SUM(planned_hours) × 100
      ROUND((SUM(t.actual_hours) / NULLIF(SUM(t.planned_hours), 0)) * 100, 1)
  END as productivity_percentage
FROM tasks t
WHERE [filters apply]
GROUP BY DATE_FORMAT(t.due_date, '%Y-W%u')
```

### Important Notes
- Productivity ratings are typically 1-100 scale
- If no tasks have ratings, falls back to actual/planned hours ratio
- Includes all task statuses in the calculation
- Completed tasks are counted separately for display

---

## 3. Available Hours Calculation

### Formula
```
Available Hours = Total Available Hours (from users) - Total Planned Hours (from tasks)
```

### Calculation Steps

1. **Determine Relevant Users**:
   - If filtering by employee: Use that employee's `available_hours_per_week`
   - If filtering by project: Sum `available_hours_per_week` for all users assigned to that project via `project_team_members`
   - If no filters: Sum `available_hours_per_week` for all users

2. **Calculate Total Available Hours**:
   ```
   Total Available = SUM(users.available_hours_per_week)
   ```
   (Based on filter scope)

3. **For Each Week**:
   - Sum all `planned_hours` from tasks where `due_date` falls in that week
   - Calculate: `Available Hours = Total Available - SUM(planned_hours)`

4. **Result**:
   - **Positive values**: Remaining available capacity
   - **Negative values**: Overutilization (planned hours exceed available hours)

### SQL Logic (from backend)

**Step 1: Get Total Available Hours**
```sql
-- Single employee
SELECT COALESCE(SUM(available_hours_per_week), 0) as total 
FROM users WHERE id = ?

-- Project employees
SELECT COALESCE(SUM(u.available_hours_per_week), 0) as total
FROM users u
INNER JOIN project_team_members ptm ON u.id = ptm.user_id
WHERE ptm.project_id = ?

-- All users
SELECT COALESCE(SUM(available_hours_per_week), 0) as total FROM users
```

**Step 2: Calculate Available Hours Per Week**
```sql
SELECT 
  week,
  COALESCE(?, 0) - COALESCE(SUM(total_planned_hours), 0) as available_hours
FROM (
  SELECT 
    DATE_FORMAT(t.due_date, '%Y-W%u') as week,
    SUM(t.planned_hours) as total_planned_hours
  FROM tasks t
  WHERE [filters apply]
  GROUP BY DATE_FORMAT(t.due_date, '%Y-W%u')
) as availability_calc
GROUP BY week
```
(Where `?` is the total available hours from Step 1)

### Important Notes
- Negative values indicate overutilization and should be displayed as warnings
- If no tasks exist for a week, available hours = total available hours from users
- Includes all task statuses (not just active tasks)
- The calculation is done per week, not per employee

---

## Filtering Logic

### Single Project Filter
- Filter tasks: `WHERE t.project_id = ?`
- Filter users for availability: Users assigned to that project via `project_team_members`

### Multiple Projects Filter
- Filter tasks: `WHERE t.project_id IN (?, ?, ...)`
- Filter users for availability: Users assigned to any of those projects

### Single Employee Filter
- Filter tasks: `WHERE t.assignee_id = ?`
- Filter users for availability: Only that employee

### Multiple Employees Filter
- Filter tasks: `WHERE t.assignee_id IN (?, ?, ...)`
- Filter users for availability: Sum `available_hours_per_week` for all selected employees

### Date Range Filter
- Filter tasks: `WHERE DATE(t.due_date) >= ? AND DATE(t.due_date) <= ?`
- Only affects task-based calculations
- Does not affect user availability (which is constant per week)

---

## Week Grouping

All metrics are grouped by **ISO week format**: `YYYY-Www`

- Week starts on Monday
- Format: `2024-W01`, `2024-W02`, etc.
- Generated for all weeks in the date range (even if no tasks exist)

---

## Summary Table

| Metric | Formula | Data Source | Notes |
|--------|---------|-------------|-------|
| **Utilization** | `(Planned Hours / Available Hours) × 100` | Tasks (planned_hours) + Users (available_hours_per_week) | Can exceed 100% |
| **Productivity** | `Weighted Avg(rating × planned) / SUM(planned)` OR `(Actual / Planned) × 100` | Tasks (productivity_rating, actual_hours, planned_hours) | Uses rating if available, else ratio |
| **Available Hours** | `Total Available - Planned Hours` | Users (available_hours_per_week) - Tasks (planned_hours) | Can be negative (overutilization) |

---

## Implementation Requirements

1. **All calculations MUST follow these exact formulas**
2. **Week grouping MUST use ISO week format (`YYYY-Www`)**
3. **Multi-select filters MUST aggregate data correctly**:
   - Multiple projects: Sum planned hours across all selected projects
   - Multiple employees: Sum available hours across all selected employees
4. **Edge cases MUST be handled**:
   - Division by zero (use NULLIF)
   - Missing weeks (fill with zeros or default values)
   - No tasks in date range (show baseline available hours)
5. **Data consistency**: All three metrics must use the same week grouping and filters

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: System Documentation

