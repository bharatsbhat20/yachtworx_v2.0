import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'pills' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
}) => {
  if (variant === 'underline') {
    return (
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={clsx(
                'relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'text-ocean-600'
                  : 'text-gray-500 hover:text-navy-500'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={clsx(
                    'ml-1 text-xs rounded-full px-1.5 py-0.5',
                    activeTab === tab.id
                      ? 'bg-ocean-100 text-ocean-700'
                      : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="underline-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-ocean-500"
                />
              )}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-ocean-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'ml-0.5 text-xs rounded-full px-1.5',
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
            activeTab === tab.id
              ? 'bg-white text-navy-500 shadow-sm'
              : 'text-gray-500 hover:text-navy-500'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
