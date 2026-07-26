import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Building2, Bell, Shield, Users, Plus, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import type { Organization } from '../lib/types';

type Tab = 'organization' | 'users' | 'profile' | 'security';

const AVAILABLE_PERMISSIONS = [
  { category: 'Exploitation', perms: [
    { code: 'vehicles.read', name: 'Voir les véhicules' },
    { code: 'vehicles.write', name: 'Créer/Modifier les véhicules' },
    { code: 'drivers.read', name: 'Voir les chauffeurs' },
    { code: 'drivers.write', name: 'Créer/Modifier les chauffeurs' },
    { code: 'clients.read', name: 'Voir les clients' },
    { code: 'clients.write', name: 'Créer/Modifier les clients' },
    { code: 'rentals.read', name: 'Voir les locations' },
    { code: 'rentals.write', name: 'Créer/Modifier les locations' },
    { code: 'missions.read', name: 'Voir les missions' },
    { code: 'missions.write', name: 'Créer/Modifier les missions' },
    { code: 'movements.read', name: 'Voir les mouvements de clés' },
    { code: 'movements.write', name: 'Créer/Modifier les mouvements' },
  ]},
  { category: 'Maintenance & Fluides', perms: [
    { code: 'maintenance.read', name: 'Voir la maintenance' },
    { code: 'maintenance.write', name: 'Créer/Modifier la maintenance' },
    { code: 'fuel.read', name: 'Voir le carburant' },
    { code: 'fuel.write', name: 'Créer/Modifier le carburant' },
  ]},
  { category: 'Finances', perms: [
    { code: 'finance.read', name: 'Voir les factures & dépenses' },
    { code: 'finance.write', name: 'Créer/Modifier les factures & dépenses' },
    { code: 'reports.read', name: 'Voir les rapports analytiques' },
  ]},
  { category: 'Administration & Suivi', perms: [
    { code: 'gps.read', name: 'Accéder au suivi GPS' },
    { code: 'notifications.read', name: 'Voir les alertes' },
    { code: 'settings.read', name: 'Voir les paramètres' },
    { code: 'settings.write', name: 'Modifier les paramètres' },
    { code: 'audit.read', name: 'Voir le journal d\'audit' },
  ]},
];

export function SettingsPage() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('organization');
  const [org, setOrg] = useState<Organization | null>(null);
  const [, setloading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // User management tab states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [userRolesList, setUserRolesList] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [linking, setLinking] = useState(false);

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

  const fetchUsersAndRoles = async () => {
    if (!profile?.organization_id) return;
    
    const [usersRes, rolesRes, userRolesRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('organization_id', profile.organization_id),
      supabase.from('roles').select('*').eq('organization_id', profile.organization_id),
      supabase.from('user_roles').select('*').eq('organization_id', profile.organization_id),
    ]);

    if (usersRes.data) setUsersList(usersRes.data);
    if (rolesRes.data) {
      setRolesList(rolesRes.data);
      if (rolesRes.data.length > 0 && !selectedRole) {
        setSelectedRole(rolesRes.data[0]);
      } else if (selectedRole) {
        const updated = rolesRes.data.find(r => r.id === selectedRole.id);
        if (updated) setSelectedRole(updated);
      }
    }
    if (userRolesRes.data) setUserRolesList(userRolesRes.data);
  };

  useEffect(() => {
    if (tab === 'users') {
      fetchUsersAndRoles();
    }
  }, [tab, profile?.organization_id]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${org.id}/logo_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      setOrg({ ...org, logo_url: data.publicUrl });
      toast('Logo téléversé avec succès. Cliquez sur Enregistrer pour confirmer.', 'success');
    } catch (err: any) {
      toast(`Erreur lors du téléversement : ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleLinkUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !profile?.organization_id) return;

    try {
      setLinking(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', inviteEmail.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast('Aucun utilisateur trouvé avec cet email. Veuillez lui demander de s\'inscrire sur la plateforme en premier.', 'error');
        return;
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ organization_id: profile.organization_id })
        .eq('id', data.id);

      if (updateError) throw updateError;

      const { data: currentRoles } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', data.id)
        .eq('organization_id', profile.organization_id);

      if (!currentRoles || currentRoles.length === 0) {
        const { data: defaultRole } = await supabase
          .from('roles')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('code', 'rental_agent')
          .maybeSingle();

        if (defaultRole) {
          await supabase.from('user_roles').insert({
            user_id: data.id,
            role_id: defaultRole.id,
            organization_id: profile.organization_id,
            assigned_by: user?.id
          });
        }
      }

      toast('Utilisateur associé avec succès.', 'success');
      setInviteEmail('');
      fetchUsersAndRoles();
    } catch (err: any) {
      toast(`Erreur : ${err.message}`, 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    if (!profile?.organization_id) return;

    try {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', profile.organization_id);

      if (roleId) {
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role_id: roleId,
            organization_id: profile.organization_id,
            assigned_by: user?.id,
          });

        if (error) throw error;
      }

      toast('Rôle mis à jour avec succès.', 'success');
      fetchUsersAndRoles();
    } catch (err: any) {
      toast(`Erreur : ${err.message}`, 'error');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!profile?.organization_id) return;
    if (userId === user?.id) {
      toast('Vous ne pouvez pas vous retirer vous-même de l\'entreprise.', 'error');
      return;
    }

    if (!confirm('Voulez-vous vraiment détacher cet utilisateur de votre entreprise ?')) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ organization_id: null })
        .eq('id', userId);

      if (error) throw error;

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', profile.organization_id);

      toast('Utilisateur retiré de l\'entreprise.', 'success');
      fetchUsersAndRoles();
    } catch (err: any) {
      toast(`Erreur : ${err.message}`, 'error');
    }
  };

  const handleTogglePermission = async (permCode: string, checked: boolean) => {
    if (!selectedRole || !profile?.organization_id) return;

    const currentPerms = (selectedRole.permissions as string[]) || [];
    let nextPerms: string[];
    
    if (checked) {
      nextPerms = [...new Set([...currentPerms, permCode])];
    } else {
      nextPerms = currentPerms.filter(p => p !== permCode);
    }

    try {
      const { error } = await supabase
        .from('roles')
        .update({ permissions: nextPerms })
        .eq('id', selectedRole.id);

      if (error) throw error;

      setSelectedRole({ ...selectedRole, permissions: nextPerms });
      setRolesList(rolesList.map(r => r.id === selectedRole.id ? { ...r, permissions: nextPerms } : r));
      toast('Permissions du rôle mises à jour.', 'success');
    } catch (err: any) {
      toast(`Erreur : ${err.message}`, 'error');
    }
  };

  const saveOrg = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from('organizations').update({
      name: org.name, legal_name: org.legal_name, address: org.address,
      phone: org.phone, email: org.email, currency_code: org.currency_code,
      logo_url: org.logo_url,
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
    { key: 'users', label: 'Utilisateurs & Droits', icon: Users },
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-ink-700 dark:text-ink-300 mb-1.5">
                Logo de l'entreprise
              </label>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-ink-300 dark:border-ink-700 bg-ink-50/30 dark:bg-ink-900/10">
                {org.logo_url ? (
                  <div className="w-16 h-16 rounded-lg bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src={org.logo_url} alt="Aperçu du logo" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 font-bold text-xs">
                    Aucun
                  </div>
                )}
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="btn btn-secondary py-1.5 px-3 text-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {uploading ? 'Téléversement...' : 'Choisir un fichier'}
                  </label>
                  {org.logo_url && (
                    <button
                      type="button"
                      onClick={() => setOrg({ ...org, logo_url: '' })}
                      className="btn btn-ghost text-red-600 hover:text-red-700 py-1.5 px-3 text-xs"
                    >
                      Supprimer
                    </button>
                  )}
                  <p className="text-[11px] text-ink-500 w-full mt-1">
                    Format recommandé : PNG ou SVG, fond transparent. Taille max 2 Mo.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4"><Button onClick={saveOrg} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></div>
        </Card>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: User List and recruitment */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader title="Utilisateurs" subtitle="Gérez les collaborateurs rattachés à votre entreprise et leurs rôles" />
              
              <form onSubmit={handleLinkUser} className="mb-6 flex gap-3 items-end">
                <div className="flex-1">
                  <FormField label="Associer un collaborateur (par email)">
                    <input
                      type="email"
                      required
                      placeholder="nom.prenom@entreprise.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="input"
                    />
                  </FormField>
                </div>
                <Button type="submit" disabled={linking}>
                  <Plus className="w-4 h-4 mr-1" />
                  Associer
                </Button>
              </form>

              <div className="overflow-x-auto">
                <table className="table w-full text-left">
                  <thead>
                    <tr className="border-b border-ink-200/60 dark:border-ink-800/60 text-xs text-ink-500 uppercase">
                      <th className="pb-3 font-semibold">Collaborateur</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">Rôle assigné</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100/50 dark:divide-ink-800/40 text-sm">
                    {usersList.map((u) => {
                      const userRole = userRolesList.find((ur) => ur.user_id === u.id);
                      const currentRoleId = userRole?.role_id || '';
                      
                      return (
                        <tr key={u.id} className="hover:bg-ink-50/20 dark:hover:bg-ink-900/10">
                          <td className="py-3 font-medium text-ink-900 dark:text-white">
                            {u.full_name || 'Sans nom'}
                          </td>
                          <td className="py-3 text-ink-500 dark:text-ink-400">{u.email}</td>
                          <td className="py-3">
                            <select
                              value={currentRoleId}
                              onChange={(e) => handleAssignRole(u.id, e.target.value)}
                              className="select py-1 text-xs max-w-[200px]"
                            >
                              <option value="">Aucun rôle</option>
                              {rolesList.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleRemoveUser(u.id)}
                              disabled={u.id === user?.id}
                              className="btn btn-ghost text-red-600 hover:text-red-700 p-1.5 rounded-lg disabled:opacity-30"
                              title="Retirer l'utilisateur"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-ink-500">
                          Aucun collaborateur rattaché pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Column 3: Permissions config */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Modules & Droits" subtitle="Activez les modules par rôle d'utilisateur" />
              
              <div className="space-y-4">
                <div>
                  <label className="label">Sélectionner un rôle à configurer</label>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {rolesList.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRole(r)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition ${selectedRole?.id === r.id ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400' : 'bg-transparent border-ink-200/50 dark:border-ink-800/60 text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800/40'}`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedRole && (
                  <div className="border-t border-ink-200/60 dark:border-ink-800/60 pt-4 space-y-4">
                    <div className="mb-2">
                      <h4 className="font-semibold text-sm text-ink-950 dark:text-white">Permissions du rôle : {selectedRole.name}</h4>
                      <p className="text-xs text-ink-500 mt-0.5">{selectedRole.description}</p>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto space-y-4 pr-1">
                      {AVAILABLE_PERMISSIONS.map((group) => (
                        <div key={group.category} className="space-y-2">
                          <h5 className="text-[11px] font-bold tracking-wider text-ink-400 dark:text-ink-500 uppercase border-b border-ink-100 dark:border-ink-800/50 pb-1">
                            {group.category}
                          </h5>
                          <div className="space-y-1.5">
                            {group.perms.map((p) => {
                              const isChecked = ((selectedRole.permissions as string[]) || []).includes(p.code);
                              return (
                                <label
                                  key={p.code}
                                  className="flex items-center gap-2 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-ink-100 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => handleTogglePermission(p.code, e.target.checked)}
                                    className="rounded border-ink-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>{p.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
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
