import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white dark:bg-ink-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]', sizes[size])}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-ink-200/60 dark:border-ink-800/60">
          <div>
            <h2 className="font-display font-semibold text-lg text-ink-900 dark:text-ink-50">{title}</h2>
            {subtitle && <p className="text-sm text-ink-500 dark:text-ink-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-200 p-1 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-ink-200/60 dark:border-ink-800/60 bg-ink-50/50 dark:bg-ink-950/30 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', danger }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={cn('btn', danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700', 'px-4 py-2 text-sm')}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{message}</p>
    </Modal>
  );
}
