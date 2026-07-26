import { type ReactNode } from 'react';
import { type FieldError } from 'react-hook-form';

export function FormField({
  label,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  error?: FieldError | string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  const msg = typeof error === 'string' ? error : error?.message;
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !msg && <p className="text-xs text-ink-400 dark:text-ink-500 mt-1">{hint}</p>}
      {msg && <p className="text-xs text-red-500 mt-1">{msg}</p>}
    </div>
  );
}

export function Select({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
}) {
  return (
    <select {...props} className={props.className ?? 'input'}>
      <option value="">Sélectionner…</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
