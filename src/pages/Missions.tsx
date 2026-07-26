import { useState } from 'react';
import { Truck, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useVehicles, useClients, useDrivers, useAgencies } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatusBadge } from '../components/Card';
import { MISSION_STATUS_LABELS, MISSION_STATUS_COLORS, MISSION_TYPE_LABELS } from '../lib/labels';
import { formatCurrency, formatDateTime } from '../lib/format';
import type { Mission } from '../lib/types';

const STATUS_OPTIONS = Object.entries(MISSION_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const TYPE_OPTIONS = Object.entries(MISSION_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const SECURITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'renforce', label: 'Renforcé' },
  { value: 'haut', label: 'Haut niveau' },
];
const CONFIDENTIALITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'confidential', label: 'Confidentiel' },
  { value: 'strict', label: 'Strict' },
];

interface FormState {
  mission_type: string; client_id: string; vehicle_id: string; primary_driver_id: string;
  agency_id: string; departure_point: string; destination: string;
  start_datetime: string; planned_end_datetime: string; passengers: string;
  billed_amount: string; advance_amount: string; security_level: string;
  confidentiality: string; instructions: string; status: string;
}

const EMPTY: FormState = {
  mission_type: 'personnel_transport', client_id: '', vehicle_id: '', primary_driver_id: '',
  agency_id: '', departure_point: '', destination: '', start_datetime: '', planned_end_datetime: '',
  passengers: '', billed_amount: '', advance_amount: '', security_level: 'normal',
  confidentiality: 'public', instructions: '', status: 'planned',
};

export function MissionsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: missions, loading, refetch } = useQuery<Mission>(
    'missions', '*, client:clients(*), vehicle:vehicles(*), primary_driver:drivers(*)', { order: ['start_datetime', { ascending: false }] },
  );
  const { data: vehicles } = useVehicles();
  const { data: clients } = useClients();
  const { data: drivers } = useDrivers();
  const { data: agencies } = useAgencies();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Mission | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Mission | null>(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (m: Mission) => {
    setEditing(m);
    setForm({
      mission_type: m.mission_type, client_id: m.client_id || '', vehicle_id: m.vehicle_id || '',
      primary_driver_id: m.primary_driver_id || '', agency_id: m.agency_id || '',
      departure_point: m.departure_point || '', destination: m.destination || '',
      start_datetime: m.start_datetime?.slice(0, 16) || '', planned_end_datetime: m.planned_end_datetime?.slice(0, 16) || '',
      passengers: m.passengers?.toString() || '', billed_amount: m.billed_amount?.toString() || '',
      advance_amount: m.advance_amount?.toString() || '', security_level: m.security_level,
      confidentiality: m.confidentiality, instructions: m.instructions || '', status: m.status,
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.mission_type || !form.start_datetime) { toast('Le type et la date de départ sont obligatoires.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      mission_type: form.mission_type, client_id: form.client_id || null, vehicle_id: form.vehicle_id || null,
      primary_driver_id: form.primary_driver_id || null, agency_id: form.agency_id || null,
      departure_point: form.departure_point || null, destination: form.destination || null,
      start_datetime: form.start_datetime, planned_end_datetime: form.planned_end_datetime || null,
      passengers: form.passengers ? parseInt(form.passengers) : null,
      billed_amount: parseFloat(form.billed_amount) || 0, advance_amount: parseFloat(form.advance_amount) || 0,
      security_level: form.security_level, confidentiality: form.confidentiality,
      instructions: form.instructions || null, status: form.status,
    };
    const { error } = editing
      ? await supabase.from('missions').update(payload).eq('id', editing.id)
      : await supabase.from('missions').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Mission modifiée.' : 'Mission créée.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('missions').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Mission supprimée.', 'success'); refetch(); }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Mission>[] = [
    { key: 'ref', header: 'Référence', sortable: true, sortValue: (m) => m.reference || m.id, render: (m) => <span className="font-medium text-ink-800 dark:text-ink-100">{m.reference || m.id.slice(0, 8)}</span> },
    { key: 'type', header: 'Type', sortable: true, sortValue: (m) => m.mission_type, render: (m) => <span className="text-sm">{MISSION_TYPE_LABELS[m.mission_type] ?? m.mission_type}</span> },
    { key: 'client', header: 'Client', render: (m) => <span className="text-sm text-ink-600 dark:text-ink-300">{m.client?.name || '—'}</span> },
    { key: 'destination', header: 'Destination', render: (m) => <span className="text-sm text-ink-600 dark:text-ink-300">{m.destination || '—'}</span> },
    { key: 'start', header: 'Départ', sortable: true, sortValue: (m) => m.start_datetime, render: (m) => <span className="text-sm">{formatDateTime(m.start_datetime)}</span> },
    { key: 'amount', header: 'Montant facturé', sortable: true, sortValue: (m) => m.billed_amount, render: (m) => <span className="font-semibold text-sm">{formatCurrency(m.billed_amount)}</span> },
    { key: 'status', header: 'Statut', sortable: true, sortValue: (m) => m.status, render: (m) => <StatusBadge label={MISSION_STATUS_LABELS[m.status] ?? m.status} colorClass={MISSION_STATUS_COLORS[m.status] ?? ''} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(m)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(m)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Missions & escortes" subtitle={`${missions?.length ?? 0} mission(s)`} icon={<Truck className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvelle mission</Button>} />
      <DataTable columns={columns} rows={missions ?? []} rowKey={(m) => m.id} loading={loading}
        searchKeys={(m) => `${m.reference || ''} ${m.destination || ''} ${MISSION_TYPE_LABELS[m.mission_type] || ''} ${m.client?.name || ''}`}
        emptyMessage="Aucune mission" emptyHint="Créez votre première mission." />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la mission' : 'Nouvelle mission'} size="xl"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Type de mission" required><Select options={TYPE_OPTIONS} value={form.mission_type} onChange={(e) => set('mission_type', e.target.value)} /></FormField>
          <FormField label="Statut"><Select options={STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} /></FormField>
          <FormField label="Client"><Select options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))} value={form.client_id} onChange={(e) => set('client_id', e.target.value)} /></FormField>
          <FormField label="Véhicule"><Select options={(vehicles ?? []).map((v) => ({ value: v.id, label: `${v.brand} ${v.model}` }))} value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} /></FormField>
          <FormField label="Chauffeur principal"><Select options={(drivers ?? []).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }))} value={form.primary_driver_id} onChange={(e) => set('primary_driver_id', e.target.value)} /></FormField>
          <FormField label="Agence"><Select options={(agencies ?? []).map((a) => ({ value: a.id, label: a.name }))} value={form.agency_id} onChange={(e) => set('agency_id', e.target.value)} /></FormField>
          <FormField label="Point de départ"><input className="input" value={form.departure_point} onChange={(e) => set('departure_point', e.target.value)} /></FormField>
          <FormField label="Destination"><input className="input" value={form.destination} onChange={(e) => set('destination', e.target.value)} /></FormField>
          <FormField label="Date de départ" required><input type="datetime-local" className="input" value={form.start_datetime} onChange={(e) => set('start_datetime', e.target.value)} /></FormField>
          <FormField label="Fin prévue"><input type="datetime-local" className="input" value={form.planned_end_datetime} onChange={(e) => set('planned_end_datetime', e.target.value)} /></FormField>
          <FormField label="Passagers"><input type="number" className="input" value={form.passengers} onChange={(e) => set('passengers', e.target.value)} /></FormField>
          <FormField label="Montant facturé (FCFA)"><input type="number" className="input" value={form.billed_amount} onChange={(e) => set('billed_amount', e.target.value)} /></FormField>
          <FormField label="Avance (FCFA)"><input type="number" className="input" value={form.advance_amount} onChange={(e) => set('advance_amount', e.target.value)} /></FormField>
          <FormField label="Niveau de sécurité"><Select options={SECURITY_OPTIONS} value={form.security_level} onChange={(e) => set('security_level', e.target.value)} /></FormField>
          <FormField label="Confidentialité"><Select options={CONFIDENTIALITY_OPTIONS} value={form.confidentiality} onChange={(e) => set('confidentiality', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Instructions"><textarea className="input min-h-[80px]" value={form.instructions} onChange={(e) => set('instructions', e.target.value)} /></FormField></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer la mission" message={`Supprimer la mission ${deleteTarget?.reference || deleteTarget?.id.slice(0, 8)} ?`} confirmLabel="Supprimer" danger />
    </div>
  );
}
