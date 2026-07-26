import { useState } from 'react';
import { 
  Fuel as FuelIcon, Plus, Pencil, Trash2, Scan, Camera, Sparkles, 
  Upload, X, Check 
} from 'lucide-react';
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
import { FUEL_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '../lib/labels';
import { formatCurrency, formatNumber, formatDate } from '../lib/format';
import type { FuelEntry } from '../lib/types';

const FUEL_OPTIONS = Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }));

interface FormState {
  vehicle_id: string; driver_id: string; date: string; station_name: string;
  fuel_type: string; quantity: string; price_per_unit: string; mileage: string;
  payment_method: string; fuel_card: string; notes: string;
}

const EMPTY: FormState = {
  vehicle_id: '', driver_id: '', date: '', station_name: '', fuel_type: 'diesel',
  quantity: '', price_per_unit: '', mileage: '', payment_method: 'cash', fuel_card: '', notes: '',
};

// Synthétiseur audio de bip technologique de validation OCR
const playOcrBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = 1320; // Son strident et clair de numérisation réussie
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.error("Audio non supporté:", e);
  }
};

export function FuelPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: entries, loading, refetch } = useQuery<FuelEntry>(
    'fuel_entries', '*, vehicle:vehicles(*), driver:drivers(*)', { order: ['date', { ascending: false }] },
  );
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FuelEntry | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FuelEntry | null>(null);

  // États de simulation de l'OCR intelligente
  const [showScanPanel, setShowScanPanel] = useState(false);
  const [selectedTicketDemo, setSelectedTicketDemo] = useState<'total' | 'shell' | 'ola' | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');

  const totalAmount = (entries ?? []).reduce((s, e) => s + e.amount, 0);
  const totalLiters = (entries ?? []).reduce((s, e) => s + e.quantity, 0);
  const avgPrice = totalLiters > 0 ? totalAmount / totalLiters : 0;

  const openCreate = () => { 
    setEditing(null); 
    setForm(EMPTY); 
    setShowScanPanel(false);
    setSelectedTicketDemo(null);
    setModalOpen(true); 
  };
  
  const openEdit = (e: FuelEntry) => {
    setEditing(e);
    setForm({
      vehicle_id: e.vehicle_id, driver_id: e.driver_id || '', date: e.date || '',
      station_name: e.station_name || '', fuel_type: e.fuel_type || 'diesel',
      quantity: e.quantity?.toString() || '', price_per_unit: e.price_per_unit?.toString() || '',
      mileage: e.mileage?.toString() || '', payment_method: e.payment_method || 'cash',
      fuel_card: e.fuel_card || '', notes: e.notes || '',
    });
    setShowScanPanel(false);
    setSelectedTicketDemo(null);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.vehicle_id || !form.date || !form.quantity || !form.price_per_unit) {
      toast('Véhicule, date, quantité et prix sont obligatoires.', 'error'); return;
    }
    setSaving(true);
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.price_per_unit);
    const payload = {
      organization_id: profile.organization_id,
      vehicle_id: form.vehicle_id, driver_id: form.driver_id || null, date: form.date,
      station_name: form.station_name || null, fuel_type: form.fuel_type || null,
      quantity: qty, price_per_unit: price, amount: qty * price,
      mileage: form.mileage ? parseInt(form.mileage) : null,
      payment_method: form.payment_method || null, fuel_card: form.fuel_card || null,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from('fuel_entries').update(payload).eq('id', editing.id)
      : await supabase.from('fuel_entries').insert(payload);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast(editing ? 'Enregistrement modifié.' : 'Plein enregistré.', 'success'); setModalOpen(false); refetch(); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('fuel_entries').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Enregistrement supprimé.', 'success'); refetch(); }
  };

  // Traiter la simulation de scan OCR
  const handleOcrScan = () => {
    if (!selectedTicketDemo) {
      toast("Veuillez sélectionner un ticket d'exemple pour lancer la démonstration.", "info");
      return;
    }

    setIsScanning(true);
    setScanStep("Alignement du reçu et correction d'image...");

    // Séquence de chargement pour imiter la détection de texte OCR
    setTimeout(() => {
      setScanStep("Lecture de l'en-tête (Détection de la Station Service)...");
    }, 600);

    setTimeout(() => {
      setScanStep("Lecture des montants et des volumes (Litres, Prix/L)...");
    }, 1200);

    setTimeout(() => {
      setScanStep("Calcul de cohérence et extraction finale...");
    }, 1800);

    setTimeout(() => {
      // Fin du scan
      playOcrBeep();
      setIsScanning(false);
      setShowScanPanel(false);

      const dateAujourdhui = new Date().toISOString().split('T')[0];

      if (selectedTicketDemo === 'total') {
        setForm((f) => ({
          ...f,
          station_name: 'Total Marcory Bld VGE',
          quantity: '45',
          price_per_unit: '800',
          fuel_type: 'diesel',
          payment_method: 'card',
          date: dateAujourdhui,
          notes: 'Reçu scanné automatiquement par OCR (Démonstration Total CI)',
        }));
      } else if (selectedTicketDemo === 'shell') {
        setForm((f) => ({
          ...f,
          station_name: 'Shell Bld de Marseille',
          quantity: '30',
          price_per_unit: '875',
          fuel_type: 'super',
          payment_method: 'cash',
          date: dateAujourdhui,
          notes: 'Reçu scanné automatiquement par OCR (Démonstration Shell CI)',
        }));
      } else if (selectedTicketDemo === 'ola') {
        setForm((f) => ({
          ...f,
          station_name: 'Ola Bouaké Centre',
          quantity: '50',
          price_per_unit: '800',
          fuel_type: 'diesel',
          payment_method: 'mobile_money',
          date: dateAujourdhui,
          notes: 'Reçu scanné automatiquement par OCR (Démonstration Ola Energy)',
        }));
      }

      toast("Ticket de carburant analysé et importé avec succès !", "success");
    }, 2400);
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<FuelEntry>[] = [
    { key: 'date', header: 'Date', sortable: true, sortValue: (e) => e.date, render: (e) => <span className="text-sm">{formatDate(e.date)}</span> },
    { key: 'vehicle', header: 'Véhicule', render: (e) => <span className="text-sm text-ink-600 dark:text-ink-300">{e.vehicle ? `${e.vehicle.brand} ${e.vehicle.model}` : '—'}</span> },
    { key: 'station', header: 'Station', render: (e) => <span className="text-sm text-ink-600 dark:text-ink-300">{e.station_name || '—'}</span> },
    { key: 'quantity', header: 'Quantité', sortable: true, sortValue: (e) => e.quantity, render: (e) => <span className="text-sm">{formatNumber(e.quantity)} L</span> },
    { key: 'price', header: 'Prix/L', render: (e) => <span className="text-sm">{formatCurrency(e.price_per_unit)}</span> },
    { key: 'amount', header: 'Montant', sortable: true, sortValue: (e) => e.amount, render: (e) => <span className="font-semibold text-sm">{formatCurrency(e.amount)}</span> },
    { key: 'mileage', header: 'Km', render: (e) => <span className="text-sm">{formatNumber(e.mileage)}</span> },
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
      <PageHeader title="Carburant" subtitle={`${entries?.length ?? 0} enregistrement(s)`} icon={<FuelIcon className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouveau plein</Button>} />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total dépensé" value={formatCurrency(totalAmount)} color="amber" icon={<FuelIcon className="w-5 h-5" />} />
        <StatCard label="Total carburant" value={`${formatNumber(totalLiters)} L`} color="blue" icon={<FuelIcon className="w-5 h-5" />} />
        <StatCard label="Prix moyen/L" value={formatCurrency(avgPrice)} color="emerald" icon={<FuelIcon className="w-5 h-5" />} />
      </div>

      <DataTable columns={columns} rows={entries ?? []} rowKey={(e) => e.id} loading={loading}
        searchKeys={(e) => `${e.vehicle?.brand || ''} ${e.vehicle?.model || ''} ${e.station_name || ''} ${formatDate(e.date)}`}
        emptyMessage="Aucun enregistrement" emptyHint="Enregistrez vos pleins de carburant." />

      {/* MODAL ENREGISTREMENT PLEIN & OCR */}
      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editing ? 'Modifier le plein' : 'Enregistrer un plein de carburant'} 
        size="lg"
        footer={
          !showScanPanel ? (
            <>
              <button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </>
          ) : null
        }
      >
        <div className="space-y-6">
          
          {/* Entête d'accès à l'OCR intelligente */}
          {!editing && !showScanPanel && (
            <div className="border border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Scan className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-800 dark:text-ink-100">SAISIE AUTOMATISÉE PAR PHOTO (OCR IA)</h4>
                  <p className="text-[10px] text-ink-500">Scannez le reçu papier du plein pour préremplir le formulaire instantanément.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowScanPanel(true)}
                className="btn btn-secondary border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5 text-xs py-1.5"
              >
                <Camera className="w-3.5 h-3.5" /> Numériser un reçu
              </button>
            </div>
          )}

          {/* GRILLE DU SCANNER OCR (Conditionnel) */}
          {showScanPanel ? (
            <div className="border border-ink-150 dark:border-ink-850 rounded-xl p-5 bg-ink-50/50 dark:bg-ink-950/50 space-y-5 animate-fade-in relative overflow-hidden">
              
              {/* Animation laser verte de scan */}
              {isScanning && (
                <div 
                  className="absolute left-0 w-full bg-gradient-to-b from-transparent via-emerald-500 to-transparent opacity-80 z-20 pointer-events-none"
                  style={{
                    height: '6px',
                    boxShadow: '0 0 10px #10b981, 0 0 20px #10b981',
                    animation: 'scan-laser-move 1.2s infinite ease-in-out',
                    top: '0px'
                  }}
                />
              )}
              {/* CSS de l'animation de scan */}
              <style>{`
                @keyframes scan-laser-move {
                  0% { top: 0%; }
                  50% { top: 100%; }
                  100% { top: 0%; }
                }
              `}</style>

              <div className="flex items-center justify-between border-b border-ink-150 dark:border-ink-850 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                  <h3 className="text-sm font-bold text-ink-800 dark:text-ink-100">Démonstrateur Scanner OCR intelligent</h3>
                </div>
                <button 
                  type="button" 
                  disabled={isScanning}
                  onClick={() => setShowScanPanel(false)}
                  className="p-1 rounded hover:bg-ink-200 dark:hover:bg-ink-900 text-ink-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!isScanning ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-ink-700 dark:text-ink-300 block">
                      Étape 1 : Choisir un reçu de caisse d'exemple :
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTicketDemo('total')}
                        className={`w-full text-left p-3 rounded-lg border transition text-xs flex justify-between items-center ${selectedTicketDemo === 'total' ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-ink-200 dark:border-ink-850 hover:bg-ink-100/40'}`}
                      >
                        <div>
                          <strong className="block">Total Marcory (VGE)</strong>
                          <span className="text-[10px] text-ink-500">45 Litres · Gazole · 36 000 FCFA</span>
                        </div>
                        {selectedTicketDemo === 'total' && <Check className="w-4 h-4 text-indigo-500" />}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setSelectedTicketDemo('shell')}
                        className={`w-full text-left p-3 rounded-lg border transition text-xs flex justify-between items-center ${selectedTicketDemo === 'shell' ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-ink-200 dark:border-ink-850 hover:bg-ink-100/40'}`}
                      >
                        <div>
                          <strong className="block">Shell Bld de Marseille (Zone 4)</strong>
                          <span className="text-[10px] text-ink-500">30 Litres · Super · 26 250 FCFA</span>
                        </div>
                        {selectedTicketDemo === 'shell' && <Check className="w-4 h-4 text-indigo-500" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTicketDemo('ola')}
                        className={`w-full text-left p-3 rounded-lg border transition text-xs flex justify-between items-center ${selectedTicketDemo === 'ola' ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-ink-200 dark:border-ink-850 hover:bg-ink-100/40'}`}
                      >
                        <div>
                          <strong className="block">Ola Energy (Bouaké)</strong>
                          <span className="text-[10px] text-ink-500">50 Litres · Diesel · 40 000 FCFA</span>
                        </div>
                        {selectedTicketDemo === 'ola' && <Check className="w-4 h-4 text-indigo-500" />}
                      </button>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        type="button"
                        onClick={handleOcrScan}
                        className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
                      >
                        <Scan className="w-4 h-4" /> Lancer l'analyse OCR
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowScanPanel(false)}
                        className="btn btn-secondary flex-1 text-xs py-2"
                      >
                        Saisie manuelle
                      </button>
                    </div>
                  </div>

                  {/* Rendu visuel simulé du ticket de caisse */}
                  <div className="bg-white dark:bg-ink-950 p-4 border border-ink-200 dark:border-ink-850 rounded-xl shadow-inner flex flex-col items-center justify-center min-h-[220px]">
                    {selectedTicketDemo ? (
                      <div className="w-full max-w-[200px] border border-stone-200 p-3 bg-stone-50 dark:bg-stone-900 rounded font-mono text-[10px] text-stone-800 dark:text-stone-300 shadow-sm leading-tight">
                        <div className="text-center font-bold mb-2">
                          {selectedTicketDemo === 'total' ? 'TOTAL CÔTE D\'IVOIRE' : selectedTicketDemo === 'shell' ? 'SHELL CI' : 'OLA ENERGY'}
                        </div>
                        <div className="text-center text-[8px] text-stone-500 mb-3 border-b border-dashed border-stone-300 pb-2">
                          {selectedTicketDemo === 'total' ? 'MARCORY - ZONE VGE' : selectedTicketDemo === 'shell' ? 'ZONE 4 - BD MARSEILLE' : 'BOUAKÉ CENTRE'}
                        </div>
                        <p>DATE : {new Date().toLocaleDateString()}</p>
                        <p>PRODUIT : {selectedTicketDemo === 'shell' ? 'SUPER SANS PLOMB' : 'DIESEL / GAZOLE'}</p>
                        <p className="mt-1">VOLUME : {selectedTicketDemo === 'total' ? '45.00 L' : selectedTicketDemo === 'shell' ? '30.00 L' : '50.00 L'}</p>
                        <p>PRIX/L : {selectedTicketDemo === 'total' ? '800 FCFA' : selectedTicketDemo === 'shell' ? '875 FCFA' : '800 FCFA'}</p>
                        <div className="border-t border-dashed border-stone-300 my-2 pt-1 font-bold flex justify-between text-xs">
                          <span>TOTAL :</span>
                          <span>{selectedTicketDemo === 'total' ? '36 000' : selectedTicketDemo === 'shell' ? '26 250' : '40 000'} F</span>
                        </div>
                        <div className="text-center text-[7px] text-stone-400 mt-2">MERCI DE VOTRE VISITE</div>
                      </div>
                    ) : (
                      <div className="text-center text-ink-400 py-6">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-ink-300" />
                        <p className="text-xs">Choisissez un ticket à gauche pour afficher son aperçu de numérisation.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="relative w-14 h-14 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin"></div>
                  </div>
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">{scanStep}</p>
                  <p className="text-[10px] text-ink-500 mt-1">Extraction OCR intelligente en cours...</p>
                </div>
              )}
            </div>
          ) : (
            
            /* FORMULAIRE CLASSIQUE */
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Véhicule" required>
                <Select 
                  options={(vehicles ?? []).map((v) => ({ value: v.id, label: `${v.brand} ${v.model} (${v.registration || '—'})` }))} 
                  value={form.vehicle_id} 
                  onChange={(e) => set('vehicle_id', e.target.value)} 
                />
              </FormField>
              <FormField label="Chauffeur">
                <Select 
                  options={(drivers ?? []).map((d) => ({ value: d.id, label: `${d.first_name} ${d.last_name}` }))} 
                  value={form.driver_id} 
                  onChange={(e) => set('driver_id', e.target.value)} 
                />
              </FormField>
              <FormField label="Date" required>
                <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </FormField>
              <FormField label="Station-service">
                <input className="input" value={form.station_name} onChange={(e) => set('station_name', e.target.value)} placeholder="Total, Shell, Ola, Petroci..." />
              </FormField>
              <FormField label="Type de carburant">
                <Select options={FUEL_OPTIONS} value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)} />
              </FormField>
              <FormField label="Quantité (Litres)" required>
                <input type="number" step="0.01" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
              </FormField>
              <FormField label="Prix par litre (FCFA)" required>
                <input type="number" className="input" value={form.price_per_unit} onChange={(e) => set('price_per_unit', e.target.value)} />
              </FormField>
              <FormField label="Kilométrage du compteur">
                <input type="number" className="input" value={form.mileage} onChange={(e) => set('mileage', e.target.value)} />
              </FormField>
              <FormField label="Mode de paiement">
                <Select options={PAYMENT_OPTIONS} value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)} />
              </FormField>
              <FormField label="Carte carburant / N° Transaction">
                <input className="input" value={form.fuel_card} onChange={(e) => set('fuel_card', e.target.value)} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Notes / Justificatif">
                  <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
                </FormField>
              </div>
            </form>
          )}

        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer le plein" message="Supprimer cet enregistrement de carburant ?" confirmLabel="Supprimer" danger />
    </div>
  );
}
