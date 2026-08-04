import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Truck, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, BarChart3, MapPin } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/cn';

const DEMO_ACCOUNTS = [
  { email: 'director@afc.ci', label: 'Directeur' },
  { email: 'parc@afc.ci', label: 'Responsable parc' },
  { email: 'finance@afc.ci', label: 'Finance' },
  { email: 'agent@afc.ci', label: 'Agent' },
];

const VEHICLE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=1200&q=80'
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

  const [orgBranding, setOrgBranding] = useState({
    name: localStorage.getItem('fc360-login-name') || 'FleetControl 360',
    logoUrl: localStorage.getItem('fc360-login-logo') || '',
    primaryColor: localStorage.getItem('fc360-login-color') || '#1e40af'
  });

  const [activeBgIndex, setActiveBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBgIndex((prev) => (prev + 1) % VEHICLE_BACKGROUNDS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic branding lookup when email matches standard format
  useEffect(() => {
    if (!email || !email.includes('@') || !email.includes('.')) return;
    
    let active = true;
    const lookup = async () => {
      try {
        const { data, error } = await supabase.rpc('get_organization_by_email', { email_input: email.trim() });
        if (active && data && data.length > 0) {
          const org = data[0];
          setOrgBranding({
            name: org.name || 'FleetControl 360',
            logoUrl: org.logo_url || '',
            primaryColor: org.primary_color || '#1e40af'
          });
        }
      } catch (err) {
        console.error("Error looking up organization branding:", err);
      }
    };
    
    const timer = setTimeout(lookup, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [email]);

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
    <div className="min-h-screen flex bg-beige-50 dark:bg-ink-950">
      {/* Left brand panel */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden transition-all duration-500 ease-in-out"
        style={{ backgroundColor: '#020617' }}
      >
        {/* Background Slideshow of Vehicles */}
        {VEHICLE_BACKGROUNDS.map((src, index) => (
          <div
            key={src}
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out",
              index === activeBgIndex ? "opacity-35 scale-105" : "opacity-0 scale-100"
            )}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}

        {/* Dynamic Color brand overlay */}
        <div 
          className="absolute inset-0 transition-colors duration-1000 ease-in-out z-10"
          style={{ backgroundImage: `linear-gradient(to bottom right, ${orgBranding.primaryColor}D9, #020617F2)` }}
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10 z-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Brand content */}
        <div className="relative flex flex-col justify-between p-12 text-white w-full h-full z-20">
          <div className="flex items-center gap-3">
            {orgBranding.logoUrl ? (
              <img src={orgBranding.logoUrl} alt="Logo" className="w-11 h-11 object-contain rounded-xl bg-white/10 p-1" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
            )}
            <div>
              <p className="font-display font-bold text-xl">{orgBranding.name}</p>
              <p className="text-blue-300 text-xs font-semibold tracking-widest uppercase">Espace Partenaire</p>
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

          <p className="text-blue-300 text-sm">© 2026 {orgBranding.name} — Tous droits réservés</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 bg-beige-50 dark:bg-ink-950">
        <div className="w-full max-w-sm mx-auto animate-fade-in">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            {orgBranding.logoUrl ? (
              <img src={orgBranding.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-xl bg-ink-100 dark:bg-ink-900 p-1" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="font-display font-bold text-ink-900 dark:text-white">{orgBranding.name}</p>
              <p className="text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-widest uppercase">Espace Partenaire</p>
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

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-2.5 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: orgBranding.primaryColor }}
            >
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
