import { useState } from 'react';
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useClients } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatCard } from '../components/StatCard';
import { PAYMENT_METHOD_LABELS } from '../lib/labels';
import { formatCurrency, formatDate } from '../lib/format';
import type { Payment } from '../lib/types';

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));
const ACCOUNT_OPTIONS = [
  { value: 'bank', label: 'Banque' },
  { value: 'cash', label: 'Caisse' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

interface FormState {
  client_id: string; invoice_id: string; amount: string;
  payment_date: string; payment_method: string; account_type: string; notes: string;
}

const EMPTY: FormState = { client_id: '', invoice_id: '', amount: '', payment_date: '', payment_method: 'cash', account_type: 'cash', notes: '' };

export function PaymentsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: payments, loading, refetch } = useQuery<Payment>(
    'payments', '*, client:clients(*), invoice:invoices(*)', { order: ['payment_date', { ascending: false }] },
  );
  const { data: clients } = useClients();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);

  const totalAmount = (payments ?? []).reduce((s, p) => s + p.amount, 0);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (p: Payment) => {
    setEditing(p);
    setForm({
      client_id: p.client_id || '', invoice_id: p.invoice_id || '', amount: p.amount?.toString() || '',
      payment_date: p.payment_date || '', payment_method: p.payment_method, account_type: p.account_type, notes: p.notes || '',
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.amount || !form.payment_date || !form.payment_method) { toast('Montant, date et mode sont obligatoires.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      client_id: form.client_id || null, invoice_id: form.invoice_id || null,
      amount: parseFloat(form.amount), payment_date: form.payment_date,
      payment_method: form.payment_method, account_type: form.account_type,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from('payments').update(payload).eq('id', editing.id)
      : await supabase.from('payments').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Paiement modifié.' : 'Paiement enregistré.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('payments').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Paiement supprimé.', 'success'); refetch(); }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Payment>[] = [
    { key: 'ref', header: 'Référence', sortable: true, sortValue: (p) => p.reference || p.id, render: (p) => <span className="font-medium text-ink-800 dark:text-ink-100">{p.reference || p.id.slice(0, 8)}</span> },
    { key: 'client', header: 'Client', render: (p) => <span className="text-sm text-ink-600 dark:text-ink-300">{p.client?.name || '—'}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (p) => p.payment_date, render: (p) => <span className="text-sm">{formatDate(p.payment_date)}</span> },
    { key: 'method', header: 'Mode', render: (p) => <span className="text-sm">{PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}</span> },
    { key: 'account', header: 'Compte', render: (p) => <span className="text-sm">{ACCOUNT_OPTIONS.find((o) => o.value === p.account_type)?.label ?? p.account_type}</span> },
    { key: 'amount', header: 'Montant', sortable: true, sortValue: (p) => p.amount, render: (p) => <span className="font-semibold text-sm">{formatCurrency(p.amount)}</span> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(p)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(p)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Paiements" subtitle={`${payments?.length ?? 0} paiement(s)`} icon={<Wallet className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouveau paiement</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard label="Total encaissé" value={formatCurrency(totalAmount)} color="emerald" icon={<Wallet className="w-5 h-5" />} />
        <StatCard label="Nombre de paiements" value={(payments ?? []).length} color="blue" icon={<Wallet className="w-5 h-5" />} />
      </div>
      <DataTable columns={columns} rows={payments ?? []} rowKey={(p) => p.id} loading={loading}
        searchKeys={(p) => `${p.reference || ''} ${p.client?.name || ''}`}
        emptyMessage="Aucun paiement" emptyHint="Enregistrez vos paiements." />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le paiement' : 'Nouveau paiement'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Client"><Select options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))} value={form.client_id} onChange={(e) => set('client_id', e.target.value)} /></FormField>
          <FormField label="Montant (FCFA)" required><input type="number" className="input" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></FormField>
          <FormField label="Date" required><input type="date" className="input" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} /></FormField>
          <FormField label="Mode de paiement" required><Select options={PAYMENT_OPTIONS} value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)} /></FormField>
          <FormField label="Type de compte"><Select options={ACCOUNT_OPTIONS} value={form.account_type} onChange={(e) => set('account_type', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Notes"><textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></FormField></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer le paiement" message="Supprimer ce paiement ?" confirmLabel="Supprimer" danger />
    </div>
  );
}
