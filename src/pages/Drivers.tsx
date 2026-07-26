import { useState } from 'react';
import { UserCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useAgencies } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatusBadge } from '../components/Card';
import { DRIVER_STATUS_LABELS, DRIVER_STATUS_COLORS } from '../lib/labels';
import { formatDate, initials } from '../lib/format';
import type { Driver } from '../lib/types';

const STATUS_OPTIONS = Object.entries(DRIVER_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const CONTRACT_OPTIONS = [
  { value: 'cdi', label: 'CDI' },
  { value: 'cdd', label: 'CDD' },
  { value: 'apprentissage', label: 'Apprentissage' },
  { value: 'stage', label: 'Stage' },
  { value: 'freelance', label: 'Freelance' },
];

interface FormState {
  matricule: string; first_name: string; last_name: string; phone: string; email: string;
  agency_id: string; status: string; contract_type: string; license_number: string;
  license_category: string; license_expiry_date: string; hire_date: string; salary: string;
}

const EMPTY: FormState = {
  matricule: '', first_name: '', last_name: '', phone: '', email: '', agency_id: '',
  status: 'available', contract_type: '', license_number: '', license_category: '',
  license_expiry_date: '', hire_date: '', salary: '',
};

export function DriversPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: drivers, loading, refetch } = useQuery<Driver>(
    'drivers', '*, agency:agencies(*)', { order: ['first_name', { ascending: true }] },
  );
  const { data: agencies } = useAgencies();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({
      matricule: d.matricule || '', first_name: d.first_name, last_name: d.last_name,
      phone: d.phone || '', email: d.email || '', agency_id: d.agency_id || '',
      status: d.status, contract_type: d.contract_type || '', license_number: d.license_number || '',
      license_category: d.license_category || '', license_expiry_date: d.license_expiry_date || '',
      hire_date: d.hire_date || '', salary: d.salary?.toString() || '',
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.first_name || !form.last_name) { toast('Le prénom et le nom sont obligatoires.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      matricule: form.matricule || null, first_name: form.first_name, last_name: form.last_name,
      phone: form.phone || null, email: form.email || null, agency_id: form.agency_id || null,
      status: form.status, contract_type: form.contract_type || null,
      license_number: form.license_number || null, license_category: form.license_category || null,
      license_expiry_date: form.license_expiry_date || null, hire_date: form.hire_date || null,
      salary: form.salary ? parseFloat(form.salary) : null,
    };
    const { error } = editing
      ? await supabase.from('drivers').update(payload).eq('id', editing.id)
      : await supabase.from('drivers').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Chauffeur modifié.' : 'Chauffeur ajouté.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('drivers').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Chauffeur supprimé.', 'success'); refetch(); }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Driver>[] = [
    {
      key: 'name', header: 'Chauffeur', sortable: true, sortValue: (d) => d.first_name + ' ' + d.last_name,
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {initials(`${d.first_name} ${d.last_name}`)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink-800 dark:text-ink-100 truncate">{d.first_name} {d.last_name}</p>
            <p className="text-xs text-ink-400">{d.matricule || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Téléphone', render: (d) => <span className="text-sm text-ink-600 dark:text-ink-300">{d.phone || '—'}</span> },
    { key: 'agency', header: 'Agence', render: (d) => <span className="text-sm text-ink-600 dark:text-ink-300">{d.agency?.name || '—'}</span> },
    { key: 'hire_date', header: 'Embauche', sortable: true, sortValue: (d) => d.hire_date ?? '', render: (d) => <span className="text-sm">{formatDate(d.hire_date)}</span> },
    { key: 'license_expiry', header: 'Permis expire', render: (d) => <span className="text-sm">{formatDate(d.license_expiry_date)}</span> },
    {
      key: 'status', header: 'Statut', sortable: true, sortValue: (d) => d.status,
      render: (d) => <StatusBadge label={DRIVER_STATUS_LABELS[d.status] ?? d.status} colorClass={DRIVER_STATUS_COLORS[d.status] ?? ''} />,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(d)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(d)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Chauffeurs"
        subtitle={`${drivers?.length ?? 0} chauffeur(s) au total`}
        icon={<UserCircle className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Ajouter</Button>}
      />
      <DataTable
        columns={columns} rows={drivers ?? []} rowKey={(d) => d.id} loading={loading}
        searchKeys={(d) => `${d.first_name} ${d.last_name} ${d.matricule || ''} ${d.phone || ''} ${d.email || ''}`}
        emptyMessage="Aucun chauffeur" emptyHint="Ajoutez votre premier chauffeur."
      />
      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le chauffeur' : 'Ajouter un chauffeur'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}
      >
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Matricule"><input className="input" value={form.matricule} onChange={(e) => set('matricule', e.target.value)} placeholder="CH-001" /></FormField>
          <FormField label="Agence"><Select options={(agencies ?? []).map((a) => ({ value: a.id, label: a.name }))} value={form.agency_id} onChange={(e) => set('agency_id', e.target.value)} /></FormField>
          <FormField label="Prénom" required><input className="input" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} /></FormField>
          <FormField label="Nom" required><input className="input" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} /></FormField>
          <FormField label="Téléphone"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+225 07 00 00 00" /></FormField>
          <FormField label="Email"><input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></FormField>
          <FormField label="Statut"><Select options={STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} /></FormField>
          <FormField label="Type de contrat"><Select options={CONTRACT_OPTIONS} value={form.contract_type} onChange={(e) => set('contract_type', e.target.value)} /></FormField>
          <FormField label="N° permis"><input className="input" value={form.license_number} onChange={(e) => set('license_number', e.target.value)} /></FormField>
          <FormField label="Catégorie permis"><input className="input" value={form.license_category} onChange={(e) => set('license_category', e.target.value)} placeholder="B, C, EC…" /></FormField>
          <FormField label="Expiration permis"><input type="date" className="input" value={form.license_expiry_date} onChange={(e) => set('license_expiry_date', e.target.value)} /></FormField>
          <FormField label="Date d'embauche"><input type="date" className="input" value={form.hire_date} onChange={(e) => set('hire_date', e.target.value)} /></FormField>
          <FormField label="Salaire (FCFA)"><input type="number" className="input" value={form.salary} onChange={(e) => set('salary', e.target.value)} /></FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer le chauffeur" message={`Supprimer ${deleteTarget?.first_name} ${deleteTarget?.last_name} ?`} confirmLabel="Supprimer" danger />
    </div>
  );
}
