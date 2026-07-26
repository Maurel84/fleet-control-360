import { Link } from 'react-router-dom';
import { Truck, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-beige-50 dark:bg-ink-950 px-6">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-6">
        <Truck className="w-7 h-7 text-white" />
      </div>
      <h1 className="font-display font-bold text-6xl text-ink-900 dark:text-white">404</h1>
      <p className="mt-2 text-lg text-ink-500 dark:text-ink-400">Cette page n'existe pas.</p>
      <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
      </Link>
    </div>
  );
}
