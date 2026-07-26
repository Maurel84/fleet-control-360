import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField } from '../components/FormField';
import { StatCard } from '../components/StatCard';
import { cn } from '../lib/cn';
import type { Agency } from '../lib/types';

interface FormState {
  name: string; code: string; city: string; country: string;
  address: string; phone: string; manager_name: string;
}

const EMPTY: FormState = { name: '', code: '', city: '', country: 'Côte d\'Ivoire', address: '', phone: '', manager_name: '' };

export function AgenciesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: agencies, loading, refetch } = useQuery<Agency>('agencies', '*', { order: ['name', { ascending: true }] });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agency | null>(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (a: Agency) => {
    setEditing(a);
    setForm({ name: a.name, code: a.code || '', city: a.city || '', country: a.country || '', address: a.address || '', phone: a.phone || '', manager_name: a.manager_name || '' });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.name) { toast('Le nom est obligatoire.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      name: form.name, code: form.code || null, city: form.city || null,
      country: form.country || null, address: form.address || null,
      phone: form.phone || null, manager_name: form.manager_name || null, is_active: true,
    };
    const { error } = editing
      ? await supabase.from('agencies').update(payload).eq('id', editing.id)
      : await supabase.from('agencies').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Agence modifiée.' : 'Agence créée.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('agencies').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Agence supprimée.', 'success'); refetch(); }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Agency>[] = [
    {
      key: 'name', header: 'Agence', sortable: true, sortValue: (a) => a.name,
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-500 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4" /></div>
          <div><p className="font-medium text-ink-800 dark:text-ink-100">{a.name}</p><p className="text-xs text-ink-400">{a.code || '—'}</p></div>
        </div>
      ),
    },
    { key: 'city', header: 'Ville', render: (a) => <span className="text-sm text-ink-600 dark:text-ink-300 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-ink-400" />{a.city || '—'}</span> },
    { key: 'phone', header: 'Téléphone', render: (a) => <span className="text-sm text-ink-600 dark:text-ink-300">{a.phone || '—'}</span> },
    { key: 'manager', header: 'Responsable', render: (a) => <span className="text-sm text-ink-600 dark:text-ink-300">{a.manager_name || '—'}</span> },
    { key: 'status', header: 'Statut', render: (a) => <span className={cn('badge', a.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400')}>{a.is_active ? 'Actif' : 'Inactif'}</span> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(a)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(a)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Agences" subtitle={`${agencies?.length ?? 0} agence(s)`} icon={<Building2 className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Ajouter</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total agences" value={agencies?.length ?? 0} color="blue" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Actives" value={(agencies ?? []).filter((a) => a.is_active).length} color="emerald" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Villes" value={new Set((agencies ?? []).map((a) => a.city).filter(Boolean)).size} color="indigo" icon={<MapPin className="w-5 h-5" />} />
      </div>
      <DataTable columns={columns} rows={agencies ?? []} rowKey={(a) => a.id} loading={loading}
        searchKeys={(a) => `${a.name} ${a.code || ''} ${a.city || ''} ${a.manager_name || ''}`}
        emptyMessage="Aucune agence" emptyHint="Ajoutez vos agences." />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier l\'agence' : 'Ajouter une agence'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nom" required><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></FormField>
          <FormField label="Code"><input className="input" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="ABJ-COC" /></FormField>
          <FormField label="Ville"><input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} /></FormField>
          <FormField label="Pays"><input className="input" value={form.country} onChange={(e) => set('country', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Adresse"><input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} /></FormField></div>
          <FormField label="Téléphone"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></FormField>
          <FormField label="Responsable"><input className="input" value={form.manager_name} onChange={(e) => set('manager_name', e.target.value)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer l'agence" message={`Supprimer ${deleteTarget?.name} ?`} confirmLabel="Supprimer" danger />
    </div>
  );
}
