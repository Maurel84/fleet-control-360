import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Car, ArrowLeft, FileText, Fuel, Wrench, MapPin, Calendar, Gauge,
  Palette, Zap, Users, Building2, Wallet,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useSingle } from '../lib/query';
import { Card, CardHeader, StatusBadge } from '../components/Card';

import {
  VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, FUEL_TYPE_LABELS,
  VEHICLE_DOCUMENT_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS,
} from '../lib/labels';
import { formatCurrency, formatNumber, formatDate, formatDateTime, daysUntil } from '../lib/format';
import type { Vehicle, VehicleDocument, FuelEntry, MaintenanceRequest, GpsPosition } from '../lib/types';
import { cn } from '../lib/cn';
import { GpsMap } from '../components/GpsMap';

type Tab = 'overview' | 'documents' | 'fuel' | 'maintenance' | 'gps';

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
