import { useState } from 'react';
import { Wallet, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useVehicles, useAgencies, useSuppliers } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/Card';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '../lib/labels';
import { formatCurrency, formatDate } from '../lib/format';
import type { Expense } from '../lib/types';

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvée' },
  { value: 'paid', label: 'Payée' },
  { value: 'rejected', label: 'Rejetée' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

interface FormState {
  vehicle_id: string; agency_id: string; supplier_id: string;
  category: string; description: string; amount: string;
  expense_date: string; payment_method: string; status: string;
}

const EMPTY: FormState = { vehicle_id: '', agency_id: '', supplier_id: '', category: 'carburant', description: '', amount: '', expense_date: '', payment_method: 'cash', status: 'pending' };

export function ExpensesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: expenses, loading, refetch } = useQuery<Expense>(
    'expenses', '*, vehicle:vehicles(*)', { order: ['expense_date', { ascending: false }] },
  );
  const { data: vehicles } = useVehicles();
  const { data: agencies } = useAgencies();
  const { data: suppliers } = useSuppliers();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const totalAmount = (expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const byCategory = (expenses ?? []).reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; }, {} as Record<string, number>);
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      vehicle_id: e.vehicle_id || '', agency_id: e.agency_id || '', supplier_id: e.supplier_id || '',
      category: e.category, description: e.description || '', amount: e.amount?.toString() || '',
      expense_date: e.expense_date || '', payment_method: e.payment_method || 'cash', status: e.status,
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.category || !form.amount || !form.expense_date) { toast('Catégorie, montant et date sont obligatoires.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      vehicle_id: form.vehicle_id || null, agency_id: form.agency_id || null,
      supplier_id: form.supplier_id || null, category: form.category,
      description: form.description || null, amount: parseFloat(form.amount),
      expense_date: form.expense_date, payment_method: form.payment_method || null, status: form.status,
    };
    const { error } = editing
      ? await supabase.from('expenses').update(payload).eq('id', editing.id)
      : await supabase.from('expenses').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Dépense modifiée.' : 'Dépense enregistrée.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('expenses').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Dépense supprimée.', 'success'); refetch(); }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Expense>[] = [
    { key: 'ref', header: 'Référence', sortable: true, sortValue: (e) => e.reference || e.id, render: (e) => <span className="font-medium text-ink-800 dark:text-ink-100">{e.reference || e.id.slice(0, 8)}</span> },
    { key: 'category', header: 'Catégorie', sortable: true, sortValue: (e) => e.category, render: (e) => <span className="text-sm">{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</span> },
    { key: 'vehicle', header: 'Véhicule', render: (e) => <span className="text-sm text-ink-600 dark:text-ink-300">{e.vehicle ? `${e.vehicle.brand} ${e.vehicle.model}` : '—'}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (e) => e.expense_date, render: (e) => <span className="text-sm">{formatDate(e.expense_date)}</span> },
    { key: 'amount', header: 'Montant', sortable: true, sortValue: (e) => e.amount, render: (e) => <span className="font-semibold text-sm">{formatCurrency(e.amount)}</span> },
    { key: 'status', header: 'Statut', sortable: true, sortValue: (e) => e.status, render: (e) => <StatusBadge label={STATUS_OPTIONS.find((o) => o.value === e.status)?.label ?? e.status} colorClass={STATUS_COLORS[e.status] ?? ''} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(e)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(e)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Dépenses" subtitle={`${expenses?.length ?? 0} dépense(s)`} icon={<Wallet className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvelle dépense</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total dépenses" value={formatCurrency(totalAmount)} color="amber" icon={<Wallet className="w-5 h-5" />} />
        <StatCard label="Top catégorie" value={topCategory ? EXPENSE_CATEGORY_LABELS[topCategory[0]] ?? topCategory[0] : '—'} hint={topCategory ? formatCurrency(topCategory[1]) : ''} color="blue" icon={<Wallet className="w-5 h-5" />} />
        <StatCard label="En attente" value={(expenses ?? []).filter((e) => e.status === 'pending').length} color="red" icon={<Wallet className="w-5 h-5" />} />
      </div>
      <DataTable columns={columns} rows={expenses ?? []} rowKey={(e) => e.id} loading={loading}
        searchKeys={(e) => `${e.reference || ''} ${EXPENSE_CATEGORY_LABELS[e.category] || ''} ${e.description || ''}`}
        emptyMessage="Aucune dépense" emptyHint="Enregistrez vos dépenses." />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Catégorie" required><Select options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => set('category', e.target.value)} /></FormField>
          <FormField label="Montant (FCFA)" required><input type="number" className="input" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></FormField>
          <FormField label="Date" required><input type="date" className="input" value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} /></FormField>
          <FormField label="Véhicule"><Select options={(vehicles ?? []).map((v) => ({ value: v.id, label: `${v.brand} ${v.model}` }))} value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} /></FormField>
          <FormField label="Agence"><Select options={(agencies ?? []).map((a) => ({ value: a.id, label: a.name }))} value={form.agency_id} onChange={(e) => set('agency_id', e.target.value)} /></FormField>
          <FormField label="Fournisseur"><Select options={(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))} value={form.supplier_id} onChange={(e) => set('supplier_id', e.target.value)} /></FormField>
          <FormField label="Mode de paiement"><Select options={PAYMENT_OPTIONS} value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)} /></FormField>
          <FormField label="Statut"><Select options={STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Description"><textarea className="input min-h-[60px]" value={form.description} onChange={(e) => set('description', e.target.value)} /></FormField></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer la dépense" message="Supprimer cette dépense ?" confirmLabel="Supprimer" danger />
    </div>
  );
}
