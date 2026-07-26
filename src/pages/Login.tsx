import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Truck, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, BarChart3, MapPin } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

const DEMO_ACCOUNTS = [
  { email: 'director@afc.ci', label: 'Directeur' },
  { email: 'parc@afc.ci', label: 'Responsable parc' },
  { email: 'finance@afc.ci', label: 'Finance' },
  { email: 'agent@afc.ci', label: 'Agent' },
];

export function Login() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Connexion réussie. Bienvenue !', 'success');
      const dest = location.state?.from?.pathname || '/dashboard';
      navigate(dest, { replace: true });
    }
  };

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo1234!');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-ink-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-display font-bold text-xl">FleetControl</p>
              <p className="text-blue-300 text-xs font-semibold tracking-widest">360</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="font-display font-bold text-4xl leading-tight">
              Pilotez votre flotte<br />en toute simplicité
            </h1>
            <p className="mt-4 text-blue-100 text-lg leading-relaxed">
              La plateforme tout-en-un pour gérer vos véhicules, chauffeurs, locations, missions et finances.
            </p>
            <div className="mt-8 space-y-4">
              {[
                { icon: BarChart3, text: 'Tableau de bord en temps réel' },
                { icon: MapPin, text: 'Suivi GPS et géolocalisation' },
                { icon: ShieldCheck, text: 'Sécurité et contrôle d\'accès RBAC' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-blue-50">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-blue-300 text-sm">© 2024 FleetControl 360 — Tous droits réservés</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 bg-beige-50 dark:bg-ink-950">
        <div className="w-full max-w-sm mx-auto">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-ink-900 dark:text-white">FleetControl</p>
              <p className="text-blue-600 text-xs font-semibold tracking-widest">360</p>
            </div>
          </div>

          <h2 className="font-display font-bold text-2xl text-ink-900 dark:text-white">Connexion</h2>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">Accédez à votre espace de gestion de flotte.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@entreprise.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Connexion…' : 'Se connecter'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-ink-200/60 dark:border-ink-800">
            <p className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide mb-3">Comptes de démonstration</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => quickLogin(acc.email)}
                  className="text-left px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition text-xs"
                >
                  <p className="font-medium text-ink-700 dark:text-ink-200">{acc.label}</p>
                  <p className="text-ink-400 truncate">{acc.email}</p>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-400">Mot de passe pour tous : <span className="font-mono font-semibold text-ink-600 dark:text-ink-300">Demo1234!</span></p>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
            Pas encore de compte ?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
