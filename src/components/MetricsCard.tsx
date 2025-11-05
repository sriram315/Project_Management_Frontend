import React from 'react';

interface MetricsCardProps {
  title: string;
  value: number | string;
  label: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, label }) => {
  return (
    <div className="metrics-card">
      <h3>{title}</h3>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
};

export default MetricsCard;

