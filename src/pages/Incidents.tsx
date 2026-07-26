import { useState } from 'react';
import { AlertTriangle, Plus, Trash2, Car, Receipt } from 'lucide-react';
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
import { StatCard } from '../components/StatCard';
import { Card, CardHeader, StatusBadge } from '../components/Card';
import { formatCurrency, formatDate } from '../lib/format';
import { cn } from '../lib/cn';
import type { Incident, Accident, Fine } from '../lib/types';

const INCIDENT_TYPE_OPTIONS = [
  { value: 'breakdown', label: 'Panne' },
  { value: 'traffic', label: 'Infraction routière' },
  { value: 'theft', label: 'Vol' },
  { value: 'damage', label: 'Dégât' },
  { value: 'other', label: 'Autre' },
];
const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Mineur' },
  { value: 'moderate', label: 'Modéré' },
  { value: 'major', label: 'Majeur' },
  { value: 'critical', label: 'Critique' },
];
const INCIDENT_STATUS_OPTIONS = [
  { value: 'open', label: 'Ouvert' },
  { value: 'investigating', label: 'En cours' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'closed', label: 'Clôturé' },
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  investigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
};

export function IncidentsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: incidents, loading, refetch } = useQuery<Incident>(
    'incidents', '*, vehicle:vehicles(*), driver:drivers(*)', { order: ['incident_date', { ascending: false }] },
  );
  const { data: accidents } = useQuery<Accident>('accidents', '*, vehicle:vehicles(*), driver:drivers(*)', { order: ['accident_date', { ascending: false }] });
  const { data: fines } = useQuery<Fine>('fines', '*, vehicle:vehicles(*), driver:drivers(*)', { order: ['fine_date', { ascending: false }] });
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_id: '', driver_id: '', incident_type: 'breakdown', incident_date: '', description: '', status: 'open' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);

  const totalFines = (fines ?? []).reduce((s, f) => s + f.amount, 0);
  const openIncidents = (incidents ?? []).filter((i) => i.status === 'open' || i.status === 'investigating').length;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.incident_type || !form.incident_date) { toast('Type et date sont obligatoires.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      vehicle_id: form.vehicle_id || null, driver_id: form.driver_id || null,
      incident_type: form.incident_type, incident_date: form.incident_date,
      description: form.description || null, status: form.status,
    };
    const { error } = await supabase.from('incidents').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast('Incident enregistré.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('incidents').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Incident supprimé.', 'success'); refetch(); }
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const incidentColumns: Column<Incident>[] = [
    { key: 'type', header: 'Type', sortable: true, sortValue: (i) => i.incident_type, render: (i) => <span className="text-sm font-medium">{INCIDENT_TYPE_OPTIONS.find((o) => o.value === i.incident_type)?.label ?? i.incident_type}</span> },
    { key: 'vehicle', header: 'Véhicule', render: (i) => <span className="text-sm text-ink-600 dark:text-ink-300">{i.vehicle ? `${i.vehicle.brand} ${i.vehicle.model}` : '—'}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (i) => i.incident_date, render: (i) => <span className="text-sm">{formatDate(i.incident_date)}</span> },
    { key: 'desc', header: 'Description', render: (i) => <span className="text-sm text-ink-500 truncate block max-w-xs">{i.description || '—'}</span> },
    { key: 'status', header: 'Statut', sortable: true, sortValue: (i) => i.status, render: (i) => <StatusBadge label={INCIDENT_STATUS_OPTIONS.find((o) => o.value === i.status)?.label ?? i.status} colorClass={STATUS_COLORS[i.status] ?? ''} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setDeleteTarget(i)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Accidents & incidents" subtitle="Suivi des incidents, accidents et amendes" icon={<AlertTriangle className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Signaler un incident</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Incidents ouverts" value={openIncidents} color="red" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Accidents" value={(accidents ?? []).length} color="amber" icon={<Car className="w-5 h-5" />} />
        <StatCard label="Amendes" value={(fines ?? []).length} color="stone" icon={<Receipt className="w-5 h-5" />} />
        <StatCard label="Total amendes" value={formatCurrency(totalFines)} color="amber" icon={<Receipt className="w-5 h-5" />} />
      </div>

      {/* Accidents section */}
      {(accidents ?? []).length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Accidents" subtitle={`${(accidents ?? []).length} accident(s)`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(accidents ?? []).map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-ink-100 dark:border-ink-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model}` : '—'}</span>
                  </div>
                  <span className={cn('badge', a.severity === 'critical' || a.severity === 'major' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300')}>{SEVERITY_OPTIONS.find((s) => s.value === a.severity)?.label ?? a.severity}</span>
                </div>
                <p className="text-xs text-ink-500 mt-1.5">{formatDate(a.accident_date)} · {a.location || '—'}</p>
                {a.description && <p className="text-xs text-ink-400 mt-1 line-clamp-2">{a.description}</p>}
                {a.estimated_amount && <p className="text-xs font-semibold mt-1">Coût estimé: {formatCurrency(a.estimated_amount)}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Fines section */}
      {(fines ?? []).length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Amendes" subtitle={`${(fines ?? []).length} amende(s)`} />
          <div className="table-wrap">
            <table className="table-base">
              <thead><tr><th>Date</th><th>Véhicule</th><th>Raison</th><th>Lieu</th><th>Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {(fines ?? []).map((f) => (
                  <tr key={f.id}>
                    <td className="text-sm">{formatDate(f.fine_date)}</td>
                    <td className="text-sm">{f.vehicle ? `${f.vehicle.brand} ${f.vehicle.model}` : '—'}</td>
                    <td className="text-sm text-ink-500">{f.reason || '—'}</td>
                    <td className="text-sm text-ink-500">{f.location || '—'}</td>
                    <td className="text-sm font-semibold">{formatCurrency(f.amount)}</td>
                    <td><span className={cn('badge', f.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300')}>{f.status === 'paid' ? 'Payée' : 'En attente'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Incidents table */}
      <h2 className="font-display font-semibold text-base text-ink-800 dark:text-ink-100 mb-3">Incidents</h2>
      <DataTable columns={incidentColumns} rows={incidents ?? []} rowKey={(i) => i.id} loading={loading}
        searchKeys={(i) => `${i.incident_type} ${i.vehicle?.brand || ''} ${i.description || ''}`}
        emptyMessage="Aucun incident" emptyHint="Signalez vos incidents ici." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Signaler un incident" size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Véhicule"><Select options={(vehicles ?? []).map((v) => ({ value: v.id, label: `${v.brand} ${v.model}` }))} value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} /></FormField>
          <FormField label="Chauffeur"><Select options={(drivers ?? []).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }))} value={form.driver_id} onChange={(e) => set('driver_id', e.target.value)} /></FormField>
          <FormField label="Type" required><Select options={INCIDENT_TYPE_OPTIONS} value={form.incident_type} onChange={(e) => set('incident_type', e.target.value)} /></FormField>
          <FormField label="Date" required><input type="date" className="input" value={form.incident_date} onChange={(e) => set('incident_date', e.target.value)} /></FormField>
          <FormField label="Statut"><Select options={INCIDENT_STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} /></FormField></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer l'incident" message="Supprimer cet incident ?" confirmLabel="Supprimer" danger />
    </div>
  );
}
