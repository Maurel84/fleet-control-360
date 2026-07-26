import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, icon, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6', className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-ink-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
