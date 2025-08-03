import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, change, className = '' }) => {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-error';
      default: return 'text-base-content/70';
    }
  };

  return (
    <div className={`stats shadow bg-base-100 ${className}`}>
      <div className="stat">
        <div className="stat-figure text-primary">
          <div className="text-3xl">{icon}</div>
        </div>
        <div className="stat-title text-base-content/70">{title}</div>
        <div className="stat-value text-primary">{value}</div>
        {change && (
          <div className={`stat-desc ${getTrendColor(change.trend)}`}>
            {change.value}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;