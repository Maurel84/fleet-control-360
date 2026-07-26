import { useState } from 'react';
import { Users, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatusBadge } from '../components/Card';
import { CLIENT_TYPE_LABELS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS } from '../lib/labels';
import { formatCurrency } from '../lib/format';
import { cn } from '../lib/cn';
import type { Client } from '../lib/types';

const TYPE_OPTIONS = Object.entries(CLIENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const RISK_OPTIONS = Object.entries(RISK_LEVEL_LABELS).map(([value, label]) => ({ value, label }));

interface FormState {
  type: string; name: string; contact_person: string; phone: string; email: string;
  address: string; tax_id: string; credit_limit: string; payment_delay_days: string;
  risk_level: string; account_status: string; notes: string;
}

const EMPTY: FormState = {
  type: 'individual', name: '', contact_person: '', phone: '', email: '', address: '',
  tax_id: '', credit_limit: '', payment_delay_days: '30', risk_level: 'low',
  account_status: 'active', notes: '',
};

export function ClientsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: clients, loading, refetch } = useQuery<Client>(
    'clients', '*', { order: ['name', { ascending: true }] },
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      type: c.type, name: c.name, contact_person: c.contact_person || '', phone: c.phone || '',
      email: c.email || '', address: c.address || '', tax_id: c.tax_id || '',
      credit_limit: c.credit_limit?.toString() || '', payment_delay_days: c.payment_delay_days?.toString() || '30',
      risk_level: c.risk_level, account_status: c.account_status, notes: c.notes || '',
    });
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
      tax_id: form.tax_id || null, credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null,
      payment_delay_days: form.payment_delay_days ? parseInt(form.payment_delay_days) : null,
      risk_level: form.risk_level, account_status: form.account_status, notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from('clients').update(payload).eq('id', editing.id)
      : await supabase.from('clients').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Client modifié.' : 'Client ajouté.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Client supprimé.', 'success'); refetch(); }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Client>[] = [
    {
      key: 'name', header: 'Client', sortable: true, sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-500 flex items-center justify-center flex-shrink-0">
            {c.type === 'company' || c.type === 'administration' ? <Building2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink-800 dark:text-ink-100 truncate">{c.name}</p>
            <p className="text-xs text-ink-400">{CLIENT_TYPE_LABELS[c.type] ?? c.type}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Téléphone', render: (c) => <span className="text-sm text-ink-600 dark:text-ink-300">{c.phone || '—'}</span> },
    { key: 'credit', header: 'Crédit max', render: (c) => <span className="text-sm">{formatCurrency(c.credit_limit)}</span> },
    {
      key: 'risk', header: 'Risque', sortable: true, sortValue: (c) => c.risk_level,
      render: (c) => <StatusBadge label={RISK_LEVEL_LABELS[c.risk_level] ?? c.risk_level} colorClass={RISK_LEVEL_COLORS[c.risk_level] ?? ''} />,
    },
    {
      key: 'status', header: 'Compte',
      render: (c) => <span className={cn('badge', c.account_status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400')}>{c.account_status === 'active' ? 'Actif' : 'Inactif'}</span>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(c)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(c)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Clients" subtitle={`${clients?.length ?? 0} client(s) au total`}
        icon={<Users className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Ajouter</Button>}
      />
      <DataTable
        columns={columns} rows={clients ?? []} rowKey={(c) => c.id} loading={loading}
        searchKeys={(c) => `${c.name} ${c.contact_person || ''} ${c.phone || ''} ${c.email || ''} ${c.tax_id || ''}`}
        emptyMessage="Aucun client" emptyHint="Ajoutez votre premier client."
      />
      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le client' : 'Ajouter un client'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}
      >
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Type" required><Select options={TYPE_OPTIONS} value={form.type} onChange={(e) => set('type', e.target.value)} /></FormField>
          <FormField label="Nom" required><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></FormField>
          <FormField label="Contact"><input className="input" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} /></FormField>
          <FormField label="Téléphone"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></FormField>
          <FormField label="Email"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></FormField>
          <FormField label="N° fiscal"><input className="input" value={form.tax_id} onChange={(e) => set('tax_id', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Adresse"><input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} /></FormField></div>
          <FormField label="Crédit max (FCFA)"><input type="number" className="input" value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} /></FormField>
          <FormField label="Délai paiement (jours)"><input type="number" className="input" value={form.payment_delay_days} onChange={(e) => set('payment_delay_days', e.target.value)} /></FormField>
          <FormField label="Niveau de risque"><Select options={RISK_OPTIONS} value={form.risk_level} onChange={(e) => set('risk_level', e.target.value)} /></FormField>
          <FormField label="Statut compte"><Select options={[{ value: 'active', label: 'Actif' }, { value: 'inactive', label: 'Inactif' }]} value={form.account_status} onChange={(e) => set('account_status', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Notes"><textarea className="input min-h-[70px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></FormField></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer le client" message={`Supprimer ${deleteTarget?.name} ?`} confirmLabel="Supprimer" danger />
    </div>
  );
}
