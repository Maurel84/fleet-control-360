import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Car, ArrowLeft, FileText, Fuel, Wrench, MapPin, Calendar, Gauge,
  Palette, Zap, Users, Building2, Wallet, Disc,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useSingle } from '../lib/query';
import { useToast } from '../lib/toast';
import { Card, CardHeader, StatusBadge } from '../components/Card';

import {
  VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, FUEL_TYPE_LABELS,
  VEHICLE_DOCUMENT_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS,
} from '../lib/labels';
import { formatCurrency, formatNumber, formatDate, formatDateTime, daysUntil } from '../lib/format';
import type { Vehicle, VehicleDocument, FuelEntry, MaintenanceRequest, GpsPosition } from '../lib/types';
import { cn } from '../lib/cn';
import { GpsMap } from '../components/GpsMap';

type Tab = 'overview' | 'documents' | 'fuel' | 'maintenance' | 'gps' | 'tires';

export function VehicleDetailPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { data: vehicle, loading } = useSingle<Vehicle>(
    'vehicles', '*, agency:agencies(*), category_ref:vehicle_categories(*)', id,
  );
  const [tab, setTab] = useState<Tab>('overview');
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [fuel, setFuel] = useState<FuelEntry[]>([]);
  const [maint, setMaint] = useState<MaintenanceRequest[]>([]);
  const [gps, setGps] = useState<GpsPosition[]>([]);

  useEffect(() => {
    if (!id || !profile?.organization_id) return;
    let active = true;
    Promise.all([
      supabase.from('vehicle_documents').select('*').eq('vehicle_id', id).order('expiry_date', { ascending: true }),
      supabase.from('fuel_entries').select('*, vehicle:vehicles(*)').eq('vehicle_id', id).order('date', { ascending: false }).limit(10),
      supabase.from('maintenance_requests').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }).limit(10),
      supabase.from('gps_positions').select('*').eq('vehicle_id', id).order('recorded_at', { ascending: false }).limit(10),
    ]).then((res) => {
      if (!active) return;
      setDocs((res[0].data as VehicleDocument[]) ?? []);
      setFuel((res[1].data as FuelEntry[]) ?? []);
      setMaint((res[2].data as MaintenanceRequest[]) ?? []);
      setGps((res[3].data as GpsPosition[]) ?? []);
    });
    return () => { active = false; };
  }, [id, profile?.organization_id]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-16">
        <Car className="w-12 h-12 text-ink-300 mx-auto mb-3" />
        <p className="text-ink-500">Véhicule introuvable.</p>
        <Link to="/vehicles" className="text-blue-600 dark:text-blue-400 text-sm mt-2 inline-block hover:underline">Retour au parc</Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof FileText; count?: number }[] = [
    { key: 'overview', label: 'Informations', icon: Car },
    { key: 'documents', label: 'Documents', icon: FileText, count: docs.length },
    { key: 'fuel', label: 'Carburant', icon: Fuel, count: fuel.length },
    { key: 'maintenance', label: 'Maintenance', icon: Wrench, count: maint.length },
    { key: 'gps', label: 'GPS', icon: MapPin, count: gps.length },
    { key: 'tires', label: 'Pneumatiques', icon: Disc },
  ];

  return (
    <div className="animate-fade-in">
      <Link to="/vehicles" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700 dark:hover:text-ink-300 mb-4">
        <ArrowLeft className="w-4 h-4" /> Parc automobile
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Car className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-ink-900 dark:text-white">{vehicle.brand} {vehicle.model}</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">{vehicle.internal_number || '—'} · {vehicle.registration || '—'}</p>
          </div>
        </div>
        <StatusBadge label={VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status} colorClass={VEHICLE_STATUS_COLORS[vehicle.status] ?? ''} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-ink-200/60 dark:border-ink-800/60 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap',
              tab === t.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-ink-500 hover:text-ink-700 dark:hover:text-ink-300',
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="text-xs bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 rounded-full px-1.5">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab vehicle={vehicle} />}
      {tab === 'documents' && <DocumentsTab docs={docs} />}
      {tab === 'fuel' && <FuelTab fuel={fuel} />}
      {tab === 'maintenance' && <MaintenanceTab maint={maint} />}
      {tab === 'gps' && <GpsTab gps={gps} vehicle={vehicle} />}
      {tab === 'tires' && <TiresTab vehicleId={vehicle.id} />}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-500 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-400">{label}</p>
        <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{value}</p>
      </div>
    </div>
  );
}

function OverviewTab({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader title="Informations générales" />
        <div className="divide-y divide-ink-100 dark:divide-ink-800/40">
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Année de fabrication" value={vehicle.year_manufactured || '—'} />
          <InfoRow icon={<Palette className="w-4 h-4" />} label="Couleur" value={vehicle.color || '—'} />
          <InfoRow icon={<Users className="w-4 h-4" />} label="Places" value={vehicle.seats || '—'} />
          <InfoRow icon={<Zap className="w-4 h-4" />} label="Carburant" value={FUEL_TYPE_LABELS[vehicle.fuel_type ?? ''] ?? '—'} />
          <InfoRow icon={<Gauge className="w-4 h-4" />} label="Kilométrage" value={`${formatNumber(vehicle.current_mileage)} km`} />
          <InfoRow icon={<Building2 className="w-4 h-4" />} label="Agence" value={vehicle.agency?.name || '—'} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Propriété et valeur" />
        <div className="divide-y divide-ink-100 dark:divide-ink-800/40">
          <InfoRow icon={<Car className="w-4 h-4" />} label="Type de propriété" value={vehicle.ownership_type === 'owned' ? 'Propre' : vehicle.ownership_type === 'leased' ? 'Leasing' : vehicle.ownership_type === 'rented' ? 'Loué' : 'Partenaire'} />
          <InfoRow icon={<Building2 className="w-4 h-4" />} label="Propriétaire" value={vehicle.owner_name || '—'} />
          <InfoRow icon={<Wallet className="w-4 h-4" />} label="Prix d'achat" value={formatCurrency(vehicle.purchase_price)} />
          <InfoRow icon={<Wallet className="w-4 h-4" />} label="Valeur estimée" value={formatCurrency(vehicle.estimated_value)} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date d'achat" value={formatDate(vehicle.purchase_date)} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="1ère immatriculation" value={formatDate(vehicle.first_registration_date)} />
        </div>
      </Card>

      {vehicle.notes && (
        <Card className="lg:col-span-2">
          <CardHeader title="Notes" />
          <p className="text-sm text-ink-600 dark:text-ink-300 whitespace-pre-wrap">{vehicle.notes}</p>
        </Card>
      )}
    </div>
  );
}

function DocumentsTab({ docs }: { docs: VehicleDocument[] }) {
  if (docs.length === 0) return <EmptyState text="Aucun document enregistré pour ce véhicule." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {docs.map((d) => {
        const days = daysUntil(d.expiry_date);
        return (
          <Card key={d.id}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-ink-400" />
                <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{VEHICLE_DOCUMENT_LABELS[d.type] ?? d.type}</span>
              </div>
              <StatusBadge label={DOCUMENT_STATUS_LABELS[d.status] ?? d.status} colorClass={DOCUMENT_STATUS_COLORS[d.status] ?? ''} />
            </div>
            <p className="text-xs text-ink-500">N° {d.document_number || '—'}</p>
            <p className="text-xs text-ink-500 mt-1">Expire le {formatDate(d.expiry_date)}</p>
            {days !== null && days <= 30 && (
              <p className={cn('text-xs font-medium mt-2', days <= 7 ? 'text-red-600' : 'text-amber-600')}>
                {days <= 0 ? 'Expiré' : `Expire dans ${days} jour${days > 1 ? 's' : ''}`}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function FuelTab({ fuel }: { fuel: FuelEntry[] }) {
  if (fuel.length === 0) return <EmptyState text="Aucun enregistrement de carburant." />;
  return (
    <div className="table-wrap">
      <table className="table-base">
        <thead>
          <tr><th>Date</th><th>Station</th><th>Quantité</th><th>Prix/unité</th><th>Montant</th><th>Kilométrage</th></tr>
        </thead>
        <tbody>
          {fuel.map((f) => (
            <tr key={f.id}>
              <td>{formatDate(f.date)}</td>
              <td>{f.station_name || '—'}</td>
              <td>{formatNumber(f.quantity)} L</td>
              <td>{formatCurrency(f.price_per_unit)}</td>
              <td className="font-semibold">{formatCurrency(f.amount)}</td>
              <td>{formatNumber(f.mileage)} km</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceTab({ maint }: { maint: MaintenanceRequest[] }) {
  if (maint.length === 0) return <EmptyState text="Aucune demande de maintenance." />;
  return (
    <div className="space-y-3">
      {maint.map((m) => (
        <Card key={m.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{m.issue_type}</p>
              <p className="text-xs text-ink-500 mt-0.5">{m.description}</p>
              <p className="text-xs text-ink-400 mt-1">{formatDate(m.created_at)}</p>
            </div>
            <div className="text-right">
              <StatusBadge label={m.status} colorClass="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400" />
              {m.estimated_cost && <p className="text-sm font-semibold mt-1">{formatCurrency(m.estimated_cost)}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function GpsTab({ gps, vehicle }: { gps: GpsPosition[]; vehicle: Vehicle }) {
  if (gps.length === 0) return <EmptyState text="Aucune position GPS enregistrée." />;

  const positionsWithVehicle = useMemo(() => {
    return gps.slice(0, 1).map((p) => ({ ...p, vehicle }));
  }, [gps, vehicle]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <GpsMap 
          positions={positionsWithVehicle} 
          heightClass="h-[320px]"
          title="Dernière position connue"
          subtitle={`Localisation en temps réel`}
        />
      </div>
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2 px-1">Historique récent</h4>
        <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
          {gps.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 dark:text-ink-100 font-mono">{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</p>
                <p className="text-xs text-ink-400">{formatDateTime(p.recorded_at)}</p>
              </div>
              {p.speed !== null && <span className="text-xs text-ink-500 font-semibold">{p.speed} km/h</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-ink-300 dark:text-ink-600">
      <p className="text-sm">{text}</p>
    </div>
  );
}

interface TireData {
  brand: string;
  pressure: number;
  depth: number;
}

const DEFAULT_TIRES: Record<string, TireData> = {
  front_left: { brand: 'Michelin Pilot Sport', pressure: 2.2, depth: 6.5 },
  front_right: { brand: 'Michelin Pilot Sport', pressure: 2.2, depth: 6.2 },
  rear_left: { brand: 'Michelin Pilot Sport', pressure: 2.1, depth: 3.8 },
  rear_right: { brand: 'Michelin Pilot Sport', pressure: 2.1, depth: 1.5 },
  spare: { brand: 'Michelin Standard', pressure: 2.3, depth: 8.0 }
};

const TIRE_LABELS: Record<string, string> = {
  front_left: 'Avant Gauche (AV-G)',
  front_right: 'Avant Droit (AV-D)',
  rear_left: 'Arrière Gauche (AR-G)',
  rear_right: 'Arrière Droit (AR-D)',
  spare: 'Roue de Secours (SEC)'
};

function TiresTab({ vehicleId }: { vehicleId: string }) {
  const { toast } = useToast();
  const storageKey = `vehicle-${vehicleId}-tires`;
  
  const [tires, setTires] = useState<Record<string, TireData>>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : DEFAULT_TIRES;
  });

  const [selectedWheel, setSelectedWheel] = useState<string>('front_left');
  
  // Temporary form state
  const currentTire = tires[selectedWheel];
  const [brand, setBrand] = useState(currentTire.brand);
  const [pressure, setPressure] = useState(currentTire.pressure.toString());
  const [depth, setDepth] = useState(currentTire.depth.toString());

  // Sync form state when active wheel changes
  useEffect(() => {
    const tire = tires[selectedWheel];
    setBrand(tire.brand);
    setPressure(tire.pressure.toString());
    setDepth(tire.depth.toString());
  }, [selectedWheel, tires]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...tires,
      [selectedWheel]: {
        brand,
        pressure: parseFloat(pressure) || 0,
        depth: parseFloat(depth) || 0
      }
    };
    setTires(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    toast('Données du pneu enregistrées avec succès.', 'success');
  };

  // Helper to determine status color for wheels
  const getTireStatus = (tire: TireData) => {
    if (tire.depth < 1.6 || tire.pressure < 1.6 || tire.pressure > 2.7) return 'critical';
    if (tire.depth < 3.0 || tire.pressure < 1.9 || tire.pressure > 2.5) return 'warning';
    return 'good';
  };

  const getTireColorClass = (tire: TireData) => {
    const status = getTireStatus(tire);
    if (status === 'critical') return 'fill-red-500 stroke-red-600 dark:fill-red-650';
    if (status === 'warning') return 'fill-amber-500 stroke-amber-600 dark:fill-amber-650';
    return 'fill-emerald-500 stroke-emerald-600 dark:fill-emerald-650';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Visual Wheel Map Column 1 & 2 */}
      <div className="lg:col-span-2 card p-5 flex flex-col items-center">
        <CardHeader title="Schéma d'état des pneumatiques" subtitle="Sélectionnez un pneu sur le véhicule pour ajuster la pression et mesurer l'usure" />
        
        <div className="relative w-full max-w-[320px] h-[360px] flex items-center justify-center bg-ink-50/30 dark:bg-ink-950/10 rounded-2xl border border-ink-100 dark:border-ink-800/40 p-4">
          <svg viewBox="0 0 200 300" className="w-full h-full max-h-[300px]">
            {/* Chassis outline */}
            <rect x="75" y="40" width="50" height="200" rx="10" className="fill-ink-200/50 dark:fill-ink-800/50 stroke-ink-300 dark:stroke-ink-700 stroke-2" />
            <line x1="50" y1="80" x2="150" y2="80" className="stroke-ink-400 dark:stroke-ink-600 stroke-4" />
            <line x1="50" y1="200" x2="150" y2="200" className="stroke-ink-400 dark:stroke-ink-600 stroke-4" />
            
            {/* Front Left Wheel */}
            <g className="cursor-pointer" onClick={() => setSelectedWheel('front_left')}>
              <rect x="35" y="55" width="30" height="50" rx="6" className={cn(
                "transition-all duration-200 hover:opacity-90",
                getTireColorClass(tires.front_left),
                selectedWheel === 'front_left' ? "stroke-ink-950 dark:stroke-white stroke-3" : "stroke-2"
              )} />
              <text x="50" y="85" textAnchor="middle" className="fill-white font-bold text-[9px]">AV-G</text>
            </g>

            {/* Front Right Wheel */}
            <g className="cursor-pointer" onClick={() => setSelectedWheel('front_right')}>
              <rect x="135" y="55" width="30" height="50" rx="6" className={cn(
                "transition-all duration-200 hover:opacity-90",
                getTireColorClass(tires.front_right),
                selectedWheel === 'front_right' ? "stroke-ink-950 dark:stroke-white stroke-3" : "stroke-2"
              )} />
              <text x="150" y="85" textAnchor="middle" className="fill-white font-bold text-[9px]">AV-D</text>
            </g>

            {/* Rear Left Wheel */}
            <g className="cursor-pointer" onClick={() => setSelectedWheel('rear_left')}>
              <rect x="35" y="175" width="30" height="50" rx="6" className={cn(
                "transition-all duration-200 hover:opacity-90",
                getTireColorClass(tires.rear_left),
                selectedWheel === 'rear_left' ? "stroke-ink-950 dark:stroke-white stroke-3" : "stroke-2"
              )} />
              <text x="50" y="205" textAnchor="middle" className="fill-white font-bold text-[9px]">AR-G</text>
            </g>

            {/* Rear Right Wheel */}
            <g className="cursor-pointer" onClick={() => setSelectedWheel('rear_right')}>
              <rect x="135" y="175" width="30" height="50" rx="6" className={cn(
                "transition-all duration-200 hover:opacity-90",
                getTireColorClass(tires.rear_right),
                selectedWheel === 'rear_right' ? "stroke-ink-950 dark:stroke-white stroke-3" : "stroke-2"
              )} />
              <text x="150" y="205" textAnchor="middle" className="fill-white font-bold text-[9px]">AR-D</text>
            </g>

            {/* Spare Wheel (Secours) at the trunk */}
            <g className="cursor-pointer" onClick={() => setSelectedWheel('spare')}>
              <rect x="85" y="235" width="30" height="40" rx="6" className={cn(
                "transition-all duration-200 hover:opacity-90",
                getTireColorClass(tires.spare),
                selectedWheel === 'spare' ? "stroke-ink-950 dark:stroke-white stroke-3" : "stroke-2"
              )} />
              <text x="100" y="260" textAnchor="middle" className="fill-white font-bold text-[8px]">SEC</text>
            </g>
          </svg>
        </div>

        <div className="flex gap-4 text-xs font-semibold mt-4">
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" /> Conforme (&gt; 3mm)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block" /> Usure modérée (2-3mm)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-red-500 inline-block" /> Seuil d'alerte (&lt; 1.6mm)</span>
        </div>
      </div>

      {/* Editor Column 3 */}
      <div className="card p-5">
        <h3 className="font-display font-bold text-sm text-ink-900 dark:text-white border-b border-ink-200/60 dark:border-ink-800/60 pb-2.5 mb-4">
          Paramètres du pneu
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Position sélectionnée</label>
            <input type="text" className="input bg-ink-50 dark:bg-ink-950" value={TIRE_LABELS[selectedWheel]} disabled />
          </div>

          <div>
            <label className="label">Marque / Modèle du pneu</label>
            <input type="text" className="input" value={brand} onChange={e => setBrand(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pression (bar)</label>
              <input type="number" step="0.1" className="input" value={pressure} onChange={e => setPressure(e.target.value)} required />
            </div>
            <div>
              <label className="label">Gomme restante (mm)</label>
              <input type="number" step="0.1" className="input" value={depth} onChange={e => setDepth(e.target.value)} required />
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="w-full">Enregistrer les mesures</Button>
          </div>
        </form>

        {/* Diagnosis Card */}
        <div className="mt-6 border-t border-ink-100 dark:border-ink-800 pt-4">
          <h4 className="font-bold text-xs text-ink-900 dark:text-white mb-2">Diagnostic de sécurité</h4>
          <div className="space-y-2 text-xs">
            {getTireStatus(tires[selectedWheel]) === 'critical' ? (
              <div className="p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-200/40 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-medium">
                ⚠️ Alerte Critique : Ce pneu est en dessous de la limite légale d'usure (1.6 mm) ou présente un défaut majeur de pression. Un changement immédiat est requis !
              </div>
            ) : getTireStatus(tires[selectedWheel]) === 'warning' ? (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/40 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl font-medium">
                ⚠️ Avertissement : Usure modérée détectée ou pression hors plage recommandée. Prévoyez une rotation ou une remise à niveau.
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/40 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-medium">
                ✅ Pneu Conforme : Les mesures de gomme et de pression sont optimales pour un roulage en toute sécurité.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

