import { useState, useMemo } from 'react';
import { ShoppingBag, Plus, Pencil, Trash2, Wallet, TrendingUp, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useVehicles, useClients } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/Card';
import { formatCurrency, formatDate, formatNumber } from '../lib/format';
import { SALES_PAYMENT_TYPE_LABELS, SALES_STATUS_LABELS, SALES_STATUS_COLORS } from '../lib/labels';
import type { SalesDeal } from '../lib/types';

interface FormState {
  vehicle_id: string;
  client_id: string;
  sale_price: string;
  payment_type: 'cash' | 'credit' | 'leasing' | 'installment';
  down_payment: string;
  installments_count: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'active_installments' | 'completed' | 'cancelled';
  sale_date: string;
  notes: string;
}

const EMPTY: FormState = {
  vehicle_id: '',
  client_id: '',
  sale_price: '',
  payment_type: 'cash',
  down_payment: '0',
  installments_count: '',
  status: 'draft',
  sale_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export function SalesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: sales, loading, refetch } = useQuery<SalesDeal>(
    'sales_deals',
    '*, vehicle:vehicles(*), client:clients(*)',
    { order: ['sale_date', { ascending: false }] }
  );

  const { data: allVehicles } = useVehicles();
  const { data: clients } = useClients();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesDeal | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesDeal | null>(null);

  // Filtrer les véhicules : afficher uniquement ceux disponibles, réservés ou celui en cours d'édition
  const availableVehiclesForSale = useMemo(() => {
    if (!allVehicles) return [];
    return allVehicles.filter(
      (v) => ['available', 'reserved'].includes(v.status) || v.id === editing?.vehicle_id
    );
  }, [allVehicles, editing]);

  // Statistiques calculées en temps réel
  const stats = useMemo(() => {
    if (!sales) return { totalSales: 0, soldCount: 0, activeCredits: 0, totalCollected: 0 };
    
    // Contrats validés ou actifs
    const validDeals = sales.filter((s) => ['approved', 'active_installments', 'completed'].includes(s.status));
    const totalSales = validDeals.reduce((sum, s) => sum + s.sale_price, 0);
    const soldCount = validDeals.length;

    // Crédits actifs (mensualités à recevoir)
    const activeCredits = sales
      .filter((s) => s.status === 'active_installments')
      .reduce((sum, s) => sum + (s.sale_price - s.down_payment), 0);

    // Total collecté (comptant + acomptes)
    const cashSales = validDeals.filter((s) => s.payment_type === 'cash').reduce((sum, s) => sum + s.sale_price, 0);
    const downPayments = validDeals.filter((s) => s.payment_type !== 'cash').reduce((sum, s) => sum + s.down_payment, 0);
    const totalCollected = cashSales + downPayments;

    return { totalSales, soldCount, activeCredits, totalCollected };
  }, [sales]);

  // Recalculateur dynamique de crédit
  const computedMonthlyPayment = useMemo(() => {
    const price = parseFloat(form.sale_price) || 0;
    const down = parseFloat(form.down_payment) || 0;
    const months = parseInt(form.installments_count) || 0;
    if (months <= 0) return 0;
    return Math.max(0, (price - down) / months);
  }, [form.sale_price, form.down_payment, form.installments_count]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (s: SalesDeal) => {
    setEditing(s);
    setForm({
      vehicle_id: s.vehicle_id,
      client_id: s.client_id,
      sale_price: s.sale_price.toString(),
      payment_type: s.payment_type as FormState['payment_type'],
      down_payment: s.down_payment.toString(),
      installments_count: s.installments_count?.toString() || '',
      status: s.status as FormState['status'],
      sale_date: s.sale_date,
      notes: s.notes || '',
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.vehicle_id || !form.client_id || !form.sale_price || !form.sale_date) {
      toast('Veuillez renseigner le véhicule, le client, le prix et la date de vente.', 'error');
      return;
    }

    setSaving(true);
    const priceVal = parseFloat(form.sale_price);
    const downVal = parseFloat(form.down_payment) || 0;
    const installments = form.payment_type !== 'cash' ? parseInt(form.installments_count) || null : null;
    
    const payload = {
      organization_id: profile.organization_id,
      vehicle_id: form.vehicle_id,
      client_id: form.client_id,
      sale_price: priceVal,
      payment_type: form.payment_type,
      down_payment: downVal,
      installments_count: installments,
      monthly_payment: form.payment_type !== 'cash' ? computedMonthlyPayment : 0,
      status: form.status,
      sale_date: form.sale_date,
      notes: form.notes || null,
    };

    const { error } = editing
      ? await supabase.from('sales_deals').update(payload).eq('id', editing.id)
      : await supabase.from('sales_deals').insert(payload);

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Contrat de vente modifié.' : 'Vente enregistrée avec succès.', 'success');
      setModalOpen(false);
      refetch();
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('sales_deals').delete().eq('id', deleteTarget.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Contrat de vente supprimé.', 'success');
      setDeleteTarget(null);
      refetch();
    }
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<SalesDeal>[] = [
    {
      key: 'vehicle',
      header: 'Véhicule vendu',
      sortable: true,
      sortValue: (s) => s.vehicle?.brand || '',
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-ink-800 dark:text-ink-100">{s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model}` : 'Véhicule supprimé'}</p>
            <p className="text-xs text-ink-400">{s.vehicle?.registration || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Acheteur',
      render: (s) => <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{s.client?.name || '—'}</span>,
    },
    {
      key: 'payment_type',
      header: 'Mode de règlement',
      render: (s) => (
        <div>
          <span className="text-sm">{SALES_PAYMENT_TYPE_LABELS[s.payment_type] || s.payment_type}</span>
          {s.payment_type !== 'cash' && s.installments_count && (
            <p className="text-xs text-ink-400">{s.installments_count} mois échelonnés</p>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Prix de vente',
      sortable: true,
      sortValue: (s) => s.sale_price,
      render: (s) => (
        <div>
          <p className="font-bold text-sm text-ink-900 dark:text-white">{formatCurrency(s.sale_price)}</p>
          {s.down_payment > 0 && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Acompte: {formatCurrency(s.down_payment)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'monthly',
      header: 'Mensualité',
      render: (s) => (
        <span className="text-sm font-medium text-ink-600 dark:text-ink-300">
          {s.payment_type !== 'cash' && s.monthly_payment > 0 ? `${formatCurrency(s.monthly_payment)} / mois` : '—'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date de vente',
      sortable: true,
      sortValue: (s) => s.sale_date,
      render: (s) => <span className="text-sm">{formatDate(s.sale_date)}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (s) => <StatusBadge label={SALES_STATUS_LABELS[s.status] ?? s.status} colorClass={SALES_STATUS_COLORS[s.status] ?? ''} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(s)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(s)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Vente & Financement"
        subtitle="Gestion des contrats de vente, showroom et encaissements de crédits"
        icon={<ShoppingBag className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvelle vente</Button>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Chiffre d'Affaires Ventes" value={formatCurrency(stats.totalSales)} hint={`${stats.soldCount} véhicule(s) vendu(s)`} color="emerald" icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard label="Total Encaissé" value={formatCurrency(stats.totalCollected)} hint="Acomptes & Paiements Cash" color="blue" icon={<Wallet className="w-5 h-5" />} />
        <StatCard label="Restant à Recevoir" value={formatCurrency(stats.activeCredits)} hint="Encours de crédit actif" color="indigo" icon={<Wallet className="w-5 h-5" />} />
        <StatCard label="Taux de Concrétisation" value={formatNumber(stats.soldCount)} hint="Ventes validées enregistrées" color="amber" icon={<ShoppingBag className="w-5 h-5" />} />
      </div>

      <DataTable
        columns={columns}
        rows={sales ?? []}
        rowKey={(s) => s.id}
        loading={loading}
        searchable
        searchPlaceholder="Rechercher par véhicule, acheteur..."
        searchKeys={(s) => `${s.vehicle?.brand || ''} ${s.vehicle?.model || ''} ${s.client?.name || ''}`}
        emptyMessage="Aucun contrat de vente enregistré"
        emptyHint="Enregistrez une vente pour démarrer le suivi du chiffre d'affaires."
      />

      {/* Modal Nouvelle Vente / Édition */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le contrat de vente' : 'Nouvel enregistrement de vente'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </>
        }
      >
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Véhicule à vendre" required>
            <Select
              options={availableVehiclesForSale.map((v) => ({
                value: v.id,
                label: `${v.brand} ${v.model} (${v.registration || v.internal_number || '—'}) [${v.status === 'reserved' ? 'Réservé' : 'Disponible'}]`,
              }))}
              value={form.vehicle_id}
              onChange={(e) => set('vehicle_id', e.target.value)}
            />
          </FormField>

          <FormField label="Client / Acheteur" required>
            <Select
              options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={form.client_id}
              onChange={(e) => set('client_id', e.target.value)}
            />
          </FormField>

          <FormField label="Prix de vente conclu (FCFA)" required>
            <input
              type="number"
              className="input"
              value={form.sale_price}
              onChange={(e) => set('sale_price', e.target.value)}
              placeholder="Ex: 15000000"
            />
          </FormField>

          <FormField label="Type de règlement" required>
            <Select
              options={[
                { value: 'cash', label: 'Comptant (Cash)' },
                { value: 'credit', label: 'Crédit concessionnaire' },
                { value: 'installment', label: 'Paiement par échéances' },
                { value: 'leasing', label: 'Leasing (LOA)' },
              ]}
              value={form.payment_type}
              onChange={(e) => set('payment_type', e.target.value as FormState['payment_type'])}
            />
          </FormField>

          <FormField label="Acompte / Apport initial (FCFA)">
            <input
              type="number"
              className="input"
              value={form.down_payment}
              onChange={(e) => set('down_payment', e.target.value)}
              disabled={form.payment_type === 'cash'}
            />
          </FormField>

          <FormField label="Durée de financement (Mois)">
            <input
              type="number"
              className="input"
              value={form.installments_count}
              onChange={(e) => set('installments_count', e.target.value)}
              placeholder="Ex: 12, 24, 36"
              disabled={form.payment_type === 'cash'}
            />
          </FormField>

          <FormField label="Date de la transaction" required>
            <input
              type="date"
              className="input"
              value={form.sale_date}
              onChange={(e) => set('sale_date', e.target.value)}
            />
          </FormField>

          <FormField label="Statut du contrat">
            <Select
              options={[
                { value: 'draft', label: 'Brouillon' },
                { value: 'pending_approval', label: 'En attente d\'approbation' },
                { value: 'approved', label: 'Validé (Livraison cash)' },
                { value: 'active_installments', label: 'Mensualités actives (Crédit)' },
                { value: 'completed', label: 'Contrat clôturé / Soldé' },
                { value: 'cancelled', label: 'Vente annulée' },
              ]}
              value={form.status}
              onChange={(e) => set('status', e.target.value as FormState['status'])}
            />
          </FormField>

          {/* Calculateur de Crédit Interactif en Direct */}
          {form.payment_type !== 'cash' && (
            <div className="sm:col-span-2 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-950 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Simulation de Financement Direct</h4>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Sur la base d'un montant financé de{' '}
                  <span className="font-bold">
                    {formatCurrency((parseFloat(form.sale_price) || 0) - (parseFloat(form.down_payment) || 0))}
                  </span>{' '}
                  ({formatCurrency(parseFloat(form.sale_price) || 0)} prix - {formatCurrency(parseFloat(form.down_payment) || 0)} apport) sur{' '}
                  <span className="font-bold">{parseInt(form.installments_count) || 0} mois</span> :
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-300 mt-2">
                  Mensualité : {formatCurrency(computedMonthlyPayment)} / mois
                </p>
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <FormField label="Notes / Conditions particulières">
              <textarea
                className="input min-h-[80px]"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Indiquez les détails de la garantie, clauses suspensives, etc."
              />
            </FormField>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Supprimer la vente"
        message={`Voulez-vous vraiment supprimer le contrat de vente du véhicule ? Cette action est irréversible et retirera les encaissements associés.`}
        confirmLabel="Supprimer"
        danger
      />
    </div>
  );
}
