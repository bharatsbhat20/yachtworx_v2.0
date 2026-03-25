import React from 'react';
import { clsx } from 'clsx';
import { CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description?: string;
  status: 'completed' | 'scheduled' | 'in_progress' | 'pending';
  provider?: string;
  cost?: number;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-teal-500', bg: 'bg-teal-50', line: 'bg-teal-200' },
  scheduled: { icon: Clock, color: 'text-ocean-500', bg: 'bg-ocean-50', line: 'bg-ocean-200' },
  in_progress: { icon: AlertCircle, color: 'text-gold-500', bg: 'bg-gold-50', line: 'bg-gold-200' },
  pending: { icon: Circle, color: 'text-gray-400', bg: 'bg-gray-50', line: 'bg-gray-200' },
};

export const Timeline: React.FC<TimelineProps> = ({ items, className }) => {
  return (
    <div className={clsx('relative', className)}>
      {items.map((item, index) => {
        const config = statusConfig[item.status];
        const Icon = config.icon;
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={clsx('p-1.5 rounded-full', config.bg)}>
                <Icon size={16} className={config.color} />
              </div>
              {!isLast && <div className={clsx('w-0.5 flex-1 my-1', config.line)} />}
            </div>
            <div className={clsx('pb-6', isLast && 'pb-0')}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">{item.date}</p>
                  <h4 className="text-sm font-heading font-semibold text-navy-500">{item.title}</h4>
                  {item.provider && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.provider}</p>
                  )}
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.description}</p>
                  )}
                </div>
                {item.cost !== undefined && item.cost > 0 && (
                  <span className="text-sm font-semibold text-navy-500 whitespace-nowrap">
                    ${item.cost.toLocaleString()}
                  </span>
                )}
                {item.status === 'scheduled' && item.cost === 0 && (
                  <span className="text-xs bg-ocean-50 text-ocean-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Scheduled
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
