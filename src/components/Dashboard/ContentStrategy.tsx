/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Content Strategy Dashboard Component
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Displays real-time content strategy metrics with professional UI:
 * - Total Pages, At Target, Processing, Avg Score, Completed, Total Words
 * - Real-time updates from Zustand store
 * - Enterprise-grade design with Tailwind CSS
 * - Animated counters and progress indicators
 * 
 * @component
 */

import React from 'react';
import { useAppStore } from '../../core/store/app-store';

interface MetricCardProps {
  icon: string;
  label: string;
  value: number | string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'processing';
  suffix?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, variant = 'default', suffix = '' }) => {
  const variants = {
    default: 'bg-gray-50 border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
    processing: 'bg-purple-50 border-purple-200'
  };

  return (
    <div className={`flex flex-col p-4 rounded-lg border-2 ${variants[variant]} transition-all duration-300 hover:shadow-lg`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">
        {value}
        {suffix && <span className="text-lg text-gray-500 ml-1">{suffix}</span>}
      </div>
    </div>
  );
};

export const ContentStrategy: React.FC = () => {
  const { contentStrategy } = useAppStore();

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <span className="text-4xl">🚀</span>
          Content Strategy
        </h1>
        <p className="text-gray-600">Crawl sitemaps and optimize content</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard
          icon="📄"
          label="Total Pages"
          value={contentStrategy.totalPages}
          variant="info"
        />
        
        <MetricCard
          icon="✓"
          label="At Target"
          value={contentStrategy.atTarget}
          variant="success"
        />
        
        <MetricCard
          icon="⚡"
          label="Processing"
          value={contentStrategy.processing}
          variant="processing"
        />
        
        <MetricCard
          icon="📈"
          label="Avg Score"
          value={contentStrategy.avgScore.toFixed(1)}
          suffix="%"
          variant="default"
        />
        
        <MetricCard
          icon="🎯"
          label="Completed"
          value={contentStrategy.completed}
          variant="success"
        />
        
        <MetricCard
          icon="📝"
          label="Total Words"
          value={contentStrategy.totalWords.toLocaleString()}
          variant="info"
        />
      </div>

      {/* Success Rate Bar */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">Success Rate</span>
          <span className="text-2xl font-bold text-gray-900">{contentStrategy.successRate.toFixed(1)}%</span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out"
            style={{ width: `${contentStrategy.successRate}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ContentStrategy;
