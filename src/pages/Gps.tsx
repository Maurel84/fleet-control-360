import { useState, useMemo, useEffect } from 'react';
import { MapPin, Plus, Trash2, Radio, Battery, Activity, Satellite, AlertTriangle, ShieldAlert } from 'lucide-react';
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
import { StatCard } from '../components/StatCard';
import { Card, CardHeader, Badge } from '../components/Card';
import { GpsMap } from '../components/GpsMap';
import { formatDateTime } from '../lib/format';
import { cn } from '../lib/cn';
import type { GpsPosition, GpsDevice } from '../lib/types';

// Formule de Haversine pour calculer la distance géographique en mètres (Abidjan)
function getDistanceFromCenter(lat: number, lng: number): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const lat1 = lat * Math.PI / 180;
  const lat2 = 5.3600 * Math.PI / 180;
  const deltaLat = (5.3600 - lat) * Math.PI / 180;
  const deltaLng = (-4.0083 - lng) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance en mètres
}

// Fonction pour jouer un bip d'alerte double strident avec l'API Web Audio native
const playAlarmSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playBeep = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      osc.start(time);
      osc.stop(time + duration);
    };
    
    playBeep(ctx.currentTime, 880, 0.15);
    playBeep(ctx.currentTime + 0.2, 880, 0.15);
  } catch (e) {
    console.error("Impossible de lancer l'alarme sonore:", e);
  }
};

export function GpsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: positions, loading, refetch } = useQuery<GpsPosition>(
    'gps_positions', '*, vehicle:vehicles(*)', { order: ['recorded_at', { ascending: false }], limit: 50 },
  );
  const { data: devices } = useQuery<GpsDevice>('gps_devices', '*, vehicle:vehicles(*)', { order: ['provider', { ascending: true }] });
  const { data: vehicles } = useVehicles();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_id: '', latitude: '', longitude: '', speed: '', is_demo: 'true' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GpsPosition | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // ID de la dernière alerte déclenchée pour éviter les répétitions sonores
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);

  const activeDevices = (devices ?? []).filter((d) => d.is_active).length;
  const demoPositions = (positions ?? []).filter((p) => p.is_demo).length;

  // Filtrer pour n'afficher que la dernière position de chaque véhicule sur la carte
  const latestPositions = useMemo(() => {
    if (!positions) return [];
    const seen = new Set<string>();
    const unique: GpsPosition[] = [];
    positions.forEach((p) => {
      if (!seen.has(p.vehicle_id)) {
        seen.add(p.vehicle_id);
        unique.push(p);
      }
    });
    return unique;
  }, [positions]);

  // Détecter et filtrer les alertes actives récentes (infractions hors zone et survitesse)
  const activeAlerts = useMemo(() => {
    if (!positions) return [];
    return positions
      .map((pos) => {
        const distance = getDistanceFromCenter(pos.latitude, pos.longitude);
        const isOutOfBounds = distance > 25000;
        const isOverspeed = pos.speed !== null && pos.speed > 120;
        return {
          ...pos,
          isOutOfBounds,
          isOverspeed,
          distance,
        };
      })
      .filter((pos) => pos.isOutOfBounds || pos.isOverspeed)
      .slice(0, 8); // Garder les 8 infractions les plus récentes
  }, [positions]);

  // Déclencher le son et la notification visuelle lorsqu'une nouvelle alerte arrive
  useEffect(() => {
    if (activeAlerts.length > 0) {
      const newest = activeAlerts[0];
      if (newest.id !== lastAlertId) {
        setLastAlertId(newest.id);
        playAlarmSound();
        const typeInfraction = newest.isOutOfBounds && newest.isOverspeed
          ? 'Sortie de Zone & Survitesse'
          : newest.isOutOfBounds
          ? 'Sortie de Zone (Hors Abidjan)'
          : 'Excès de Vitesse';
        
        toast(
          `🚨 ALERTE SÉCURITÉ : ${newest.vehicle ? `${newest.vehicle.brand} ${newest.vehicle.model}` : 'Véhicule'} en infraction : ${typeInfraction} !`,
          'error'
        );
      }
    }
  }, [activeAlerts, lastAlertId, toast]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.vehicle_id || !form.latitude || !form.longitude) { toast('Véhicule et coordonnées sont obligatoires.', 'error'); return; }
    setSaving(true);
    
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    const speedVal = form.speed ? parseFloat(form.speed) : null;

    const payload = {
      organization_id: profile.organization_id,
      vehicle_id: form.vehicle_id,
      latitude: lat, 
      longitude: lng,
      speed: speedVal,
      is_demo: form.is_demo === 'true',
    };

    // Insérer en base de données
    const { error } = await supabase.from('gps_positions').insert(payload);
    setSaving(false);
    
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Position enregistrée.', 'success'); 
      setModalOpen(false); 
      refetch(); 
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('gps_positions').delete().eq('id', deleteTarget.id);
    if (error) toast(error.message, 'error');
    else { toast('Position supprimée.', 'success'); refetch(); }
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<GpsPosition>[] = [
    {
      key: 'vehicle', header: 'Véhicule',
      render: (p) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{p.vehicle ? `${p.vehicle.brand} ${p.vehicle.model}` : '—'}</span>
        </div>
      ),
    },
    { key: 'coords', header: 'Coordonnées', render: (p) => <span className="text-sm font-mono text-ink-600 dark:text-ink-300">{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</span> },
    { key: 'speed', header: 'Vitesse', render: (p) => <span className="text-sm">{p.speed !== null ? `${p.speed} km/h` : '—'}</span> },
    { key: 'time', header: 'Enregistré le', sortable: true, sortValue: (p) => p.recorded_at, render: (p) => <span className="text-sm">{formatDateTime(p.recorded_at)}</span> },
    {
      key: 'demo', header: 'Type',
      render: (p) => p.is_demo ? <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Donnée démo</Badge> : <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Temps réel</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setDeleteTarget(p)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Suivi GPS" subtitle="Géolocalisation des véhicules" icon={<MapPin className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>Nouvelle position</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Positions" value={(positions ?? []).length} color="blue" icon={<MapPin className="w-5 h-5" />} />
        <StatCard label="Boîtiers actifs" value={activeDevices} hint={`${(devices ?? []).length} au total`} color="emerald" icon={<Radio className="w-5 h-5" />} />
        <StatCard label="Données démo" value={demoPositions} color="amber" icon={<Activity className="w-5 h-5" />} />
        <StatCard label="Véhicules suivis" value={new Set((positions ?? []).map((p) => p.vehicle_id)).size} color="indigo" icon={<Satellite className="w-5 h-5" />} />
      </div>

      {/* Carte GPS Interactive */}
      <GpsMap 
        positions={latestPositions} 
        selectedVehicleId={selectedVehicleId} 
        subtitle="Zone d'Abidjan (cercle de 25 km) sous surveillance Geofencing"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Colonne de gauche (2/3) : Boîtiers + Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Devices list */}
          {(devices ?? []).length > 0 && (
            <Card>
              <CardHeader title="Boîtiers GPS" subtitle={`${(devices ?? []).length} boîtier(s) installé(s)`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5 pt-0">
                {(devices ?? []).map((d) => (
                  <div key={d.id} className="p-3 rounded-lg border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Radio className={cn('w-4 h-4', d.is_active ? 'text-emerald-500' : 'text-ink-400')} />
                        <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{d.provider}</span>
                      </div>
                      <span className={cn('badge', d.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400')}>{d.is_active ? 'Actif' : 'Inactif'}</span>
                    </div>
                    <p className="text-xs text-ink-500 font-mono">IMEI: {d.imei || '—'}</p>
                    <p className="text-xs text-ink-500">Véhicule: {d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model}` : 'Non assigné'}</p>
                    {d.battery_level !== null && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-ink-400">
                        <Battery className="w-3 h-3" /> {d.battery_level}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <DataTable columns={columns} rows={positions ?? []} rowKey={(p) => p.id} loading={loading}
            searchKeys={(p) => `${p.vehicle?.brand || ''} ${p.vehicle?.model || ''}`}
            emptyMessage="Aucune position GPS" emptyHint="Les positions GPS apparaîtront ici."
            onRowClick={(p) => setSelectedVehicleId(p.vehicle_id)} />
        </div>

        {/* Colonne de droite (1/3) : Panneau de contrôle des Alertes de Sécurité */}
        <div className="space-y-6">
          <Card className="border-red-200/60 dark:border-red-950/40 bg-red-50/10 dark:bg-red-950/5">
            <div className="px-5 py-4 border-b border-red-100 dark:border-red-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <h3 className="font-display font-bold text-sm">Alertes de Sécurité Direct</h3>
              </div>
              {activeAlerts.length > 0 && (
                <span className="badge bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-bold text-[9px] animate-pulse">
                  {activeAlerts.length} ACTIVES
                </span>
              )}
            </div>

            <div className="p-4 space-y-3">
              {activeAlerts.length > 0 ? (
                activeAlerts.map((alt) => (
                  <div 
                    key={alt.id} 
                    onClick={() => setSelectedVehicleId(alt.vehicle_id)}
                    className="p-3 rounded-lg border border-red-200/40 dark:border-red-900/30 bg-white dark:bg-ink-900 hover:border-red-400 dark:hover:border-red-600 transition cursor-pointer flex gap-3 group"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink-900 dark:text-white truncate">
                        {alt.vehicle ? `${alt.vehicle.brand} ${alt.vehicle.model}` : 'Véhicule'}
                      </p>
                      <div className="text-[10px] text-ink-500 space-y-0.5 mt-1 font-semibold">
                        {alt.isOutOfBounds && (
                          <p className="text-red-600 dark:text-red-400">
                            • Hors-Zone (Dist: ${(alt.distance / 1000).toFixed(1)} km)
                          </p>
                        )}
                        {alt.isOverspeed && (
                          <p className="text-orange-500">
                            • Survitesse : {alt.speed} km/h
                          </p>
                        )}
                      </div>
                      <p className="text-[9px] text-ink-400 mt-2">{formatDateTime(alt.recorded_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-ink-400 flex flex-col items-center">
                  <Activity className="w-8 h-8 text-ink-300 mb-2" />
                  <p className="text-xs">Aucune infraction de sécurité enregistrée</p>
                  <p className="text-[10px] text-ink-400 mt-1">Zone et vitesses normales</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle position GPS" size="md"
        footer={<><button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Véhicule" required>
              <Select 
                options={(vehicles ?? []).map((v) => ({ value: v.id, label: `${v.brand} ${v.model} (${v.registration || '—'})` }))} 
                value={form.vehicle_id} 
                onChange={(e) => set('vehicle_id', e.target.value)} 
              />
            </FormField>
          </div>
          <FormField label="Latitude" required>
            <input type="number" step="any" className="input" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder="5.3600" />
          </FormField>
          <FormField label="Longitude" required>
            <input type="number" step="any" className="input" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="-4.0083" />
          </FormField>
          <FormField label="Vitesse (km/h)">
            <input type="number" className="input" value={form.speed} onChange={(e) => set('speed', e.target.value)} placeholder="80" />
          </FormField>
          <FormField label="Type de données">
            <Select options={[{ value: 'true', label: 'Donnée démo' }, { value: 'false', label: 'Temps réel' }]} value={form.is_demo} onChange={(e) => set('is_demo', e.target.value)} />
          </FormField>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={doDelete}
        title="Supprimer la position" message="Supprimer cette position GPS ?" confirmLabel="Supprimer" danger />
    </div>
  );
}
