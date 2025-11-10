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
    labels: data.map(item => item?.week || ''),
    datasets: [
      {
        label: 'Productivity %',
        data: data.map(item => {
          const value = item?.productivity;
          return value !== null && value !== undefined && !isNaN(value) ? value : 0;
        }),
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
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const dataIndex = context.dataIndex;
            const item = data[dataIndex];
            const productivity = item?.productivity;
            const hours = item?.hours ?? 0;
            const plannedHours = item?.plannedHours ?? 0;
            
            if (productivity === null || productivity === undefined) {
              return [
                `Productivity: N/A (no completed tasks)`,
                `Actual Hours: ${hours.toFixed(1)}h`,
                `Planned Hours: ${plannedHours.toFixed(1)}h`
              ];
            }
            
            return [
              `Productivity: ${productivity.toFixed(1)}%`,
              `Actual Hours: ${hours.toFixed(1)}h`,
              `Planned Hours: ${plannedHours.toFixed(1)}h`
            ];
          }
        }
      }
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
        max: 200,
        ticks: {
          stepSize: 25,
          font: {
            size: 11,
          },
          callback: function(value: any) {
            return value + '%';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className="chart-container">
      {/* <div className="chart-header">
        <h3>Productivity & Hours</h3>
      </div> */}
      <div className="chart-content">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ProductivityChart;
