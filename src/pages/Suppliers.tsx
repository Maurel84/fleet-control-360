import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Star, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import type { Supplier } from '../lib/types';

const TYPE_OPTIONS = [
  { value: 'garage', label: 'Garage' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'fuel_supplier', label: 'Fournisseur carburant' },
  { value: 'parts', label: 'Pièces détachées' },
  { value: 'tire', label: 'Pneus' },
  { value: 'other', label: 'Autre' },
];

interface FormState {
  type: string; name: string; contact_person: string; phone: string; email: string;
  address: string; services: string; rating: string; notes: string;
}

const EMPTY: FormState = { type: 'garage', name: '', contact_person: '', phone: '', email: '', address: '', services: '', rating: '', notes: '' };

export function SuppliersPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: suppliers, loading, refetch } = useQuery<Supplier>('suppliers', '*', { order: ['name', { ascending: true }] });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ type: s.type, name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', services: s.services || '', rating: s.rating?.toString() || '', notes: s.notes || '' });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.name) { toast('Le nom est obligatoire.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      type: form.type, name: form.name, contact_person: form.contact_person || null,
      phone: form.phone || null, email: form.email || null, address: form.address || null,
      services: form.services || null, rating: form.rating ? parseFloat(form.rating) : null, notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from('suppliers').update(payload).eq('id', editing.id)
      : await supabase.from('suppliers').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Fournisseur modifié.' : 'Fournisseur ajouté.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Fournisseur supprimé.', 'success'); refetch(); }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Supplier>[] = [
    {
      key: 'name', header: 'Fournisseur', sortable: true, sortValue: (s) => s.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-500 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4" /></div>
          <div><p className="font-medium text-ink-800 dark:text-ink-100">{s.name}</p><p className="text-xs text-ink-400">{TYPE_OPTIONS.find((o) => o.value === s.type)?.label ?? s.type}</p></div>
        </div>
      ),
    },
    { key: 'contact', header: 'Contact', render: (s) => <span className="text-sm text-ink-600 dark:text-ink-300">{s.contact_person || '—'}</span> },
    { key: 'phone', header: 'Téléphone', render: (s) => <span className="text-sm text-ink-600 dark:text-ink-300 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-ink-400" />{s.phone || '—'}</span> },
    { key: 'services', header: 'Services', render: (s) => <span className="text-sm text-ink-500 truncate block max-w-xs">{s.services || '—'}</span> },
    {
      key: 'rating', header: 'Note', sortable: true, sortValue: (s) => s.rating ?? 0,
      render: (s) => s.rating ? (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium">{s.rating.toFixed(1)}</span>
        </div>
      ) : <span className="text-sm text-ink-400">—</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(s)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(s)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Fournisseurs" subtitle={`${suppliers?.length ?? 0} fournisseur(s)`} icon={<Building2 className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Ajouter</Button>} />
      <DataTable columns={columns} rows={suppliers ?? []} rowKey={(s) => s.id} loading={loading}
        searchKeys={(s) => `${s.name} ${s.contact_person || ''} ${s.services || ''} ${s.phone || ''}`}
        emptyMessage="Aucun fournisseur" emptyHint="Ajoutez vos fournisseurs." />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Type"><Select options={TYPE_OPTIONS} value={form.type} onChange={(e) => set('type', e.target.value)} /></FormField>
          <FormField label="Nom" required><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></FormField>
          <FormField label="Contact"><input className="input" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} /></FormField>
          <FormField label="Téléphone"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></FormField>
          <FormField label="Email"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></FormField>
          <FormField label="Note (1-5)"><input type="number" min="1" max="5" step="0.1" className="input" value={form.rating} onChange={(e) => set('rating', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Adresse"><input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} /></FormField></div>
          <div className="sm:col-span-2"><FormField label="Services"><input className="input" value={form.services} onChange={(e) => set('services', e.target.value)} placeholder="Réparation, vidange, diagnostic…" /></FormField></div>
          <div className="sm:col-span-2"><FormField label="Notes"><textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></FormField></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer le fournisseur" message={`Supprimer ${deleteTarget?.name} ?`} confirmLabel="Supprimer" danger />
    </div>
  );
}
