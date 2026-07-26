import { type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'cyan' | 'stone' | 'indigo';
  hint?: string;
}

const colorClasses: Record<string, { icon: string; ring: string }> = {
  blue: { icon: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300', ring: 'ring-blue-100 dark:ring-blue-900/30' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', ring: 'ring-emerald-100 dark:ring-emerald-900/30' },
  amber: { icon: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', ring: 'ring-amber-100 dark:ring-amber-900/30' },
  red: { icon: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300', ring: 'ring-red-100 dark:ring-red-900/30' },
  violet: { icon: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', ring: 'ring-violet-100 dark:ring-violet-900/30' },
  cyan: { icon: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300', ring: 'ring-cyan-100 dark:ring-cyan-900/30' },
  stone: { icon: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300', ring: 'ring-stone-100 dark:ring-stone-800' },
  indigo: { icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300', ring: 'ring-indigo-100 dark:ring-indigo-900/30' },
};

export function StatCard({ label, value, icon, trend, trendLabel, color = 'blue', hint }: StatCardProps) {
  const c = colorClasses[color];
  return (
    <div className="card p-4 sm:p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 text-2xl font-display font-bold text-ink-900 dark:text-ink-50 truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">{hint}</p>}
        </div>
        {icon && (
          <div className={cn('rounded-xl p-2.5 ring-4 flex-shrink-0', c.icon, c.ring)}>
            {icon}
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trend >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={trend >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          {trendLabel && <span className="text-ink-400 dark:text-ink-500">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
