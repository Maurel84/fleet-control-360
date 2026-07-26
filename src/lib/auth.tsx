import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserProfile, Role, Agency, Organization } from './types';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  roles: Role[];
  permissions: string[];
  agencies: Agency[];
  organization: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    setProfile(prof as UserProfile | null);

    if (prof && prof.organization_id) {
      const [{ data: roleRows }, { data: agencyRows }, { data: orgRow }] = await Promise.all([
        supabase
          .from('roles')
          .select('*, user_roles!inner(organization_id)')
          .eq('user_roles.user_id', uid)
          .eq('organization_id', prof.organization_id),
        supabase
          .from('agencies')
          .select('*')
          .eq('organization_id', prof.organization_id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('organizations')
          .select('*')
          .eq('id', prof.organization_id)
          .maybeSingle(),
      ]);
      setRoles((roleRows as unknown as Role[]) ?? []);
      setAgencies((agencyRows as Agency[]) ?? []);
      setOrganization(orgRow as Organization | null);
    } else if (prof?.is_platform_admin) {
      const { data: allAgencies } = await supabase.from('agencies').select('*').order('name');
      setAgencies((allAgencies as Agency[]) ?? []);
      setRoles([]);
      setOrganization(null);
    } else {
      setRoles([]);
      setAgencies([]);
      setOrganization(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          await loadProfile(sess.user.id);
        } else {
          setProfile(null);
          setRoles([]);
          setAgencies([]);
          setOrganization(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Inactivity auto-logout
  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.auth.signOut();
      }, INACTIVITY_TIMEOUT_MS);
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [session]);

  useEffect(() => {
    if (organization) {
      localStorage.setItem('fc360-login-logo', organization.logo_url || '');
      localStorage.setItem('fc360-login-name', organization.name || 'FleetControl 360');
      localStorage.setItem('fc360-login-color', organization.primary_color || '#1e40af');
    }
  }, [organization]);

  const permissions = useMemo(() => {
    if (profile?.is_platform_admin) return ['*'];
    const set = new Set<string>();
    roles.forEach((r) => (r.permissions ?? []).forEach((p) => set.add(p)));
    return Array.from(set);
  }, [roles, profile]);

  const value: AuthContextValue = {
    session,
    user,
    profile,
    roles,
    permissions,
    agencies,
    organization,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? translateAuthError(error.message) : null };
    },
    signUp: async (email, password, fullName) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: translateAuthError(error.message) };
      return { error: null };
    },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error: error ? translateAuthError(error.message) : null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setRoles([]);
      setAgencies([]);
      setOrganization(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (m.includes('user already registered')) return 'Un compte existe déjà avec cet email.';
  if (m.includes('rate limit')) return 'Trop de tentatives. Réessayez dans quelques instants.';
  if (m.includes('email not confirmed')) return 'Email non confirmé.';
  return 'Une erreur est survenue. Veuillez réessayer.';
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
