import { useState } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useVehicles, useDrivers } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { formatDateTime, formatNumber } from '../lib/format';
import { cn } from '../lib/cn';
import type { VehicleMovement } from '../lib/types';

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'departure', label: 'Sortie' },
  { value: 'return', label: 'Retour' },
  { value: 'transfer', label: 'Transfert' },
];

interface FormState {
  vehicle_id: string; driver_id: string; movement_type: string;
  datetime: string; mileage: string; fuel_level: string;
  vehicle_condition: string; damages: string; notes: string;
}

const EMPTY: FormState = {
  vehicle_id: '', driver_id: '', movement_type: 'departure', datetime: '',
  mileage: '', fuel_level: '', vehicle_condition: '', damages: '', notes: '',
};

export function MovementsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: movements, loading, refetch } = useQuery<VehicleMovement>(
    'vehicle_movements', '*, vehicle:vehicles(*), driver:drivers(*)', { order: ['datetime', { ascending: false }] },
  );
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleMovement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VehicleMovement | null>(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (m: VehicleMovement) => {
    setEditing(m);
    setForm({
      vehicle_id: m.vehicle_id, driver_id: m.driver_id || '', movement_type: m.movement_type,
      datetime: m.datetime?.slice(0, 16) || '', mileage: m.mileage?.toString() || '',
      fuel_level: m.fuel_level || '', vehicle_condition: m.vehicle_condition || '',
      damages: m.damages || '', notes: m.notes || '',
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.vehicle_id || !form.movement_type || !form.datetime) { toast('Véhicule, type et date sont obligatoires.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      vehicle_id: form.vehicle_id, driver_id: form.driver_id || null,
      movement_type: form.movement_type, datetime: form.datetime,
      mileage: form.mileage ? parseInt(form.mileage) : null,
      fuel_level: form.fuel_level || null, vehicle_condition: form.vehicle_condition || null,
      damages: form.damages || null, notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from('vehicle_movements').update(payload).eq('id', editing.id)
      : await supabase.from('vehicle_movements').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Mouvement modifié.' : 'Mouvement enregistré.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('vehicle_movements').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Mouvement supprimé.', 'success'); refetch(); }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<VehicleMovement>[] = [
    {
      key: 'type', header: 'Type', sortable: true, sortValue: (m) => m.movement_type,
      render: (m) => (
        <div className="flex items-center gap-2">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', m.movement_type === 'departure' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : m.movement_type === 'return' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300')}>
            {m.movement_type === 'departure' ? <ArrowRight className="w-4 h-4" /> : m.movement_type === 'return' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </div>
          <span className="text-sm font-medium">{m.movement_type === 'departure' ? 'Sortie' : m.movement_type === 'return' ? 'Retour' : 'Transfert'}</span>
        </div>
      ),
    },
    { key: 'vehicle', header: 'Véhicule', render: (m) => <span className="text-sm text-ink-600 dark:text-ink-300">{m.vehicle ? `${m.vehicle.brand} ${m.vehicle.model}` : '—'}</span> },
    { key: 'driver', header: 'Chauffeur', render: (m) => <span className="text-sm text-ink-600 dark:text-ink-300">{m.driver ? `${m.driver.first_name} ${m.driver.last_name}` : '—'}</span> },
    { key: 'datetime', header: 'Date/heure', sortable: true, sortValue: (m) => m.datetime, render: (m) => <span className="text-sm">{formatDateTime(m.datetime)}</span> },
    { key: 'mileage', header: 'Kilométrage', render: (m) => <span className="text-sm">{formatNumber(m.mileage)} km</span> },
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
      <PageHeader title="Sorties & retours" subtitle={`${movements?.length ?? 0} mouvement(s)`} icon={<ClipboardList className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouveau mouvement</Button>} />
      <DataTable columns={columns} rows={movements ?? []} rowKey={(m) => m.id} loading={loading}
        searchKeys={(m) => `${m.vehicle?.brand || ''} ${m.vehicle?.model || ''} ${m.driver?.first_name || ''} ${m.driver?.last_name || ''}`}
        emptyMessage="Aucun mouvement" emptyHint="Enregistrez les sorties et retours de véhicules." />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le mouvement' : 'Nouveau mouvement'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Véhicule" required><Select options={(vehicles ?? []).map((v) => ({ value: v.id, label: `${v.brand} ${v.model} (${v.registration || '—'})` }))} value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} /></FormField>
          <FormField label="Chauffeur"><Select options={(drivers ?? []).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }))} value={form.driver_id} onChange={(e) => set('driver_id', e.target.value)} /></FormField>
          <FormField label="Type" required><Select options={MOVEMENT_TYPE_OPTIONS} value={form.movement_type} onChange={(e) => set('movement_type', e.target.value)} /></FormField>
          <FormField label="Date et heure" required><input type="datetime-local" className="input" value={form.datetime} onChange={(e) => set('datetime', e.target.value)} /></FormField>
          <FormField label="Kilométrage"><input type="number" className="input" value={form.mileage} onChange={(e) => set('mileage', e.target.value)} /></FormField>
          <FormField label="Niveau carburant"><Select options={[{ value: 'full', label: 'Plein' }, { value: '3_4', label: '3/4' }, { value: '1_2', label: '1/2' }, { value: '1_4', label: '1/4' }, { value: 'empty', label: 'Vide' }]} value={form.fuel_level} onChange={(e) => set('fuel_level', e.target.value)} /></FormField>
          <FormField label="État du véhicule"><input className="input" value={form.vehicle_condition} onChange={(e) => set('vehicle_condition', e.target.value)} placeholder="Bon, correct, mauvais…" /></FormField>
          <FormField label="Dommages"><input className="input" value={form.damages} onChange={(e) => set('damages', e.target.value)} placeholder="Aucun, rayure, etc." /></FormField>
          <div className="sm:col-span-2"><FormField label="Notes"><textarea className="input min-h-[70px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></FormField></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer le mouvement" message="Supprimer ce mouvement ?" confirmLabel="Supprimer" danger />
    </div>
  );
}
