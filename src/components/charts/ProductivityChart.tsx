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

interface ProductivityChartProps {
  data: WeeklyData[];
}

const ProductivityChart: React.FC<ProductivityChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.week),
    datasets: [
      {
        label: 'Completed',
        data: data.map(item => item.completed),
        backgroundColor: 'rgb(59, 130, 246)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Hours',
        data: data.map(item => item.hours),
        backgroundColor: 'rgb(251, 146, 60)',
        borderColor: 'rgb(251, 146, 60)',
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
        max: 120,
        ticks: {
          stepSize: 20,
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
        <h3>Productivity & Hours</h3>
      </div>
      <div className="chart-content">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ProductivityChart;
