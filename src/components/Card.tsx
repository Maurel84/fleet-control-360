import { type ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card p-5', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="font-display font-semibold text-ink-900 dark:text-ink-50 text-base">{title}</h3>
        {subtitle && <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('badge', className)}>{children}</span>;
}

export function StatusBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={cn('badge', colorClass)}>{label}</span>;
}
