import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, Wallet, Fuel, TrendingUp, Car } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { formatCurrency, formatNumber } from '../lib/format';
import type { Vehicle, Invoice, Expense, FuelEntry, Rental, Mission } from '../lib/types';

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
