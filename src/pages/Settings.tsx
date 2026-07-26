import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Building2, Bell, Shield } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import type { Organization } from '../lib/types';

type Tab = 'organization' | 'profile' | 'security';

export function SettingsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('organization');
  const [org, setOrg] = useState<Organization | null>(null);
  const [, setloading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  useEffect(() => {
    if (!profile?.organization_id) return;
    let active = true;
    supabase.from('organizations').select('*').eq('id', profile.organization_id).maybeSingle().then(({ data }) => {
      if (!active) return;
      setOrg(data as Organization | null);
      setloading(false);
    });
    return () => { active = false; };
  }, [profile?.organization_id]);

  const saveOrg = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from('organizations').update({
      name: org.name, legal_name: org.legal_name, address: org.address,
      phone: org.phone, email: org.email, currency_code: org.currency_code,
    }).eq('id', org.id);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else toast('Paramètres enregistrés.', 'success');
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('user_profiles').update({ full_name: fullName, phone }).eq('id', user.id);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else toast('Profil mis à jour.', 'success');
  };

  const tabs: { key: Tab; label: string; icon: typeof Building2 }[] = [
    { key: 'organization', label: 'Entreprise', icon: Building2 },
    { key: 'profile', label: 'Mon profil', icon: SettingsIcon },
    { key: 'security', label: 'Sécurité', icon: Shield },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Paramètres" subtitle="Gérez votre entreprise et votre compte" icon={<SettingsIcon className="w-5 h-5" />} />

      <div className="flex gap-1 mb-4 border-b border-ink-200/60 dark:border-ink-800/60">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'organization' && org && (
        <Card>
          <CardHeader title="Informations de l'entreprise" subtitle="Modifiez les détails de votre organisation" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nom commercial"><input className="input" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></FormField>
            <FormField label="Raison sociale"><input className="input" value={org.legal_name || ''} onChange={(e) => setOrg({ ...org, legal_name: e.target.value })} /></FormField>
            <FormField label="Téléphone"><input className="input" value={org.phone || ''} onChange={(e) => setOrg({ ...org, phone: e.target.value })} /></FormField>
            <FormField label="Email"><input className="input" value={org.email || ''} onChange={(e) => setOrg({ ...org, email: e.target.value })} /></FormField>
            <div className="sm:col-span-2"><FormField label="Adresse"><input className="input" value={org.address || ''} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></FormField></div>
            <FormField label="Devise"><input className="input" value={org.currency_code} onChange={(e) => setOrg({ ...org, currency_code: e.target.value })} /></FormField>
          </div>
          <div className="mt-4"><Button onClick={saveOrg} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
        </Card>
      )}

      {tab === 'profile' && (
        <Card>
          <CardHeader title="Mon profil" subtitle="Vos informations personnelles" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nom complet"><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></FormField>
            <FormField label="Email"><input className="input" value={profile?.email || ''} disabled /></FormField>
            <FormField label="Téléphone"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
            <FormField label="Rôle"><input className="input" value={profile?.is_platform_admin ? 'Super administrateur' : 'Utilisateur'} disabled /></FormField>
          </div>
          <div className="mt-4"><Button onClick={saveProfile} disabled={saving}>{saving ? 'Enregistrement…' : 'Mettre à jour'}</Button></div>
        </Card>
      )}

      {tab === 'security' && (
        <Card>
          <CardHeader title="Sécurité" subtitle="Protection de votre compte" />
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/40 dark:border-emerald-900/30">
              <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Déconnexion automatique</p>
                <p className="text-xs text-ink-500 mt-0.5">Vous êtes automatiquement déconnecté après 30 minutes d'inactivité.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/40 dark:border-blue-900/30">
              <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100">Sécurité RLS</p>
                <p className="text-xs text-ink-500 mt-0.5">Toutes les données sont isolées par organisation via les politiques RLS de Supabase.</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
