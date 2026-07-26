import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { BarChart3, Wallet, Fuel, TrendingUp, Car, Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { formatCurrency, formatNumber } from '../lib/format';
import type { Vehicle, Invoice, Expense, FuelEntry, Rental, Mission } from '../lib/types';
import { cn } from '../lib/cn';

export function ReportsPage() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fuel, setFuel] = useState<FuelEntry[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'standard' | 'predictive'>('standard');

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    const f = (t: string) => supabase.from(t).select('*').eq('organization_id', orgId);
    Promise.all([
      f('vehicles'), 
      f('invoices'), 
      f('expenses'), 
      f('fuel_entries'),
      f('rentals'),
      f('missions')
    ]).then((res) => {
      if (!active) return;
      setVehicles((res[0].data as Vehicle[]) ?? []);
      setInvoices((res[1].data as Invoice[]) ?? []);
      setExpenses((res[2].data as Expense[]) ?? []);
      setFuel((res[3].data as FuelEntry[]) ?? []);
      setRentals((res[4].data as Rental[]) ?? []);
      setMissions((res[5].data as Mission[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [orgId]);

  const revenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.paid_amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalFuel = fuel.reduce((s, f) => s + f.amount, 0);
  const profit = revenue - totalExpenses;

  const monthlyData = useMemo(() => {
    const months: Record<string, { revenue: number; expenses: number }> = {};
    invoices.forEach((i) => {
      const m = (i.issue_date || '').slice(0, 7); if (!m) return;
      if (!months[m]) months[m] = { revenue: 0, expenses: 0 };
      months[m].revenue += i.paid_amount;
    });
    expenses.forEach((e) => {
      const m = (e.expense_date || '').slice(0, 7); if (!m) return;
      if (!months[m]) months[m] = { revenue: 0, expenses: 0 };
      months[m].expenses += e.amount;
    });
    return Object.entries(months).sort().slice(-12).map(([m, v]) => ({
      month: m.slice(5) + '/' + m.slice(2, 4), Revenus: v.revenue, Dépenses: v.expenses, Profit: v.revenue - v.expenses,
    }));
  }, [invoices, expenses]);

  const fuelByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    fuel.forEach((f) => { const m = (f.date || '').slice(0, 7); if (!m) return; months[m] = (months[m] ?? 0) + f.amount; });
    return Object.entries(months).sort().slice(-6).map(([m, v]) => ({ month: m.slice(5) + '/' + m.slice(2, 4), Carburant: v }));
  }, [fuel]);

  const vehicleStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicles.forEach((v) => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ status: k, count: v }));
  }, [vehicles]);

  // Calcul du Coût de Possession (TCO) et de la rentabilité par véhicule
  const vehicleTcoData = useMemo(() => {
    if (vehicles.length === 0) return [];
    
    return vehicles.map((v) => {
      // 1. Chiffre d'affaires (Locations associées + Missions associées)
      const vRentals = rentals.filter((r) => r.vehicle_id === v.id);
      const vMissions = missions.filter((m) => m.vehicle_id === v.id);
      
      const rentalRevenue = vRentals.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const missionRevenue = vMissions.reduce((sum, m) => sum + (m.billed_amount || 0), 0);
      const totalRev = rentalRevenue + missionRevenue;

      // 2. Charges Carburant
      const vFuel = fuel.filter((f) => f.vehicle_id === v.id);
      const fuelCost = vFuel.reduce((sum, f) => sum + (f.amount || 0), 0);

      // 3. Charges maintenance et autres dépenses
      const vExpenses = expenses.filter((e) => e.vehicle_id === v.id);
      const expenseCost = vExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Total coûts opérationnels
      const operationalCost = fuelCost + expenseCost;
      
      // Marge Nette opérationnelle
      const netMargin = totalRev - operationalCost;

      // Coût Total de Possession (TCO) = Prix d'achat + Coûts opérationnels
      const purchasePrice = v.purchase_price || 0;
      const tco = purchasePrice + operationalCost;

      // Coût au kilomètre (sur les coûts opérationnels)
      const mileage = v.current_mileage || 0;
      const costPerKm = mileage > 0 ? operationalCost / mileage : 0;

      // ROI opérationnel (%)
      const roi = operationalCost > 0 ? (totalRev / operationalCost) * 100 : 100;

      return {
        vehicle: v,
        totalRevenue: totalRev,
        fuelCost,
        expenseCost,
        operationalCost,
        netMargin,
        purchasePrice,
        tco,
        costPerKm,
        roi
      };
    }).sort((a, b) => b.netMargin - a.netMargin); // Trier par rentabilité nette décroissante
  }, [vehicles, rentals, missions, fuel, expenses]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Rapports" subtitle="Analyses et statistiques" icon={<BarChart3 className="w-5 h-5" />} />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5"><div className="skeleton h-20 w-full" /></div>)}
        </div>
        <div className="card p-5"><div className="skeleton h-64 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Rapports" subtitle="Analyses et statistiques de votre flotte" icon={<BarChart3 className="w-5 h-5" />} />

      {/* Tab Selector */}
      <div className="flex gap-1 mb-6 border-b border-ink-200/60 dark:border-ink-800/60">
        <button
          onClick={() => setSubTab('standard')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition',
            subTab === 'standard'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'
          )}
        >
          Rapports d'Activité
        </button>
        <button
          onClick={() => setSubTab('predictive')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-1.5',
            subTab === 'predictive'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'
          )}
        >
          <span>🔮 Analyses Prédictives IA</span>
        </button>
      </div>

      {subTab === 'standard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Revenus totaux" value={formatCurrency(revenue)} color="emerald" icon={<Wallet className="w-5 h-5" />} />
            <StatCard label="Dépenses totales" value={formatCurrency(totalExpenses)} color="amber" icon={<Wallet className="w-5 h-5" />} />
            <StatCard label="Coût carburant" value={formatCurrency(totalFuel)} color="red" icon={<Fuel className="w-5 h-5" />} />
            <StatCard label="Profit net" value={formatCurrency(profit)} color={profit >= 0 ? 'emerald' : 'red'} icon={<TrendingUp className="w-5 h-5" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader title="Revenus, dépenses et profit" subtitle="12 derniers mois" />
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-20" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dépenses" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Profit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </Card>

            <Card>
              <CardHeader title="Évolution du carburant" subtitle="6 derniers mois" />
              {fuelByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={fuelByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-20" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
                    <Line type="monotone" dataKey="Carburant" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-1">
              <CardHeader title="Répartition du parc par statut" />
              {vehicleStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={vehicleStatusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} className="dark:opacity-20" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </Card>

            {/* SECTION RENTABILITÉ & TCO PAR VÉHICULE (Tableau Métier) */}
            <Card className="lg:col-span-2">
              <CardHeader title="Rentabilité & TCO par Véhicule" subtitle="Trié par marge nette d'exploitation" />
              <div className="overflow-x-auto p-5 pt-0">
                <table className="table-base w-full text-xs">
                  <thead>
                    <tr>
                      <th>Véhicule</th>
                      <th className="text-right">Revenus</th>
                      <th className="text-right">Carburant</th>
                      <th className="text-right">Dépenses</th>
                      <th className="text-right">Marge Nette</th>
                      <th className="text-right">Coût / Km</th>
                      <th className="text-right">TCO Global</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleTcoData.length > 0 ? (
                      vehicleTcoData.map(({ vehicle, totalRevenue, fuelCost, expenseCost, netMargin, costPerKm, tco }) => (
                        <tr key={vehicle.id} className="hover:bg-ink-50/40 dark:hover:bg-ink-900/30">
                          <td className="font-semibold">
                            <div className="flex items-center gap-2">
                              <Car className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <div>
                                <span className="text-ink-800 dark:text-ink-100">{vehicle.brand} {vehicle.model}</span>
                                <span className="block text-[10px] text-ink-400 font-mono">{vehicle.registration || '—'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(totalRevenue)}</td>
                          <td className="text-right text-ink-500">{formatCurrency(fuelCost)}</td>
                          <td className="text-right text-ink-500">{formatCurrency(expenseCost)}</td>
                          <td className={`text-right font-bold ${netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {formatCurrency(netMargin)}
                          </td>
                          <td className="text-right font-mono font-medium text-ink-700 dark:text-ink-300">
                            {costPerKm > 0 ? `${formatNumber(Math.round(costPerKm))} F/km` : '0 F/km'}
                          </td>
                          <td className="text-right text-indigo-600 dark:text-indigo-400 font-semibold">{formatCurrency(tco)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-ink-400">Aucun véhicule disponible pour le calcul de rentabilité.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {subTab === 'predictive' && (
        <PredictiveTab vehicles={vehicles} fuel={fuel} expenses={expenses} invoices={invoices} />
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[250px] flex flex-col items-center justify-center text-ink-300 dark:text-ink-600">
      <TrendingUp className="w-10 h-10 mb-2" />
      <p className="text-sm">Pas assez de données</p>
    </div>
  );
}

interface PredictiveTabProps {
  vehicles: Vehicle[];
  fuel: FuelEntry[];
  expenses: Expense[];
  invoices: Invoice[];
}

function PredictiveTab({ vehicles, fuel, expenses, invoices }: PredictiveTabProps) {
  const [priceFactor, setPriceFactor] = useState(1.0);

  // 1. Calculate base monthly fuel expense
  const avgMonthlyFuel = useMemo(() => {
    if (fuel.length === 0) return 250000;
    const months = new Set(fuel.map(f => (f.date || '').slice(0, 7)));
    const totalAmt = fuel.reduce((sum, f) => sum + (f.amount || 0), 0);
    return Math.round(totalAmt / Math.max(1, months.size));
  }, [fuel]);

  const simulatedFuel = Math.round(avgMonthlyFuel * priceFactor);
  const diffFuel = simulatedFuel - avgMonthlyFuel;

  // 2. Calculate fleet depreciation (15% per year)
  const baseFleetValue = useMemo(() => {
    const total = vehicles.reduce((sum, v) => sum + (v.purchase_price || 0), 0);
    return total > 0 ? total : 45000000; // Fallback to 45M F CFA
  }, [vehicles]);

  const depreciationData = useMemo(() => {
    return [
      { period: 'Achat', Valeur: baseFleetValue },
      { period: '6 mois', Valeur: Math.round(baseFleetValue * 0.925) },
      { period: '12 mois', Valeur: Math.round(baseFleetValue * 0.85) },
      { period: '18 mois', Valeur: Math.round(baseFleetValue * 0.775) },
      { period: '24 mois', Valeur: Math.round(baseFleetValue * 0.70) },
    ];
  }, [baseFleetValue]);

  // 3. Fuel price trend projection data (3 months past, 3 months forecast)
  const fuelProjectionData = useMemo(() => {
    return [
      { name: 'M-2', Réel: avgMonthlyFuel, Prédiction: null },
      { name: 'M-1', Réel: avgMonthlyFuel, Prédiction: null },
      { name: 'M (En cours)', Réel: avgMonthlyFuel, Prédiction: avgMonthlyFuel },
      { name: 'M+1 (Prévu)', Réel: null, Prédiction: simulatedFuel },
      { name: 'M+2 (Prévu)', Réel: null, Prédiction: simulatedFuel },
      { name: 'M+3 (Prévu)', Réel: null, Prédiction: simulatedFuel },
    ];
  }, [avgMonthlyFuel, simulatedFuel]);

  // 4. Wear predictions based on mileage
  const wearPredictions = useMemo(() => {
    return vehicles.map(v => {
      const mileage = v.current_mileage || 0;
      let risk: 'low' | 'medium' | 'high' = 'low';
      let desc = 'Aucune intervention majeure prévue à court terme.';
      let component = 'Plaquettes standard';

      if (mileage > 90000) {
        risk = 'high';
        desc = 'Risque élevé d\'usure des amortisseurs et de l\'alternateur. Planifier diagnostic.';
        component = 'Suspensions & Courroie';
      } else if (mileage > 50000) {
        risk = 'medium';
        desc = 'Usure modérée. Prévoir vérification des disques de frein au prochain entretien.';
        component = 'Disques de frein';
      }

      return {
        vehicle: v,
        mileage,
        risk,
        desc,
        component
      };
    }).sort((a, b) => b.mileage - a.mileage);
  }, [vehicles]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Simulation Banner & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 card p-5 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm text-ink-950 dark:text-white mb-2">Simulateur Carburant</h4>
            <p className="text-xs text-ink-500 leading-relaxed mb-4">
              Ajustez le curseur pour simuler des variations de prix des carburants (essence / gasoil) sur le marché.
            </p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-ink-700 dark:text-ink-300 mb-1">
                  <span>Facteur Prix</span>
                  <span>{priceFactor >= 1.0 ? `+${Math.round((priceFactor - 1) * 100)}%` : `${Math.round((priceFactor - 1) * 100)}%`}</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  className="w-full accent-blue-600"
                  value={priceFactor}
                  onChange={e => setPriceFactor(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-ink-100 dark:border-ink-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-ink-500">Conso moyenne de base</span>
              <span className="font-semibold text-ink-800 dark:text-ink-200">{formatCurrency(avgMonthlyFuel)}</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-2">
              <span className="text-ink-500">Budget simulé</span>
              <span className="font-bold text-ink-900 dark:text-white">{formatCurrency(simulatedFuel)}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Variation Carburant Mensuelle"
            value={diffFuel === 0 ? 'Stable' : `${diffFuel > 0 ? '+' : ''}${formatCurrency(diffFuel)}`}
            icon={<Fuel className="w-5 h-5" />}
            color={diffFuel === 0 ? 'blue' : diffFuel > 0 ? 'red' : 'emerald'}
            hint="Impact budgétaire direct estimé"
          />
          <StatCard
            label="Dépréciation Flotte (12m)"
            value={`- ${formatCurrency(Math.round(baseFleetValue * 0.15))}`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="amber"
            hint="Perte de valeur résiduelle annuelle estimée"
          />
          <StatCard
            label="Véhicules à Risque Mécanique"
            value={wearPredictions.filter(w => w.risk === 'high').length}
            icon={<AlertTriangle className="w-5 h-5" />}
            color={wearPredictions.some(w => w.risk === 'high') ? 'red' : 'emerald'}
            hint="Kilométrage critique (> 90k km)"
          />
        </div>
      </div>

      {/* Projections Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Projection du Budget Carburant" subtitle="Historique réel vs prévision sur 3 mois sous fluctuation" />
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={fuelProjectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-20" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Réel" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
              <Line type="dashed" strokeDasharray="5 5" dataKey="Prédiction" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Perte de Valeur de la Flotte (Dépréciation)" subtitle="Valeur résiduelle sur 24 mois (Amortissement linéaire 15%/an)" />
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={depreciationData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-20" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="Valeur" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Mechanical Risks Leaderboard */}
      <Card>
        <CardHeader title="Plan de Maintenance Préventif (IA)" subtitle="Estimation de l'usure mécanique selon le kilométrage réel" />
        <div className="overflow-x-auto">
          <table className="table w-full text-left">
            <thead>
              <tr className="border-b border-ink-200/60 dark:border-ink-800/60 text-xs text-ink-500 uppercase">
                <th className="pb-3 font-semibold">Véhicule</th>
                <th className="pb-3 font-semibold text-center">Kilométrage</th>
                <th className="pb-3 font-semibold">Organe à Risque</th>
                <th className="pb-3 font-semibold">Statut Diagnostic / IA</th>
                <th className="pb-3 font-semibold text-right">Recommandation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100/50 dark:divide-ink-800/40 text-sm">
              {wearPredictions.map(({ vehicle, mileage, risk, desc, component }) => {
                return (
                  <tr key={vehicle.id} className="hover:bg-ink-50/20 dark:hover:bg-ink-900/10">
                    <td className="py-3.5 font-semibold text-ink-950 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-blue-500" />
                        <div>
                          <p>{vehicle.brand} {vehicle.model}</p>
                          <p className="text-[10px] text-ink-400 font-mono mt-0.5">{vehicle.registration || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-center font-bold font-mono text-ink-700 dark:text-ink-300">
                      {formatNumber(mileage)} km
                    </td>
                    <td className="py-3.5 font-medium text-ink-700 dark:text-ink-300">
                      {component}
                    </td>
                    <td className="py-3.5">
                      <span className={cn(
                        "badge",
                        risk === 'high' 
                          ? "bg-red-50 text-red-600 dark:bg-red-950/20" 
                          : risk === 'medium'
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
                      )}>
                        {risk === 'high' ? 'Risque Critique' : risk === 'medium' ? 'Risque Modéré' : 'Risque Faible'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-xs text-ink-500 font-medium max-w-xs truncate">
                      {desc}
                    </td>
                  </tr>
                );
              })}
              {wearPredictions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-500">
                    Aucun véhicule enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

