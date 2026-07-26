import { useState } from 'react';
import { 
  CalendarCheck, Plus, Pencil, Trash2, ClipboardCheck, 
  X, ShieldAlert 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useVehicles, useClients, useDrivers } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatusBadge } from '../components/Card';
import { RENTAL_STATUS_LABELS, RENTAL_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '../lib/labels';
import { formatCurrency, formatDateTime } from '../lib/format';
import type { Rental, Inspection } from '../lib/types';

const STATUS_OPTIONS = Object.entries(RENTAL_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));

interface FormState {
  client_id: string; vehicle_id: string; driver_id: string;
  start_datetime: string; planned_return_datetime: string;
  daily_rate: string; deposit: string; destination: string;
  status: string; payment_method: string; notes: string;
}

const EMPTY: FormState = {
  client_id: '', vehicle_id: '', driver_id: '', start_datetime: '', planned_return_datetime: '',
  daily_rate: '', deposit: '', destination: '', status: 'pending', payment_method: '', notes: '',
};

// Liste des zones du véhicule pour l'état des lieux interactif
const CAR_PARTS = [
  { id: 'front_bumper', label: 'Pare-chocs Avant' },
  { id: 'windshield', label: 'Pare-brise' },
  { id: 'hood', label: 'Capot Moteur' },
  { id: 'left_side', label: 'Flanc Gauche' },
  { id: 'right_side', label: 'Flanc Droit' },
  { id: 'roof', label: 'Toit' },
  { id: 'rear_bumper', label: 'Pare-chocs Arrière / Coffre' },
  { id: 'lights', label: 'Optiques & Phares' },
];

export function RentalsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: rentals, loading, refetch } = useQuery<Rental>(
    'rentals', '*, client:clients(*), vehicle:vehicles(*), driver:drivers(*)', { order: ['start_datetime', { ascending: false }] },
  );
  
  // Charger les états des lieux pour afficher un badge de statut de contrôle
  const { data: inspections, refetch: refetchInspections } = useQuery<Inspection>('inspections', '*');

  const { data: vehicles } = useVehicles();
  const { data: clients } = useClients();
  const { data: drivers } = useDrivers();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rental | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Rental | null>(null);

  // États pour l'inspection (État des lieux)
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  
  const [inspectType, setInspectType] = useState<'check_in' | 'check_out'>('check_in');
  const [inspectorName, setInspectorName] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState<'empty' | 'quarter' | 'half' | 'three_quarters' | 'full'>('full');
  const [cleanliness, setCleanliness] = useState<'clean' | 'average' | 'dirty'>('clean');
  const [tyresOk, setTyresOk] = useState(true);
  const [spareWheelOk, setSpareWheelOk] = useState(true);
  const [damagedParts, setDamagedParts] = useState<string[]>([]);
  const [signedBy, setSignedBy] = useState('');
  const [inspectNotes, setInspectNotes] = useState('');
  const [savingInspection, setSavingInspection] = useState(false);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (r: Rental) => {
    setEditing(r);
    setForm({
      client_id: r.client_id, vehicle_id: r.vehicle_id, driver_id: r.driver_id || '',
      start_datetime: r.start_datetime?.slice(0, 16) || '', planned_return_datetime: r.planned_return_datetime?.slice(0, 16) || '',
      daily_rate: r.daily_rate?.toString() || '', deposit: r.deposit?.toString() || '',
      destination: r.destination || '', status: r.status, payment_method: r.payment_method || '', notes: r.notes || '',
    });
    setModalOpen(true);
  };

  // Ouvrir le panneau de contrôle de l'État des Lieux
  const openInspection = (r: Rental) => {
    setSelectedRental(r);
    setInspectType(r.status === 'pending' || r.status === 'confirmed' ? 'check_in' : 'check_out');
    setInspectorName(profile?.full_name || '');
    setOdometer(r.vehicle?.current_mileage?.toString() || '');
    setFuelLevel('full');
    setCleanliness('clean');
    setTyresOk(true);
    setSpareWheelOk(true);
    setDamagedParts([]);
    setSignedBy(r.client?.name || '');
    setInspectNotes('');
    setInspectionModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.client_id || !form.vehicle_id || !form.start_datetime || !form.daily_rate) {
      toast('Client, véhicule, date de départ et tarif journalier sont obligatoires.', 'error'); return;
    }
    setSaving(true);
    const daysCount = form.planned_return_datetime
      ? Math.max(1, Math.ceil((new Date(form.planned_return_datetime).getTime() - new Date(form.start_datetime).getTime()) / 86400000))
      : null;
    const totalAmount = (parseFloat(form.daily_rate) * (daysCount ?? 1)) - (parseFloat(form.deposit || '0') || 0);
    const payload = {
      organization_id: profile.organization_id,
      client_id: form.client_id, vehicle_id: form.vehicle_id, driver_id: form.driver_id || null,
      start_datetime: form.start_datetime, planned_return_datetime: form.planned_return_datetime || null,
      daily_rate: parseFloat(form.daily_rate), deposit: parseFloat(form.deposit) || 0,
      destination: form.destination || null, status: form.status,
      payment_method: form.payment_method || null, notes: form.notes || null,
      days_count: daysCount, total_amount: totalAmount,
    };
    const { error } = editing
      ? await supabase.from('rentals').update(payload).eq('id', editing.id)
      : await supabase.from('rentals').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Location modifiée.' : 'Location créée.', 'success'); setModalOpen(false); refetch(); }
  };

  // Enregistrer l'Inspection / État des Lieux
  const saveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id || !selectedRental) return;
    if (!inspectorName || !odometer || !signedBy) {
      toast("Inspecteur, kilométrage et signature client requis.", "error");
      return;
    }

    setSavingInspection(true);

    const damagesList = damagedParts.map((p) => {
      const part = CAR_PARTS.find((cp) => cp.id === p);
      return { area: part?.label || p, damage_type: 'Signalé' };
    });

    const payload = {
      organization_id: profile.organization_id,
      rental_id: selectedRental.id,
      type: inspectType,
      inspector_name: inspectorName,
      odometer: parseInt(odometer) || 0,
      fuel_level: fuelLevel,
      cleanliness,
      tyres_ok: tyresOk,
      spare_wheel_ok: spareWheelOk,
      damages: damagesList,
      notes: inspectNotes || null,
      signed_by: signedBy,
    };

    // 1. Tenter d'insérer dans la table inspections
    const { error: insError } = await supabase.from('inspections').insert(payload);

    if (insError) {
      console.warn("Table inspections non disponible ou erreur, repli sur rentals.notes...", insError);
      
      // 2. Repli : Mettre à jour dans la note de la location de manière structurée
      const dateString = new Date().toLocaleDateString();
      const inspectLog = `\n\n[ÉTAT DES LIEUX - ${inspectType === 'check_in' ? 'DÉPART' : 'RETOUR'} le ${dateString}] \n• Inspecteur: ${inspectorName}\n• Km: ${odometer} km | Carburant: ${fuelLevel.toUpperCase()}\n• Propreté: ${cleanliness}\n• Pneus: ${tyresOk ? 'OK' : 'Infraction/Usés'} | Roue Secours: ${spareWheelOk ? 'Présente' : 'Absente'}\n• Dégâts: ${damagedParts.length > 0 ? damagedParts.map(p => CAR_PARTS.find(cp => cp.id === p)?.label).join(', ') : 'Aucun'}\n• Signé par: ${signedBy}\n• Notes: ${inspectNotes || 'N/A'}`;
      
      const newNotes = `${selectedRental.notes || ''}${inspectLog}`;
      await supabase.from('rentals').update({ notes: newNotes }).eq('id', selectedRental.id);
    }

    // 3. Mettre à jour le statut du véhicule et de la location
    const nextStatus = inspectType === 'check_in' ? 'in_progress' : 'returned';
    await supabase.from('rentals').update({ status: nextStatus }).eq('id', selectedRental.id);

    // Mettre à jour aussi le kilométrage du véhicule dans la table vehicles
    if (selectedRental.vehicle_id) {
      await supabase.from('vehicles').update({ 
        current_mileage: parseInt(odometer),
        status: inspectType === 'check_in' ? 'rented' : 'available'
      }).eq('id', selectedRental.vehicle_id);
    }

    setSavingInspection(false);
    setInspectionModalOpen(false);
    toast(`État des lieux de ${inspectType === 'check_in' ? 'départ' : 'retour'} enregistré avec succès !`, "success");
    refetch();
    if (refetchInspections) refetchInspections();
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('rentals').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Location supprimée.', 'success'); refetch(); }
  };

  const toggleDamagePart = (partId: string) => {
    setDamagedParts((prev) =>
      prev.includes(partId) ? prev.filter((p) => p !== partId) : [...prev, partId]
    );
  };

  // Trouver si un contrôle a été fait pour cette location
  const getRentalInspectionStatus = (rentalId: string) => {
    const list = inspections ?? [];
    const checkIn = list.find((i) => i.rental_id === rentalId && i.type === 'check_in');
    const checkOut = list.find((i) => i.rental_id === rentalId && i.type === 'check_out');
    
    if (checkIn && checkOut) return { text: 'Départ & Retour OK', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
    if (checkIn) return { text: 'Départ OK', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
    return { text: 'Aucun contrôle', color: 'bg-stone-100 text-stone-600 dark:bg-stone-850 dark:text-stone-400' };
  };

  const columns: Column<Rental>[] = [
    { key: 'ref', header: 'Référence', sortable: true, sortValue: (r) => r.reference || r.id, render: (r) => <span className="font-medium text-ink-800 dark:text-ink-100">{r.reference || r.id.slice(0, 8)}</span> },
    { key: 'client', header: 'Client', render: (r) => <span className="text-sm text-ink-600 dark:text-ink-300">{r.client?.name || '—'}</span> },
    { key: 'vehicle', header: 'Véhicule', render: (r) => <span className="text-sm text-ink-600 dark:text-ink-300">{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : '—'}</span> },
    { key: 'start', header: 'Départ', sortable: true, sortValue: (r) => r.start_datetime, render: (r) => <span className="text-sm">{formatDateTime(r.start_datetime)}</span> },
    { key: 'return', header: 'Retour prévu', render: (r) => <span className="text-sm">{formatDateTime(r.planned_return_datetime)}</span> },
    { key: 'amount', header: 'Montant', sortable: true, sortValue: (r) => r.total_amount, render: (r) => <span className="font-semibold text-sm">{formatCurrency(r.total_amount)}</span> },
    { key: 'status', header: 'Statut', sortable: true, sortValue: (r) => r.status, render: (r) => <StatusBadge label={RENTAL_STATUS_LABELS[r.status] ?? r.status} colorClass={RENTAL_STATUS_COLORS[r.status] ?? ''} /> },
    {
      key: 'inspection',
      header: 'Contrôle',
      render: (r) => {
        const check = getRentalInspectionStatus(r.id);
        return <span className={`badge text-[10px] font-bold ${check.color}`}>{check.text}</span>;
      }
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openInspection(r)} className="btn-ghost p-1.5 text-indigo-600 dark:text-indigo-400" title="État des lieux / Inspection"><ClipboardCheck className="w-4.5 h-4.5" /></button>
          <button onClick={() => openEdit(r)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(r)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Locations" subtitle={`${rentals?.length ?? 0} location(s)`} icon={<CalendarCheck className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvelle location</Button>} />
      
      <DataTable columns={columns} rows={rentals ?? []} rowKey={(r) => r.id} loading={loading}
        searchKeys={(r) => `${r.reference || ''} ${r.client?.name || ''} ${r.vehicle?.brand || ''} ${r.vehicle?.model || ''}`}
        emptyMessage="Aucune location" emptyHint="Créez votre première location." />

      {/* MODAL ÉDITION DE LOCATION */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la location' : 'Nouvelle location'} size="lg"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Client" required><Select options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))} value={form.client_id} onChange={(e) => set('client_id', e.target.value)} /></FormField>
          <FormField label="Véhicule" required><Select options={(vehicles ?? []).map((v) => ({ value: v.id, label: `${v.brand} ${v.model} (${v.registration || v.internal_number || '—'})` }))} value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} /></FormField>
          <FormField label="Chauffeur"><Select options={(drivers ?? []).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }))} value={form.driver_id} onChange={(e) => set('driver_id', e.target.value)} /></FormField>
          <FormField label="Destination"><input className="input" value={form.destination} onChange={(e) => set('destination', e.target.value)} /></FormField>
          <FormField label="Date de départ" required><input type="datetime-local" className="input" value={form.start_datetime} onChange={(e) => set('start_datetime', e.target.value)} /></FormField>
          <FormField label="Retour prévu"><input type="datetime-local" className="input" value={form.planned_return_datetime} onChange={(e) => set('planned_return_datetime', e.target.value)} /></FormField>
          <FormField label="Tarif journalier (FCFA)" required><input type="number" className="input" value={form.daily_rate} onChange={(e) => set('daily_rate', e.target.value)} /></FormField>
          <FormField label="Dépôt (FCFA)"><input type="number" className="input" value={form.deposit} onChange={(e) => set('deposit', e.target.value)} /></FormField>
          <FormField label="Statut"><Select options={STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} /></FormField>
          <FormField label="Mode de paiement"><Select options={PAYMENT_OPTIONS} value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)} /></FormField>
          <div className="sm:col-span-2"><FormField label="Notes"><textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></FormField></div>
        </form>
      </Modal>

      {/* CONFIRMATION DE SUPPRESSION */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer la location" message={`Supprimer la location ${deleteTarget?.reference || deleteTarget?.id.slice(0, 8)} ?`} confirmLabel="Supprimer" danger />

      {/* MODAL ÉTAT DES LIEUX / INSPECTION (CHECK-IN / CHECK-OUT) */}
      <Modal
        open={inspectionModalOpen}
        onClose={() => setInspectionModalOpen(false)}
        title={`État des Lieux — Location ${selectedRental?.reference || selectedRental?.id.slice(0, 8)}`}
        size="lg"
        footer={
          <>
            <button onClick={() => setInspectionModalOpen(false)} className="btn-secondary">Annuler</button>
            <button onClick={saveInspection} disabled={savingInspection} className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              {savingInspection ? 'Enregistrement…' : 'Enregistrer le contrôle'}
            </button>
          </>
        }
      >
        <form onSubmit={saveInspection} className="space-y-6">
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-indigo-850 dark:text-indigo-300 uppercase tracking-wider">Inspecter : {selectedRental?.vehicle ? `${selectedRental.vehicle.brand} ${selectedRental.vehicle.model}` : 'Véhicule'}</h4>
              <p className="text-[10px] text-ink-500 mt-0.5">Veuillez renseigner les anomalies constatées et le niveau de carburant au départ ou retour du véhicule.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Colonne 1 & 2 (Gauche) : Diagramme et zones de dégâts */}
            <div className="md:col-span-2 space-y-4">
              <label className="text-xs font-bold text-ink-700 dark:text-ink-300 block">
                Sélectionnez les zones endommagées ou rayées :
              </label>

              {/* Diagramme de voiture interactif en SVG */}
              <div className="p-4 border border-ink-150 dark:border-ink-850 rounded-xl bg-white dark:bg-ink-950 flex flex-col sm:flex-row items-center justify-center gap-8 shadow-inner">
                
                {/* SVG Car Mockup */}
                <div className="relative w-44 h-80 flex items-center justify-center bg-stone-50 dark:bg-stone-900/40 rounded-xl p-4 border border-stone-200/50 dark:border-stone-800">
                  <svg viewBox="0 0 100 200" className="w-full h-full text-ink-300 dark:text-ink-700">
                    {/* Roues */}
                    <rect x="8" y="25" width="8" height="20" rx="3" fill="#1c1917" />
                    <rect x="84" y="25" width="8" height="20" rx="3" fill="#1c1917" />
                    <rect x="8" y="145" width="8" height="20" rx="3" fill="#1c1917" />
                    <rect x="84" y="145" width="8" height="20" rx="3" fill="#1c1917" />

                    {/* Carrosserie Principale */}
                    <rect x="15" y="15" width="70" height="160" rx="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    
                    {/* Pare-brise */}
                    <path d="M 22 55 Q 50 40 78 55" fill="none" stroke="currentColor" strokeWidth="2" />
                    
                    {/* Lunette Arrière */}
                    <path d="M 22 145 Q 50 155 78 145" fill="none" stroke="currentColor" strokeWidth="2" />
                    
                    {/* Toit */}
                    <rect x="25" y="60" width="50" height="75" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    
                    {/* Capot */}
                    <path d="M 22 35 L 78 35" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    
                    {/* Coffre */}
                    <path d="M 22 160 L 78 160" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  
                  {/* Points d'impact absolus positionnés au dessus du SVG */}
                  <div className="absolute inset-0">
                    {/* Capot */}
                    <button type="button" onClick={() => toggleDamagePart('hood')} className={`absolute top-[16%] left-[45%] w-5 h-5 rounded-full border-2 transition flex items-center justify-center text-[8px] font-bold ${damagedParts.includes('hood') ? 'bg-red-500 border-red-700 text-white animate-pulse' : 'bg-white border-ink-300 text-ink-500 hover:scale-110'}`}>
                      {damagedParts.includes('hood') ? 'X' : ''}
                    </button>
                    {/* Pare-brise */}
                    <button type="button" onClick={() => toggleDamagePart('windshield')} className={`absolute top-[28%] left-[45%] w-5 h-5 rounded-full border-2 transition flex items-center justify-center text-[8px] font-bold ${damagedParts.includes('windshield') ? 'bg-red-500 border-red-700 text-white animate-pulse' : 'bg-white border-ink-300 text-ink-500 hover:scale-110'}`}>
                      {damagedParts.includes('windshield') ? 'X' : ''}
                    </button>
                    {/* Pare-chocs avant */}
                    <button type="button" onClick={() => toggleDamagePart('front_bumper')} className={`absolute top-[6%] left-[45%] w-5 h-5 rounded-full border-2 transition flex items-center justify-center text-[8px] font-bold ${damagedParts.includes('front_bumper') ? 'bg-red-500 border-red-700 text-white animate-pulse' : 'bg-white border-ink-300 text-ink-500 hover:scale-110'}`}>
                      {damagedParts.includes('front_bumper') ? 'X' : ''}
                    </button>
                    {/* Flanc gauche */}
                    <button type="button" onClick={() => toggleDamagePart('left_side')} className={`absolute top-[50%] left-[12%] w-5 h-5 rounded-full border-2 transition flex items-center justify-center text-[8px] font-bold ${damagedParts.includes('left_side') ? 'bg-red-500 border-red-700 text-white animate-pulse' : 'bg-white border-ink-300 text-ink-500 hover:scale-110'}`}>
                      {damagedParts.includes('left_side') ? 'X' : ''}
                    </button>
                    {/* Flanc droit */}
                    <button type="button" onClick={() => toggleDamagePart('right_side')} className={`absolute top-[50%] right-[12%] w-5 h-5 rounded-full border-2 transition flex items-center justify-center text-[8px] font-bold ${damagedParts.includes('right_side') ? 'bg-red-500 border-red-700 text-white animate-pulse' : 'bg-white border-ink-300 text-ink-500 hover:scale-110'}`}>
                      {damagedParts.includes('right_side') ? 'X' : ''}
                    </button>
                    {/* Toit */}
                    <button type="button" onClick={() => toggleDamagePart('roof')} className={`absolute top-[48%] left-[45%] w-5 h-5 rounded-full border-2 transition flex items-center justify-center text-[8px] font-bold ${damagedParts.includes('roof') ? 'bg-red-500 border-red-700 text-white animate-pulse' : 'bg-white border-ink-300 text-ink-500 hover:scale-110'}`}>
                      {damagedParts.includes('roof') ? 'X' : ''}
                    </button>
                    {/* Pare-chocs arrière */}
                    <button type="button" onClick={() => toggleDamagePart('rear_bumper')} className={`absolute bottom-[8%] left-[45%] w-5 h-5 rounded-full border-2 transition flex items-center justify-center text-[8px] font-bold ${damagedParts.includes('rear_bumper') ? 'bg-red-500 border-red-700 text-white animate-pulse' : 'bg-white border-ink-300 text-ink-500 hover:scale-110'}`}>
                      {damagedParts.includes('rear_bumper') ? 'X' : ''}
                    </button>
                    {/* Optiques */}
                    <button type="button" onClick={() => toggleDamagePart('lights')} className={`absolute bottom-[18%] left-[45%] w-5 h-5 rounded-full border-2 transition flex items-center justify-center text-[8px] font-bold ${damagedParts.includes('lights') ? 'bg-red-500 border-red-700 text-white animate-pulse' : 'bg-white border-ink-300 text-ink-500 hover:scale-110'}`}>
                      {damagedParts.includes('lights') ? 'X' : ''}
                    </button>
                  </div>
                </div>

                {/* Boutons d'activation manuelle */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {CAR_PARTS.map((part) => {
                    const active = damagedParts.includes(part.id);
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => toggleDamagePart(part.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition font-semibold ${active ? 'border-red-400 bg-red-50/30 text-red-700 dark:bg-red-950/20 dark:text-red-300' : 'border-ink-200 dark:border-ink-850 hover:bg-ink-100/40 text-ink-700 dark:text-ink-200'}`}
                      >
                        <span>{part.label}</span>
                        {active ? <X className="w-3.5 h-3.5 text-red-500" /> : <Plus className="w-3.5 h-3.5 text-ink-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Colonne 3 (Droite) : Formulaire d'état du véhicule */}
            <div className="space-y-4">
              <FormField label="Type de contrôle" required>
                <Select
                  options={[
                    { value: 'check_in', label: 'Départ (Check-in)' },
                    { value: 'check_out', label: 'Retour (Check-out)' }
                  ]}
                  value={inspectType}
                  onChange={(e) => setInspectType(e.target.value as 'check_in' | 'check_out')}
                />
              </FormField>

              <FormField label="Inspecteur" required>
                <input 
                  type="text" 
                  className="input" 
                  value={inspectorName} 
                  onChange={(e) => setInspectorName(e.target.value)} 
                  placeholder="Ex: Kouamé"
                />
              </FormField>

              <FormField label="Kilométrage (Odomètre)" required>
                <input 
                  type="number" 
                  className="input" 
                  value={odometer} 
                  onChange={(e) => setOdometer(e.target.value)} 
                  placeholder="Ex: 145000"
                />
              </FormField>

              <FormField label="Niveau de carburant" required>
                <Select
                  options={[
                    { value: 'empty', label: 'Vide (0/8)' },
                    { value: 'quarter', label: '1/4 (2/8)' },
                    { value: 'half', label: '1/2 (4/8)' },
                    { value: 'three_quarters', label: '3/4 (6/8)' },
                    { value: 'full', label: 'Plein (8/8)' },
                  ]}
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value as never)}
                />
              </FormField>

              <FormField label="Propreté du véhicule" required>
                <Select
                  options={[
                    { value: 'clean', label: 'Propre' },
                    { value: 'average', label: 'Moyen / Acceptable' },
                    { value: 'dirty', label: 'Sale' },
                  ]}
                  value={cleanliness}
                  onChange={(e) => setCleanliness(e.target.value as never)}
                />
              </FormField>

              {/* Checkboxes de sécurité */}
              <div className="space-y-2 pt-2 border-t border-ink-150 dark:border-ink-850">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-700 dark:text-ink-300">
                  <input 
                    type="checkbox" 
                    checked={tyresOk} 
                    onChange={(e) => setTyresOk(e.target.checked)} 
                    className="rounded border-ink-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Pneus en bon état ?
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-700 dark:text-ink-300">
                  <input 
                    type="checkbox" 
                    checked={spareWheelOk} 
                    onChange={(e) => setSpareWheelOk(e.target.checked)} 
                    className="rounded border-ink-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Roue de secours ok ?
                </label>
              </div>

              <FormField label="Nom & Signature Client" required>
                <input 
                  type="text" 
                  className="input font-mono" 
                  value={signedBy} 
                  onChange={(e) => setSignedBy(e.target.value)} 
                  placeholder="Tapez le nom pour signer"
                />
                <span className="text-[10px] text-ink-400 block mt-1">Équivaut à une signature numérique légale.</span>
              </FormField>
            </div>
          </div>

          <div className="border-t border-ink-150 dark:border-ink-850 pt-4">
            <FormField label="Observations libres / Notes">
              <textarea 
                className="input min-h-[60px]" 
                value={inspectNotes} 
                onChange={(e) => setInspectNotes(e.target.value)} 
                placeholder="Ex: Impact de gravillon sur la lunette arrière..."
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
