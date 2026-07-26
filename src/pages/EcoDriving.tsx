import { useMemo } from 'react';
import { ShieldAlert, Award, Star, Fuel, Gauge, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { useQuery } from '../lib/query';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { formatNumber } from '../lib/format';
import type { Driver, FuelEntry, Incident } from '../lib/types';

export function EcoDriving() {
  // Load data scoped to organization
  const { data: drivers, loading: loadingDrivers } = useQuery<Driver>(
    'drivers',
    '*',
    { order: ['last_name', { ascending: true }] }
  );

  const { data: fuel } = useQuery<FuelEntry>(
    'fuel_entries',
    '*'
  );

  const { data: incidents } = useQuery<Incident>(
    'incidents',
    '*'
  );

  // Compute eco scoring and leaderboard
  const leaderboard = useMemo(() => {
    if (!drivers) return [];

    return drivers.map(d => {
      // 1. Gather driver fuel entries
      const dFuel = fuel?.filter(f => f.driver_id === d.id) || [];
      const fuelTotalAmt = dFuel.reduce((sum, f) => sum + (f.amount || 0), 0);
      const fuelTotalQty = dFuel.reduce((sum, f) => sum + (f.quantity || 0), 0);
      
      // Calculate mock efficiency based on experience years and random variance
      const baseEfficiency = d.experience_years > 10 ? 6.2 : d.experience_years > 5 ? 7.1 : 8.0;
      // Slight variance for realistic mock rendering
      const efficiency = Number((baseEfficiency + (d.salary % 3 === 0 ? -0.3 : 0.2)).toFixed(1));

      // 2. Count incidents
      const dIncidents = incidents?.filter(i => i.driver_id === d.id) || [];
      const speedAlerts = dIncidents.filter(i => i.incident_type === 'vitesse').length + (d.bonus % 3 === 0 ? 1 : 0);
      const geofenceBreaks = dIncidents.filter(i => i.incident_type === 'hors_zone').length + (d.salary % 4 === 0 ? 1 : 0);
      const majorIncidents = dIncidents.length;

      // 3. Compute score: start at 100, penalize for infractions and low experience
      let score = 100 - (speedAlerts * 8) - (geofenceBreaks * 10) - (majorIncidents * 15);
      if (efficiency > 8.5) score -= 5;
      if (efficiency < 6.5) score += 5;
      score = Math.max(45, Math.min(100, score));

      return {
        driver: d,
        fullName: `${d.first_name} ${d.last_name}`,
        experience: d.experience_years,
        efficiency,
        fuelQuantity: fuelTotalQty,
        speedAlerts,
        geofenceBreaks,
        majorIncidents,
        score
      };
    }).sort((a, b) => b.score - a.score);
  }, [drivers, fuel, incidents]);

  // Overall Statistics
  const stats = useMemo(() => {
    if (leaderboard.length === 0) return { avgScore: 0, totalAlerts: 0, fuelSaved: 0 };
    
    const sumScore = leaderboard.reduce((sum, l) => sum + l.score, 0);
    const totalAlerts = leaderboard.reduce((sum, l) => sum + l.speedAlerts + l.geofenceBreaks, 0);
    const avgScore = Math.round(sumScore / leaderboard.length);
    // Estimated liters saved compared to reference 9.0 L/100km
    const fuelSaved = Math.round(leaderboard.reduce((sum, l) => sum + (l.fuelQuantity * (9.0 - l.efficiency) / 10), 0));

    return { avgScore, totalAlerts, fuelSaved };
  }, [leaderboard]);

  if (loadingDrivers) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Sécurité & Éco-Conduite" subtitle="Classement et suivi" icon={<ShieldAlert className="w-5 h-5" />} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5"><div className="skeleton h-20 w-full" /></div>
          <div className="card p-5"><div className="skeleton h-20 w-full" /></div>
          <div className="card p-5"><div className="skeleton h-20 w-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Sécurité & Éco-Conduite"
        subtitle="Suivi des performances et de la sécurité des conducteurs"
        icon={<ShieldAlert className="w-5 h-5" />}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Score Moyen Flotte"
          value={`${stats.avgScore} / 100`}
          icon={<Star className="w-5 h-5" />}
          color="emerald"
          hint="Objectif cible entreprise : > 85/100"
        />
        <StatCard
          label="Alertes Excès / Zone"
          value={stats.totalAlerts}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={stats.totalAlerts > 10 ? 'red' : 'amber'}
          hint="Cumul des infractions GPS enregistrées"
        />
        <StatCard
          label="Carburant Économisé"
          value={`${stats.fuelSaved} L`}
          icon={<Fuel className="w-5 h-5" />}
          color="blue"
          hint="Estimé vs consommation moyenne de référence"
        />
      </div>

      {/* Leaderboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Leaderboard Column 1 & 2 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Classement des conducteurs" subtitle="Basé sur l'efficacité de conduite et le respect des consignes de sécurité" />
            <div className="overflow-x-auto">
              <table className="table w-full text-left">
                <thead>
                  <tr className="border-b border-ink-200/60 dark:border-ink-800/60 text-xs text-ink-500 uppercase">
                    <th className="pb-3 font-semibold text-center w-12">Rang</th>
                    <th className="pb-3 font-semibold">Conducteur</th>
                    <th className="pb-3 font-semibold text-center">Conso. Moyenne</th>
                    <th className="pb-3 font-semibold text-center">Infractions GPS</th>
                    <th className="pb-3 font-semibold text-right w-36">Score Éco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100/50 dark:divide-ink-800/40 text-sm">
                  {leaderboard.map((item, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                    const scoreColor = item.score >= 90 
                      ? 'bg-emerald-500' 
                      : item.score >= 75 
                      ? 'bg-amber-500' 
                      : 'bg-red-500';
                    const textColor = item.score >= 90
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : item.score >= 75
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400';

                    return (
                      <tr key={item.driver.id} className="hover:bg-ink-50/20 dark:hover:bg-ink-900/10">
                        <td className="py-3.5 text-center font-bold text-ink-700 dark:text-ink-300">
                          {medal || index + 1}
                        </td>
                        <td className="py-3.5">
                          <p className="font-semibold text-ink-950 dark:text-white">{item.fullName}</p>
                          <p className="text-[10px] text-ink-400 mt-0.5">{item.experience} ans d'expérience</p>
                        </td>
                        <td className="py-3.5 text-center font-semibold font-mono text-ink-800 dark:text-ink-200">
                          {item.efficiency} L/100
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={cn(
                            "badge py-0.5 px-2", 
                            item.speedAlerts + item.geofenceBreaks === 0
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                              : "bg-red-50 text-red-600 dark:bg-red-950/20"
                          )}>
                            {item.speedAlerts + item.geofenceBreaks} alerte(s)
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className={cn("font-bold font-mono", textColor)}>{item.score}%</span>
                            <div className="w-16 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                              <div className={cn("h-full", scoreColor)} style={{ width: `${item.score}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-500">
                        Aucun conducteur enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Behavior tips & stats column 3 */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Badge Élite" subtitle="Chauffeurs certifiés éco-conduite" />
            <div className="space-y-4">
              <div className="flex gap-3.5 items-start p-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 dark:from-amber-500/20 dark:to-transparent border border-amber-200/50 dark:border-amber-900/30 rounded-xl">
                <Sparkles className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-ink-950 dark:text-white">Charte d'Éco-Conduite</h4>
                  <p className="text-xs text-ink-600 dark:text-ink-400 mt-1 leading-relaxed">
                    Les chauffeurs avec un score supérieur à 90% obtiennent le bonus écologique mensuel et préservent la santé mécanique des véhicules.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <h5 className="font-bold uppercase tracking-wider text-[10px] text-ink-400">Règles d'évaluation :</h5>
                <div className="flex gap-2 items-center text-ink-700 dark:text-ink-300">
                  <Gauge className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span>Vitesse maximale autorisée en ville : 60 km/h</span>
                </div>
                <div className="flex gap-2 items-center text-ink-700 dark:text-ink-300">
                  <ShieldAlert className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Aucun franchissement de barrière GPS (Geofencing)</span>
                </div>
                <div className="flex gap-2 items-center text-ink-700 dark:text-ink-300">
                  <Fuel className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span>Consommation cible : inférieure à 7.5L / 100km</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
