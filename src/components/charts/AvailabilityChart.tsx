import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { WeeklyData } from '../../types';

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
  const chartData = {
    labels: data.map(item => item.week),
    datasets: [
      {
        label: 'Available Hours',
        data: data.map(item => item.availableHours),
        backgroundColor: 'rgb(34, 197, 94)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        max: 350,
        ticks: {
          stepSize: 50,
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Team Availability</h3>
      </div>
      <div className="chart-content">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default AvailabilityChart;
