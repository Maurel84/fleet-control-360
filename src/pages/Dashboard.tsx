import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/cn';
import {
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Car, CalendarCheck, Truck, Wallet, AlertTriangle, TrendingUp,
  ArrowRight, FileText, Bell, ShoppingBag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { StatCard } from '../components/StatCard';
import { Card, CardHeader } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { formatCurrency, formatNumber, formatDate, daysUntil } from '../lib/format';
import {
  VEHICLE_STATUS_LABELS,
  RENTAL_STATUS_LABELS, RENTAL_STATUS_COLORS,
  INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS,
} from '../lib/labels';
import type { Vehicle, Rental, Mission, Invoice, FuelEntry, VehicleDocument, MaintenanceRequest, Notification, SalesDeal } from '../lib/types';

const STATUS_HEX: Record<string, string> = {
  available: '#10b981', reserved: '#f59e0b', rented: '#3b82f6', on_mission: '#6366f1',
  assigned: '#06b6d4', maintenance: '#f97316', repair: '#f97316', immobilized: '#ef4444',
  accident: '#ef4444', seized: '#78716c', out_of_service: '#78716c', sold: '#78716c',
};

const VEHICLE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?auto=format&fit=crop&w=1200&q=80'
];

export function Dashboard() {
  const { profile, user, organization } = useAuth();
  const orgId = profile?.organization_id;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [maint, setMaint] = useState<MaintenanceRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sales, setSales] = useState<SalesDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeBgIndex, setActiveBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBgIndex((prev) => (prev + 1) % VEHICLE_BACKGROUNDS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!orgId || !user) return;
    let active = true;
    const f = (table: string) => supabase.from(table).select('*').eq('organization_id', orgId);
    Promise.all([
      f('vehicles'), f('rentals'), f('missions'), f('invoices'),
      f('fuel_entries'), f('vehicle_documents'), f('maintenance_requests'),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      f('sales_deals'),
    ]).then((results) => {
      if (!active) return;
      setVehicles((results[0].data as Vehicle[]) ?? []);
      setRentals((results[1].data as Rental[]) ?? []);
      setMissions((results[2].data as Mission[]) ?? []);
      setInvoices((results[3].data as Invoice[]) ?? []);
      setFuelEntries((results[4].data as FuelEntry[]) ?? []);
      setDocs((results[5].data as VehicleDocument[]) ?? []);
      setMaint((results[6].data as MaintenanceRequest[]) ?? []);
      setNotifications((results[7].data as Notification[]) ?? []);
      setSales((results[8].data as SalesDeal[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [orgId, user]);

  const stats = useMemo(() => {
    const activeRentals = rentals.filter((r) => ['in_progress', 'vehicle_delivered', 'late', 'extended'].includes(r.status));
    const activeMissions = missions.filter((m) => ['planned', 'confirmed', 'team_assigned', 'departed', 'in_progress'].includes(m.status));
    const availableVehicles = vehicles.filter((v) => v.status === 'available').length;
    
    // Calculer les revenus des ventes de véhicules validées (acompte initial ou total comptant payé)
    const salesRevenue = sales
      .filter((s) => ['approved', 'active_installments', 'completed'].includes(s.status))
      .reduce((sum, s) => sum + (s.down_payment || 0), 0);
    
    // Chiffre d'affaires consolidé = Factures payées + Acomptes de ventes encaissés
    const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.paid_amount, 0) + salesRevenue;
    const outstanding = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balance, 0);
    const totalFuel = fuelEntries.reduce((s, f) => s + f.amount, 0);
    
    // Contrats de ventes de véhicules actifs
    const activeSales = sales.filter((s) => ['approved', 'active_installments'].includes(s.status)).length;

    return { activeRentals, activeMissions, availableVehicles, totalRevenue, outstanding, totalFuel, activeSales };
  }, [vehicles, rentals, missions, invoices, fuelEntries, sales]);

  const vehicleStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicles.forEach((v) => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: VEHICLE_STATUS_LABELS[status] ?? status, value: count, status }));
  }, [vehicles]);

  const revenueByMonth = useMemo(() => {
    const months: Record<string, { revenue: number; expenses: number }> = {};
    invoices.forEach((i) => {
      const m = (i.issue_date || '').slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { revenue: 0, expenses: 0 };
      months[m].revenue += i.paid_amount;
    });
    sales.forEach((s) => {
      const m = (s.sale_date || s.created_at || '').slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { revenue: 0, expenses: 0 };
      if (['approved', 'active_installments', 'completed'].includes(s.status)) {
        months[m].revenue += (s.down_payment || 0); // Ajouter les acomptes encaissés
      }
    });
    fuelEntries.forEach((f) => {
      const m = (f.date || '').slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { revenue: 0, expenses: 0 };
      months[m].expenses += f.amount;
    });
    return Object.entries(months).sort().slice(-6).map(([month, v]) => ({
      month: month.slice(5) + '/' + month.slice(2, 4),
      Revenus: v.revenue,
      Dépenses: v.expenses,
    }));
  }, [invoices, fuelEntries, sales]);

  const alerts = useMemo(() => {
    const items: { type: 'doc' | 'maint' | 'rental'; message: string; link: string; severity: 'warning' | 'critical' }[] = [];
    docs.forEach((d) => {
      if (!d.expiry_date) return;
      const days = daysUntil(d.expiry_date);
      if (days !== null && days <= 30) {
        items.push({
          type: 'doc',
          message: `${d.type === 'insurance' ? 'Assurance' : d.type === 'visite_technique' ? 'Visite technique' : 'Document'} expire dans ${days} jour${days > 1 ? 's' : ''}`,
          link: '/vehicles',
          severity: days <= 7 ? 'critical' : 'warning',
        });
      }
    });
    maint.filter((m) => m.status === 'pending' || m.status === 'in_progress').forEach((m) => {
      items.push({ type: 'maint', message: `Maintenance ${m.priority === 'urgent' ? 'urgente' : ''}: ${m.issue_type}`, link: '/maintenance', severity: m.priority === 'urgent' ? 'critical' : 'warning' });
    });
    rentals.filter((r) => r.status === 'late').forEach((r) => {
      items.push({ type: 'rental', message: `Location en retard: ${r.reference || r.id.slice(0, 8)}`, link: '/rentals', severity: 'critical' });
    });
    return items.sort((a) => (a.severity === 'critical' ? -1 : 1)).slice(0, 6);
  }, [docs, maint, rentals]);

  const recentRentals = useMemo(() =>
    [...rentals].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5),
    [rentals]);

  const recentMissions = useMemo(() =>
    [...missions].sort((a, b) => (b.start_datetime || '').localeCompare(a.start_datetime || '')).slice(0, 5),
    [missions]);

  const recentSales = useMemo(() =>
    [...sales].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 5),
    [sales]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre flotte" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5"><div className="skeleton h-20 w-full" /></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5"><div className="skeleton h-64 w-full" /></div>
          <div className="card p-5"><div className="skeleton h-64 w-full" /></div>
        </div>
      </div>
    );
  }

  const orgColor = organization?.primary_color || '#1e40af';
  const orgName = organization?.name || 'FleetControl 360';

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tableau de bord"
        subtitle={`Bonjour ${profile?.full_name?.split(' ')[0] ?? ''}, voici l'état de votre flotte`}
      />

      {/* Welcome Banner Card with sliding vehicle background */}
      <div 
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-white mb-6 shadow-md transition-all duration-300"
        style={{ backgroundColor: '#020617' }}
      >
        {/* Background Slideshow */}
        {VEHICLE_BACKGROUNDS.map((src, index) => (
          <div
            key={src}
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out",
              index === activeBgIndex ? "opacity-25 scale-105" : "opacity-0 scale-100"
            )}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}

        {/* Brand color overlay */}
        <div 
          className="absolute inset-0 transition-colors duration-1000 ease-in-out z-10"
          style={{ backgroundImage: `linear-gradient(to bottom right, ${orgColor}E6, #020617F2)` }}
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10 z-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Content */}
        <div className="relative z-20 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-4 text-blue-100">
            <Truck className="w-3.5 h-3.5" />
            Portail de gestion FleetControl 360
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Bonjour, {profile?.full_name?.split(' ')[0] ?? 'Gestionnaire'} !
          </h2>
          <p className="text-sm md:text-base text-blue-100/90 leading-relaxed">
            Ravi de vous revoir. Voici un aperçu global des opérations, de l'état du parc de véhicules et des finances de votre entreprise <strong>{orgName}</strong> aujourd'hui.
          </p>
        </div>
      </div>

      {/* KPI cards - 5 colonnes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Véhicules disponibles" value={formatNumber(stats.availableVehicles)} hint={`${vehicles.length} au total`} color="emerald" icon={<Car className="w-5 h-5" />} />
        <StatCard label="Locations actives" value={formatNumber(stats.activeRentals.length)} hint={`${rentals.length} locations au total`} color="blue" icon={<CalendarCheck className="w-5 h-5" />} />
        <StatCard label="Missions en cours" value={formatNumber(stats.activeMissions.length)} hint={`${missions.length} missions au total`} color="indigo" icon={<Truck className="w-5 h-5" />} />
        <StatCard label="Ventes en cours" value={formatNumber(stats.activeSales)} hint={`${sales.length} contrats au total`} color="violet" icon={<ShoppingBag className="w-5 h-5" />} />
        <StatCard label="Chiffre d'affaires" value={formatCurrency(stats.totalRevenue)} hint={`Impayés: ${formatCurrency(stats.outstanding)}`} color="amber" icon={<Wallet className="w-5 h-5" />} />
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <Card className="mb-6 border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-900/10">
          <CardHeader title="Alertes et échéances" subtitle={`${alerts.length} élément(s) nécessitent votre attention`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {alerts.map((a, i) => (
              <Link key={i} to={a.link} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:border-blue-300 dark:hover:border-blue-700 transition group">
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                <span className="text-sm text-ink-700 dark:text-ink-200 flex-1 truncate">{a.message}</span>
                <ArrowRight className="w-3.5 h-3.5 text-ink-300 group-hover:text-blue-500 transition" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Vehicle status donut */}
        <Card>
          <CardHeader title="État du parc" subtitle="Répartition par statut" />
          {vehicleStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {vehicleStatusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_HEX[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </Card>

        {/* Revenue vs Expenses */}
        <Card className="lg:col-span-2">
          <CardHeader title="Revenus vs Dépenses" subtitle="6 derniers mois" />
          {revenueByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-20" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Revenus" stroke="#3b82f6" strokeWidth={2} fill="url(#gRev)" />
                <Area type="monotone" dataKey="Dépenses" stroke="#f97316" strokeWidth={2} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </Card>
      </div>

      {/* Recent activity row - 3 colonnes side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Recent rentals */}
        <Card>
          <CardHeader
            title="Locations récentes"
            action={<Link to="/rentals" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">Voir tout <ArrowRight className="w-3 h-3" /></Link>}
          />
          <div className="space-y-2">
            {recentRentals.length > 0 ? recentRentals.map((r) => (
              <Link key={r.id} to="/rentals" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-ink-100 dark:border-ink-800 hover:border-blue-300 dark:hover:border-blue-700 transition">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100 truncate">{r.reference || r.client_id.slice(0, 8)}</p>
                  <p className="text-xs text-ink-400">{formatDate(r.start_datetime)}</p>
                </div>
                <span className={`badge ${RENTAL_STATUS_COLORS[r.status] ?? 'bg-stone-100 text-stone-600'}`}>
                  {RENTAL_STATUS_LABELS[r.status] ?? r.status}
                </span>
                <span className="text-sm font-semibold text-ink-700 dark:text-ink-200 flex-shrink-0">{formatCurrency(r.total_amount)}</span>
              </Link>
            )) : <EmptyList icon={<CalendarCheck className="w-5 h-5" />} text="Aucune location" />}
          </div>
        </Card>

        {/* Recent missions */}
        <Card>
          <CardHeader
            title="Missions récentes"
            action={<Link to="/missions" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">Voir tout <ArrowRight className="w-3 h-3" /></Link>}
          />
          <div className="space-y-2">
            {recentMissions.length > 0 ? recentMissions.map((m) => (
              <Link key={m.id} to="/missions" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-ink-100 dark:border-ink-800 hover:border-blue-300 dark:hover:border-blue-700 transition">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100 truncate">{m.reference || m.destination || 'Mission'}</p>
                  <p className="text-xs text-ink-400">{formatDate(m.start_datetime)}</p>
                </div>
                <span className="text-sm font-semibold text-ink-700 dark:text-ink-200 flex-shrink-0">{formatCurrency(m.billed_amount)}</span>
              </Link>
            )) : <EmptyList icon={<Truck className="w-5 h-5" />} text="Aucune mission" />}
          </div>
        </Card>

        {/* Recent sales */}
        <Card>
          <CardHeader
            title="Ventes de véhicules"
            action={<Link to="/sales" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">Voir tout <ArrowRight className="w-3 h-3" /></Link>}
          />
          <div className="space-y-2">
            {recentSales.length > 0 ? recentSales.map((s) => (
              <Link key={s.id} to="/sales" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-ink-100 dark:border-ink-800 hover:border-blue-300 dark:hover:border-blue-700 transition">
                <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100 truncate">Contrat Vente #{s.id.slice(0, 6).toUpperCase()}</p>
                  <p className="text-xs text-ink-400">Paiement : {s.payment_type === 'cash' ? 'Comptant' : s.payment_type === 'credit' ? 'Crédit' : 'Leasing'}</p>
                </div>
                <span className="text-sm font-semibold text-ink-700 dark:text-ink-200 flex-shrink-0">{formatCurrency(s.sale_price)}</span>
              </Link>
            )) : <EmptyList icon={<ShoppingBag className="w-5 h-5" />} text="Aucune vente" />}
          </div>
        </Card>
      </div>

      {/* Bottom row: invoices + notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Invoice status breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader title="Factures" subtitle="Répartition par statut" action={<Link to="/finance/invoices" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">Gérer <ArrowRight className="w-3 h-3" /></Link>} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['paid', 'partial', 'unpaid', 'overdue', 'canceled', 'draft'].map((status) => {
              const count = invoices.filter((i) => i.status === status).length;
              const amount = invoices.filter((i) => i.status === status).reduce((s, i) => s + (status === 'paid' ? i.paid_amount : i.total), 0);
              if (count === 0) return null;
              return (
                <div key={status} className="p-3 rounded-lg border border-ink-100 dark:border-ink-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`badge ${INVOICE_STATUS_COLORS[status]}`}>{INVOICE_STATUS_LABELS[status]}</span>
                    <span className="text-xs text-ink-400">{count}</span>
                  </div>
                  <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{formatCurrency(amount)}</p>
                </div>
              );
            })}
            {invoices.length === 0 && <div className="col-span-full"><EmptyList icon={<FileText className="w-5 h-5" />} text="Aucune facture" /></div>}
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader title="Notifications" action={<Link to="/notifications" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">Tout voir <ArrowRight className="w-3 h-3" /></Link>} />
          <div className="space-y-2">
            {notifications.length > 0 ? notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/40 transition">
                <Bell className={`w-4 h-4 flex-shrink-0 mt-0.5 ${n.severity === 'critical' ? 'text-red-500' : n.severity === 'warning' ? 'text-amber-500' : 'text-sky-500'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800 dark:text-ink-100 truncate">{n.title}</p>
                  <p className="text-xs text-ink-400 line-clamp-1">{n.message}</p>
                </div>
              </div>
            )) : <EmptyList icon={<Bell className="w-5 h-5" />} text="Aucune notification" />}
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[240px] flex flex-col items-center justify-center text-ink-300 dark:text-ink-600">
      <TrendingUp className="w-10 h-10 mb-2" />
      <p className="text-sm">Pas assez de données</p>
    </div>
  );
}

function EmptyList({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-ink-300 dark:text-ink-600">
      {icon}
      <p className="text-sm mt-2">{text}</p>
    </div>
  );
}
