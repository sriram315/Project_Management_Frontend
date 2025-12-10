import React from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import "../../App.css";

ChartJS.register(ArcElement, Tooltip, Legend);

interface TaskStatusData {
  todo: number;
  in_progress: number;
  completed: number;
  blocked: number;
}

interface TaskStatusChartProps {
  data: TaskStatusData;
}

const TaskStatusChart: React.FC<TaskStatusChartProps> = ({ data }) => {
  const chartData = {
    labels: ["To Do", "In Progress", "Completed", "Blocked"],
    datasets: [
      {
        data: [data.todo, data.in_progress, data.completed, data.blocked],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)", // Blue for To Do
          "rgba(245, 158, 11, 0.8)", // Orange for In Progress
          "rgba(34, 197, 94, 0.8)", // Green for Completed
          "rgba(239, 68, 68, 0.8)", // Red for Blocked
        ],
        borderColor: [
          "rgba(59, 130, 246, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(239, 68, 68, 1)",
        ],
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="chart-container">
      {/* <div className="chart-header">
        <h3>Task Status Distribution</h3>
      </div> */}
      <div className="chart-content">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

export default TaskStatusChart;
