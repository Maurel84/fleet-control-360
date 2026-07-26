import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatCurrency(amount: number | null | undefined, currency = 'XOF'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  if (currency === 'XOF') {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA';
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR').format(n);
}

export function formatDate(value: string | Date | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, fmt, { locale: fr });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "dd/MM/yyyy 'à' HH:mm");
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return differenceInDays(d, new Date());
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
