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
  // 3D-style donut look: bold blue, green, red, with a neutral slice if needed
  const chartData = {
    labels: ["To Do", "In Progress", "Completed", "Blocked"],
    datasets: [
      {
        data: [data.todo, data.in_progress, data.completed, data.blocked],
        backgroundColor: [
          "rgba(37, 99, 235, 0.95)", // To Do - Blue
          "rgba(250, 204, 21, 0.95)", // In Progress - Yellow
          "rgba(34, 197, 94, 0.95)", // Completed - Green
          "rgba(239, 68, 68, 0.95)", // Blocked - Red
        ],
        borderColor: [
          "rgba(30, 64, 175, 1)", // To Do - Blue border
          "rgba(202, 138, 4, 1)", // In Progress - Yellow border
          "rgba(22, 163, 74, 1)", // Completed - Green border
          "rgba(185, 28, 28, 1)", // Blocked - Red border
        ],
        borderWidth: 3,
        hoverOffset: 10,
        cutout: "55%", // thicker ring, closer to the reference
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "right" as const,
        labels: {
          usePointStyle: true,
          padding: 18,
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
