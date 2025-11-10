import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { WeeklyData } from "../../types";
 
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
 
interface AvailabilityChartProps {
  data: WeeklyData[];
}
 
const AvailabilityChart: React.FC<AvailabilityChartProps> = ({ data }) => {
  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-header"></div>
        <div className="chart-content">
          <div className="w-full h-full flex items-center justify-center text-gray-400">No data available</div>
        </div>
      </div>
    );
  }

  // split values into positive (available) and negative (overly utilised)
  const availableData = data.map((item) => {
    const hours = item.availableHours ?? 0;
    return Math.max(hours, 0);
  });
  const overlyUtilisedData = data.map((item) => {
    const hours = item.availableHours ?? 0;
    return hours < 0 ? hours : 0;
  }); // keep negative numbers -> they render below 0

  // Calculate min/max safely
  const allHours = data.map((d) => d.availableHours ?? 0);
  const minHours = allHours.length > 0 ? Math.min(...allHours) : 0;
  const maxHours = allHours.length > 0 ? Math.max(...allHours) : 200;

  const chartData = {
    labels: data.map((item) => item.week),
    datasets: [
      {
        label: "Available Hours",
        data: availableData,
        backgroundColor: "rgb(34, 197, 94)", // green
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 0,
        borderRadius: 4,
        minBarLength: 2, // Ensure zero values are visible
      },
      {
        label: "Overly Utilised",
        data: overlyUtilisedData,
        backgroundColor: "rgb(239, 68, 68)", // red
        borderColor: "rgb(239, 68, 68)",
        borderWidth: 0,
        borderRadius: 4,
        minBarLength: 2, // Ensure zero values are visible
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disable animation to ensure immediate updates
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
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
          // Make overly utilised tooltip show positive number for readability
          label: function (context: any) {
            const label = context.dataset.label || "";
            const val = context.raw;
            if (label === "Overly Utilised") {
              return `${label}: ${Math.abs(val)}`; // show absolute value
            }
            return `${label}: ${val}`;
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        // set a sensible range including negatives
        suggestedMin: Math.min(minHours, -50),
        suggestedMax: Math.max(maxHours, 200),
        ticks: {
          stepSize: 25,
          font: { size: 11 },
        },
        grid: { color: "rgba(0, 0, 0, 0.1)" },
      },
    },
  };
 
  return (
    <div className="chart-container">
      <div className="chart-header">{/* <h3>Team Availability</h3> */}</div>
      <div className="chart-content">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};
 
export default AvailabilityChart;