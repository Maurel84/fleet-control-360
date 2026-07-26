import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export function Signup() {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast('Le mot de passe doit contenir au moins 8 caractères.', 'error');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Compte créé. Vous pouvez vous connecter.', 'success');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige-50 dark:bg-ink-950 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-ink-900 dark:text-white">FleetControl</p>
            <p className="text-blue-600 text-xs font-semibold tracking-widest">360</p>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="font-display font-bold text-2xl text-ink-900 dark:text-white">Créer un compte</h2>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">Inscrivez-vous pour commencer à gérer votre flotte.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jean Kouassi" className="input pl-10" />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" className="input pl-10" />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 caractères" className="input pl-10" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Création…' : 'Créer le compte'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
          Déjà inscrit ?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
