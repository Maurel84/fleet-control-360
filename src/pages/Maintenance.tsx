import { useState, useMemo } from 'react';
import { Wrench, Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useVehicles } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatusBadge } from '../components/Card';
import { Card, CardHeader } from '../components/Card';
import { formatCurrency, formatDate, formatNumber } from '../lib/format';
import { cn } from '../lib/cn';
import type { MaintenanceRequest } from '../lib/types';

const ISSUE_OPTIONS = [
  { value: 'preventive', label: 'Entretien préventif' },
  { value: 'corrective', label: 'Réparation corrective' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'tire_change', label: 'Changement de pneus' },
  { value: 'oil_change', label: 'Vidange' },
  { value: 'other', label: 'Autre' },
];
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];
const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'rejected', label: 'Rejetée' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

interface FormState {
  vehicle_id: string; issue_type: string; priority: string;
  description: string; estimated_cost: string; status: string;
}

const EMPTY: FormState = { vehicle_id: '', issue_type: 'preventive', priority: 'medium', description: '', estimated_cost: '', status: 'pending' };

export function MaintenancePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: requests, loading, refetch } = useQuery<MaintenanceRequest>(
    'maintenance_requests', '*, vehicle:vehicles(*)', { order: ['created_at', { ascending: false }] },
  );
  const { data: vehicles } = useVehicles();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (r: MaintenanceRequest) => {
    setEditing(r);
    setForm({
      vehicle_id: r.vehicle_id, issue_type: r.issue_type, priority: r.priority,
      description: r.description || '', estimated_cost: r.estimated_cost?.toString() || '', status: r.status,
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.vehicle_id) { toast('Le véhicule est obligatoire.', 'error'); return; }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      vehicle_id: form.vehicle_id, issue_type: form.issue_type, priority: form.priority,
      description: form.description || null, estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      status: form.status,
    };
    const { error } = editing
      ? await supabase.from('maintenance_requests').update(payload).eq('id', editing.id)
      : await supabase.from('maintenance_requests').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Demande modifiée.' : 'Demande créée.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('maintenance_requests').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Demande supprimée.', 'success'); refetch(); }
  };

  // Lancer un ordre de réparation pré-rempli pour une alerte de maintenance préventive
  const triggerQuickMaintenance = (vehicleId: string, type: 'oil_change' | 'tire_change' | 'inspection') => {
    setEditing(null);
    setForm({
      vehicle_id: vehicleId,
      issue_type: type,
      priority: 'high',
      description: `Entretien préventif périodique recommandé par odomètre automatique.`,
      estimated_cost: type === 'oil_change' ? '40000' : type === 'tire_change' ? '180000' : '25000',
      status: 'pending',
    });
    setModalOpen(true);
  };

  // Calculer l'usure préventive par véhicule
  const preventiveAlerts = useMemo(() => {
    if (!vehicles || vehicles.length === 0) return [];
    
    const list: Array<{
      vehicle: typeof vehicles[0];
      type: 'oil_change' | 'tire_change' | 'inspection';
      title: string;
      remainingKm: number;
      percent: number;
      status: 'safe' | 'warning' | 'critical';
    }> = [];

    vehicles.forEach((v) => {
      const mileage = v.current_mileage || 0;

      // 1. Vidange Moteur (tous les 10 000 km)
      const oilSince = mileage % 10000;
      const oilRemaining = 10000 - oilSince;
      const oilPct = Math.round((oilSince / 10000) * 100);
      const oilStatus = oilRemaining < 1000 ? 'critical' : oilRemaining < 2500 ? 'warning' : 'safe';

      if (oilStatus !== 'safe') {
        list.push({
          vehicle: v,
          type: 'oil_change',
          title: 'Vidange Moteur',
          remainingKm: oilRemaining,
          percent: oilPct,
          status: oilStatus,
        });
      }

      // 2. Changement de Pneus (tous les 30 000 km)
      const tyreSince = mileage % 30000;
      const tyreRemaining = 30000 - tyreSince;
      const tyrePct = Math.round((tyreSince / 30000) * 100);
      const tyreStatus = tyreRemaining < 3000 ? 'critical' : tyreRemaining < 6000 ? 'warning' : 'safe';

      if (tyreStatus !== 'safe') {
        list.push({
          vehicle: v,
          type: 'tire_change',
          title: 'Remplacement de Pneus',
          remainingKm: tyreRemaining,
          percent: tyrePct,
          status: tyreStatus,
        });
      }

      // 3. Visite Technique (tous les 20 000 km)
      const inspSince = mileage % 20000;
      const inspRemaining = 20000 - inspSince;
      const inspPct = Math.round((inspSince / 20000) * 100);
      const inspStatus = inspRemaining < 2000 ? 'critical' : inspRemaining < 5000 ? 'warning' : 'safe';

      if (inspStatus !== 'safe') {
        list.push({
          vehicle: v,
          type: 'inspection',
          title: 'Visite Technique',
          remainingKm: inspRemaining,
          percent: inspPct,
          status: inspStatus,
        });
      }
    });

    // Classer par criticité d'échéance (priorité critique)
    return list.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (a.status !== 'critical' && b.status === 'critical') return 1;
      return a.remainingKm - b.remainingKm;
    });
  }, [vehicles]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<MaintenanceRequest>[] = [
    { key: 'ref', header: 'Référence', sortable: true, sortValue: (r) => r.reference || r.id, render: (r) => <span className="font-medium text-ink-800 dark:text-ink-100">{r.reference || r.id.slice(0, 8)}</span> },
    { key: 'vehicle', header: 'Véhicule', render: (r) => <span className="text-sm text-ink-600 dark:text-ink-300">{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : '—'}</span> },
    { key: 'issue', header: 'Type', sortable: true, sortValue: (r) => r.issue_type, render: (r) => <span className="text-sm">{ISSUE_OPTIONS.find((o) => o.value === r.issue_type)?.label ?? r.issue_type}</span> },
    { key: 'priority', header: 'Priorité', sortable: true, sortValue: (r) => r.priority, render: (r) => <span className={cn('badge', r.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : r.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400')}>{PRIORITY_OPTIONS.find((o) => o.value === r.priority)?.label ?? r.priority}</span> },
    { key: 'cost', header: 'Coût estimé', render: (r) => <span className="text-sm font-semibold">{formatCurrency(r.estimated_cost)}</span> },
    { key: 'date', header: 'Date', sortable: true, sortValue: (r) => r.created_at, render: (r) => <span className="text-sm">{formatDate(r.created_at)}</span> },
    { key: 'status', header: 'Statut', sortable: true, sortValue: (r) => r.status, render: (r) => <StatusBadge label={STATUS_OPTIONS.find((o) => o.value === r.status)?.label ?? r.status} colorClass={STATUS_COLORS[r.status] ?? ''} /> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(r)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(r)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Maintenance" subtitle={`${requests?.length ?? 0} demande(s)`} icon={<Wrench className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvelle demande</Button>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Colonne de gauche (2/3) : Liste des demandes en cours */}
        <div className="lg:col-span-2 space-y-6">
          <DataTable columns={columns} rows={requests ?? []} rowKey={(r) => r.id} loading={loading}
            searchKeys={(r) => `${r.reference || ''} ${r.vehicle?.brand || ''} ${r.vehicle?.model || ''} ${r.description || ''}`}
            emptyMessage="Aucune demande" emptyHint="Créez une demande de maintenance." />
        </div>

        {/* Colonne de droite (1/3) : Échéancier de Maintenance Préventive GPS */}
        <div>
          <Card className="border-indigo-100 dark:border-indigo-950 bg-indigo-50/10 dark:bg-indigo-950/5">
            <CardHeader 
              title="Planification Préventive (GPS)" 
              subtitle="Calculé d'après l'odomètre réel des véhicules"
            />
            <div className="p-4 space-y-4">
              {preventiveAlerts.length > 0 ? (
                preventiveAlerts.map((alert, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-ink-150 dark:border-ink-850 bg-white dark:bg-ink-900 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-ink-800 dark:text-ink-100 block">
                          {alert.vehicle?.brand} {alert.vehicle?.model}
                        </span>
                        <span className="text-[10px] text-ink-400 font-mono">
                          {alert.vehicle?.registration || '—'} · {alert.title}
                        </span>
                      </div>
                      
                      <span className={cn(
                        'badge text-[9px] font-extrabold uppercase px-1.5 py-0.5',
                        alert.status === 'critical' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 animate-pulse' 
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                      )}>
                        {alert.status === 'critical' ? 'Urgent' : 'Échéance'}
                      </span>
                    </div>

                    {/* Barre de progression de l'usure */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-ink-500">
                        <span>Kilomètres restants :</span>
                        <span className={cn(alert.status === 'critical' ? 'text-red-500 font-bold' : 'text-orange-500')}>
                          {formatNumber(alert.remainingKm)} km
                        </span>
                      </div>
                      <div className="w-full bg-ink-100 dark:bg-ink-800 rounded-full h-2 overflow-hidden shadow-inner">
                        <div 
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            alert.status === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                          )}
                          style={{ width: `${alert.percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Raccourci de création d'ordre de réparation */}
                    <button
                      type="button"
                      onClick={() => triggerQuickMaintenance(alert.vehicle.id, alert.type)}
                      className="w-full btn btn-secondary text-[10px] py-1.5 border-dashed border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    >
                      <Wrench className="w-3 h-3" /> Planifier l'intervention
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-ink-400 flex flex-col items-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-ink-800 dark:text-ink-100">Flotte sous contrôle</p>
                  <p className="text-[10px] text-ink-400 mt-1">Tous les compteurs préventifs sont au vert.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL CRÉATION / MODIFICATION DEMANDE */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la demande' : 'Nouvelle demande de maintenance'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Véhicule" required><Select options={(vehicles ?? []).map((v) => ({ value: v.id, label: `${v.brand} ${v.model} (${v.registration || '—'})` }))} value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} /></FormField>
          <FormField label="Type" required><Select options={ISSUE_OPTIONS} value={form.issue_type} onChange={(e) => set('issue_type', e.target.value)} /></FormField>
          <FormField label="Priorité"><Select options={PRIORITY_OPTIONS} value={form.priority} onChange={(e) => set('priority', e.target.value)} /></FormField>
          <FormField label="Statut"><Select options={STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} /></FormField>
          <FormField label="Coût estimé (FCFA)"><input type="number" className="input" value={form.estimated_cost} onChange={(e) => set('estimated_cost', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} /></FormField></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer la demande" message="Supprimer cette demande de maintenance ?" confirmLabel="Supprimer" danger />
    </div>
  );
}
