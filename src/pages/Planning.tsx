import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Info, Car, User, MapPin } from 'lucide-react';
import { useQuery } from '../lib/query';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { formatCurrency, formatDate } from '../lib/format';
import { cn } from '../lib/cn';
import type { Vehicle, Rental, Mission, MaintenanceRequest } from '../lib/types';

export function Planning() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load data
  const { data: vehicles, loading: loadingVehicles } = useQuery<Vehicle>(
    'vehicles',
    '*',
    { order: ['brand', { ascending: true }] }
  );
  
  const { data: rentals } = useQuery<Rental>(
    'rentals',
    '*, client:clients(*), driver:drivers(*)'
  );

  const { data: missions } = useQuery<Mission>(
    'missions',
    '*, client:clients(*), primary_driver:drivers(*)'
  );

  const { data: maintenance } = useQuery<MaintenanceRequest>(
    'maintenance_requests',
    '*'
  );

  // Modal / Detail drawer state
  const [selectedItem, setSelectedItem] = useState<{
    type: 'rental' | 'mission' | 'maintenance';
    title: string;
    client?: string;
    driver?: string;
    start: string;
    end: string;
    destination?: string;
    status: string;
    cost?: number;
  } | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Get French month label
  const monthLabel = useMemo(() => {
    return currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Days in month
  const daysInMonth = useMemo(() => {
    const total = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        dayNum: i + 1,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        label: date.toLocaleDateString('fr-FR', { weekday: 'narrow' }),
      };
    });
  }, [year, month]);

  // Map occupied periods for each vehicle
  const vehiclePeriods = useMemo(() => {
    if (!vehicles) return {};
    
    const mapping: Record<string, {
      day: number;
      type: 'rental' | 'mission' | 'maintenance';
      raw: any;
    }[]> = {};

    vehicles.forEach(v => {
      mapping[v.id] = [];
    });

    // Populate rentals
    rentals?.forEach(r => {
      if (!r.vehicle_id || !r.start_datetime) return;
      const start = new Date(r.start_datetime);
      const end = r.actual_return_datetime 
        ? new Date(r.actual_return_datetime) 
        : r.planned_return_datetime 
        ? new Date(r.planned_return_datetime) 
        : new Date(start.getTime() + 24*3600*1000);

      // Verify intersection with current month
      for (let d = 1; d <= daysInMonth.length; d++) {
        const checkDate = new Date(year, month, d, 12, 0, 0);
        if (checkDate >= start && checkDate <= end) {
          mapping[r.vehicle_id]?.push({
            day: d,
            type: 'rental',
            raw: r
          });
        }
      }
    });

    // Populate missions
    missions?.forEach(m => {
      if (!m.vehicle_id || !m.start_datetime) return;
      const start = new Date(m.start_datetime);
      const end = m.planned_end_datetime 
        ? new Date(m.planned_end_datetime) 
        : new Date(start.getTime() + 12*3600*1000);

      for (let d = 1; d <= daysInMonth.length; d++) {
        const checkDate = new Date(year, month, d, 12, 0, 0);
        if (checkDate >= start && checkDate <= end) {
          // Keep rental prioritized over mission in visualization
          if (!mapping[m.vehicle_id]?.some(p => p.day === d)) {
            mapping[m.vehicle_id]?.push({
              day: d,
              type: 'mission',
              raw: m
            });
          }
        }
      }
    });

    // Populate maintenance
    maintenance?.forEach(req => {
      if (!req.vehicle_id || req.status === 'completed' || req.status === 'rejected') return;
      // Assume maintenance starts from created_at and lasts 2 days if in_progress, else 1 day
      const start = new Date(req.created_at);
      const daysCount = req.status === 'in_progress' ? 3 : 1;
      const end = new Date(start.getTime() + daysCount * 24 * 3600 * 1000);

      for (let d = 1; d <= daysInMonth.length; d++) {
        const checkDate = new Date(year, month, d, 12, 0, 0);
        if (checkDate >= start && checkDate <= end) {
          if (!mapping[req.vehicle_id]?.some(p => p.day === d)) {
            mapping[req.vehicle_id]?.push({
              day: d,
              type: 'maintenance',
              raw: req
            });
          }
        }
      }
    });

    return mapping;
  }, [vehicles, rentals, missions, maintenance, daysInMonth, year, month]);

  const handleCellClick = (type: 'rental' | 'mission' | 'maintenance', raw: any) => {
    if (type === 'rental') {
      setSelectedItem({
        type: 'rental',
        title: `Location - Réf: ${raw.reference || 'LOC'}`,
        client: raw.client?.name || 'Client particulier',
        driver: raw.driver ? `${raw.driver.first_name} ${raw.driver.last_name}` : 'Sans chauffeur',
        start: raw.start_datetime,
        end: raw.planned_return_datetime,
        destination: raw.destination || 'Abidjan',
        status: raw.status === 'in_progress' ? 'En cours' : raw.status === 'returned' ? 'Restitué' : 'Planifié',
        cost: raw.total_amount
      });
    } else if (type === 'mission') {
      setSelectedItem({
        type: 'mission',
        title: `Mission - Réf: ${raw.reference || 'MIS'}`,
        client: raw.client?.name || 'Interne',
        driver: raw.primary_driver ? `${raw.primary_driver.first_name} ${raw.primary_driver.last_name}` : 'Non assigné',
        start: raw.start_datetime,
        end: raw.planned_end_datetime,
        destination: raw.destination || 'Zone d\'exploitation',
        status: raw.status === 'in_progress' ? 'En cours' : 'Prévue',
        cost: raw.billed_amount
      });
    } else if (type === 'maintenance') {
      setSelectedItem({
        type: 'maintenance',
        title: `Maintenance - Réf: ${raw.reference || 'MAINT'}`,
        client: `Garage / Panne : ${raw.issue_type}`,
        driver: `Demandeur : ${raw.requested_by || 'Gestionnaire'}`,
        start: raw.created_at,
        end: 'En cours',
        destination: raw.description,
        status: raw.status === 'in_progress' ? 'Au garage' : 'En attente',
        cost: raw.estimated_cost
      });
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Planning de la flotte"
        subtitle="Visualisation de l'occupation temporelle des véhicules"
        icon={<Calendar className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="btn btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-semibold text-sm capitalize min-w-[120px] text-center">{monthLabel}</span>
            <button onClick={handleNextMonth} className="btn btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Table layout of timeline */}
        <div className="xl:col-span-3 card p-4 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-blue-500 dark:bg-blue-600 inline-block" /> Location client</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-indigo-500 dark:bg-indigo-600 inline-block" /> Mission Fret / Escorte</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-orange-500 dark:bg-orange-600 inline-block" /> Maintenance</span>
            </div>
          </div>

          <div className="overflow-x-auto select-none">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-bold text-ink-500 sticky left-0 bg-white dark:bg-ink-900 z-10 w-44 border-b border-ink-200 dark:border-ink-800">Véhicule</th>
                  {daysInMonth.map(d => (
                    <th
                      key={d.dayNum}
                      className={cn(
                        "py-2 text-center text-[10px] font-bold border-b border-ink-200 dark:border-ink-800 min-w-[26px]",
                        d.isWeekend ? "bg-ink-50/50 dark:bg-ink-900/50 text-ink-400" : "text-ink-500"
                      )}
                    >
                      <p>{d.label}</p>
                      <p className="text-xs mt-0.5">{d.dayNum}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100/50 dark:divide-ink-800/40">
                {vehicles?.map(v => {
                  const periods = vehiclePeriods[v.id] || [];
                  return (
                    <tr key={v.id} className="hover:bg-ink-50/20 dark:hover:bg-ink-900/10">
                      <td className="py-2.5 px-3 text-xs font-semibold sticky left-0 bg-white dark:bg-ink-900 z-10 shadow-sm border-r border-ink-100 dark:border-ink-800/50">
                        <p className="truncate text-ink-900 dark:text-white">{v.brand} {v.model}</p>
                        <p className="text-[10px] text-ink-400 mt-0.5 font-mono">{v.registration || '—'}</p>
                      </td>
                      {daysInMonth.map(d => {
                        const cell = periods.find(p => p.day === d.dayNum);
                        
                        return (
                          <td
                            key={d.dayNum}
                            className={cn(
                              "p-1 border-r border-ink-100/40 dark:border-ink-800/20 text-center relative h-10",
                              d.isWeekend && "bg-ink-50/20 dark:bg-ink-900/20"
                            )}
                          >
                            {cell && (
                              <button
                                onClick={() => handleCellClick(cell.type, cell.raw)}
                                className={cn(
                                  "w-full h-full rounded transition-transform active:scale-95 shadow-sm flex items-center justify-center cursor-pointer",
                                  cell.type === 'rental' 
                                    ? "bg-blue-500 hover:bg-blue-600 text-white" 
                                    : cell.type === 'mission'
                                    ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                                    : "bg-orange-500 hover:bg-orange-600 text-white"
                                )}
                                title={cell.type === 'rental' ? 'Location' : cell.type === 'mission' ? 'Mission' : 'Maintenance'}
                              >
                                <span className="text-[9px] font-bold">
                                  {cell.type === 'rental' ? 'L' : cell.type === 'mission' ? 'M' : 'G'}
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {vehicles?.length === 0 && (
                  <tr>
                    <td colSpan={daysInMonth.length + 1} className="py-8 text-center text-xs text-ink-400">
                      Aucun véhicule configuré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div className="card p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-ink-900 dark:text-white border-b border-ink-200/60 dark:border-ink-800/60 pb-2.5 mb-4">
              Détails de l'occupation
            </h3>
            {selectedItem ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                    {selectedItem.type === 'rental' ? 'Contrat Location' : selectedItem.type === 'mission' ? 'Mission Fret' : 'Maintenance'}
                  </p>
                  <h4 className="font-bold text-sm text-ink-900 dark:text-white mt-1">
                    {selectedItem.title}
                  </h4>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex gap-2.5 items-start">
                    <Car className="w-4 h-4 text-ink-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-ink-400 font-semibold">Tiers associé</p>
                      <p className="font-bold text-ink-800 dark:text-ink-200 mt-0.5">{selectedItem.client}</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <User className="w-4 h-4 text-ink-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-ink-400 font-semibold">Chauffeur assigné</p>
                      <p className="font-bold text-ink-800 dark:text-ink-200 mt-0.5">{selectedItem.driver}</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <MapPin className="w-4 h-4 text-ink-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-ink-400 font-semibold">Destination / Tâche</p>
                      <p className="font-bold text-ink-800 dark:text-ink-200 mt-0.5">{selectedItem.destination}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink-100 dark:border-ink-800">
                    <div>
                      <p className="text-ink-400 font-semibold">Début</p>
                      <p className="font-bold text-ink-700 dark:text-ink-300 mt-0.5">{formatDate(selectedItem.start)}</p>
                    </div>
                    <div>
                      <p className="text-ink-400 font-semibold">Fin prévue</p>
                      <p className="font-bold text-ink-700 dark:text-ink-300 mt-0.5">
                        {selectedItem.end ? formatDate(selectedItem.end) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2.5 flex justify-between items-center">
                    <span className="badge bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                      {selectedItem.status}
                    </span>
                    {selectedItem.cost && (
                      <span className="font-bold text-sm text-ink-950 dark:text-white">
                        {formatCurrency(selectedItem.cost)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Info className="w-8 h-8 text-ink-300 dark:text-ink-700 mb-2" />
                <p className="text-xs text-ink-500 max-w-[200px]">
                  Cliquez sur un créneau de planning de couleur pour afficher les détails du contrat ou de la mission.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-ink-200/60 dark:border-ink-800/60 pt-4 text-xs text-ink-500">
            💡 *Le planning est mis à jour en temps réel à chaque fois qu'une location ou une mission est enregistrée ou modifiée.*
          </div>
        </div>
      </div>
    </div>
  );
}
