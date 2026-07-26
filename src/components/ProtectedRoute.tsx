import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Truck } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-beige-50 dark:bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center animate-pulse">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-ink-500">Chargement de la session…</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
