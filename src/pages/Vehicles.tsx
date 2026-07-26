import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Car, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery } from '../lib/query';
import { useAgencies, useVehicleCategories } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatusBadge } from '../components/Card';
import {
  VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS, FUEL_TYPE_LABELS,
} from '../lib/labels';
import { formatNumber } from '../lib/format';
import type { Vehicle } from '../lib/types';

const STATUS_OPTIONS = Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const FUEL_OPTIONS = Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const OWNERSHIP_OPTIONS = [
  { value: 'owned', label: 'Propre' },
  { value: 'leased', label: 'Leasing' },
  { value: 'rented', label: 'Loué' },
  { value: 'partner', label: 'Partenaire' },
];

interface FormState {
  internal_number: string;
  registration: string;
  brand: string;
  model: string;
  year_manufactured: string;
  color: string;
  fuel_type: string;
  seats: string;
  agency_id: string;
  category_id: string;
  ownership_type: string;
  owner_name: string;
  purchase_price: string;
  current_mileage: string;
  status: string;
  notes: string;
}

const EMPTY: FormState = {
  internal_number: '', registration: '', brand: '', model: '', year_manufactured: '',
  color: '', fuel_type: '', seats: '', agency_id: '', category_id: '', ownership_type: 'owned',
  owner_name: '', purchase_price: '', current_mileage: '0', status: 'available', notes: '',
};

export function VehiclesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const searchQ = params.get('q') || '';
  const { data: vehicles, loading, refetch } = useQuery<Vehicle>(
    'vehicles',
    '*, agency:agencies(*), category_ref:vehicle_categories(*)',
    { order: ['brand', { ascending: true }] },
  );
  const { data: agencies } = useAgencies();
  const { data: categories } = useVehicleCategories();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const filtered = useMemo(() => {
    if (!vehicles) return [];
    if (!searchQ) return vehicles;
    const q = searchQ.toLowerCase();
    return vehicles.filter((v) =>
      (v.brand + ' ' + v.model + ' ' + (v.registration || '') + ' ' + (v.internal_number || ''))
        .toLowerCase().includes(q),
    );
  }, [vehicles, searchQ]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      internal_number: v.internal_number || '',
      registration: v.registration || '',
      brand: v.brand,
      model: v.model,
      year_manufactured: v.year_manufactured?.toString() || '',
      color: v.color || '',
      fuel_type: v.fuel_type || '',
      seats: v.seats?.toString() || '',
      agency_id: v.agency_id || '',
      category_id: v.category_id || '',
      ownership_type: v.ownership_type,
      owner_name: v.owner_name || '',
      purchase_price: v.purchase_price?.toString() || '',
      current_mileage: v.current_mileage.toString(),
      status: v.status,
      notes: v.notes || '',
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.brand || !form.model) {
      toast('La marque et le modèle sont obligatoires.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      organization_id: profile.organization_id,
      internal_number: form.internal_number || null,
      registration: form.registration || null,
      brand: form.brand,
      model: form.model,
      year_manufactured: form.year_manufactured ? parseInt(form.year_manufactured) : null,
      color: form.color || null,
      fuel_type: form.fuel_type || null,
      seats: form.seats ? parseInt(form.seats) : null,
      agency_id: form.agency_id || null,
      category_id: form.category_id || null,
      ownership_type: form.ownership_type,
      owner_name: form.owner_name || null,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      current_mileage: parseInt(form.current_mileage) || 0,
      status: form.status,
      notes: form.notes || null,
    };

    const { error } = editing
      ? await supabase.from('vehicles').update(payload).eq('id', editing.id)
      : await supabase.from('vehicles').insert(payload);

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Véhicule modifié.' : 'Véhicule ajouté.', 'success');
      setModalOpen(false);
      refetch();
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', deleteTarget.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Véhicule supprimé.', 'success');
      refetch();
    }
  };

  const columns: Column<Vehicle>[] = [
    {
      key: 'identification', header: 'Véhicule', sortable: true,
      sortValue: (v) => v.brand + ' ' + v.model,
      render: (v) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink-800 dark:text-ink-100 truncate">{v.brand} {v.model}</p>
            <p className="text-xs text-ink-400">{v.internal_number || '—'} · {v.registration || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'agency', header: 'Agence',
      render: (v) => <span className="text-sm text-ink-600 dark:text-ink-300">{v.agency?.name || '—'}</span>,
    },
    {
      key: 'year', header: 'Année', sortable: true, sortValue: (v) => v.year_manufactured ?? 0,
      render: (v) => <span className="text-sm">{v.year_manufactured || '—'}</span>,
    },
    {
      key: 'mileage', header: 'Kilométrage', sortable: true, sortValue: (v) => v.current_mileage,
      render: (v) => <span className="text-sm text-ink-600 dark:text-ink-300">{formatNumber(v.current_mileage)} km</span>,
    },
    {
      key: 'status', header: 'Statut', sortable: true, sortValue: (v) => v.status,
      render: (v) => <StatusBadge label={VEHICLE_STATUS_LABELS[v.status] ?? v.status} colorClass={VEHICLE_STATUS_COLORS[v.status] ?? ''} />,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (v) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => navigate(`/vehicles/${v.id}`)} className="btn-ghost p-1.5" title="Détails"><Eye className="w-4 h-4" /></button>
          <button onClick={() => openEdit(v)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(v)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Parc automobile"
        subtitle={`${vehicles?.length ?? 0} véhicule(s) au total`}
        icon={<Car className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Ajouter</Button>}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(v) => v.id}
        loading={loading}
        searchable
        searchPlaceholder="Rechercher par marque, modèle, immatriculation…"
        searchKeys={(v) => `${v.brand} ${v.model} ${v.registration || ''} ${v.internal_number || ''} ${v.color || ''}`}
        emptyMessage="Aucun véhicule"
        emptyHint="Ajoutez votre premier véhicule pour commencer."
        onRowClick={(v) => navigate(`/vehicles/${v.id}`)}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
        subtitle="Renseignez les informations du véhicule"
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </>
        }
      >
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Numéro interne"><input className="input" value={form.internal_number} onChange={(e) => set('internal_number', e.target.value)} placeholder="ABJ-001" /></FormField>
          <FormField label="Immatriculation"><input className="input" value={form.registration} onChange={(e) => set('registration', e.target.value)} placeholder="1234 AB 01" /></FormField>
          <FormField label="Marque" required><input className="input" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Toyota" /></FormField>
          <FormField label="Modèle" required><input className="input" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Hilux" /></FormField>
          <FormField label="Année"><input type="number" className="input" value={form.year_manufactured} onChange={(e) => set('year_manufactured', e.target.value)} placeholder="2022" /></FormField>
          <FormField label="Couleur"><input className="input" value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Blanc" /></FormField>
          <FormField label="Carburant">
            <Select options={FUEL_OPTIONS} value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)} />
          </FormField>
          <FormField label="Places"><input type="number" className="input" value={form.seats} onChange={(e) => set('seats', e.target.value)} placeholder="5" /></FormField>
          <FormField label="Agence">
            <Select options={(agencies ?? []).map((a) => ({ value: a.id, label: a.name }))} value={form.agency_id} onChange={(e) => set('agency_id', e.target.value)} />
          </FormField>
          <FormField label="Catégorie">
            <Select options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))} value={form.category_id} onChange={(e) => set('category_id', e.target.value)} />
          </FormField>
          <FormField label="Type de propriété">
            <Select options={OWNERSHIP_OPTIONS} value={form.ownership_type} onChange={(e) => set('ownership_type', e.target.value)} />
          </FormField>
          <FormField label="Propriétaire" hint="Si leasing ou partenaire"><input className="input" value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} /></FormField>
          <FormField label="Prix d'achat (FCFA)"><input type="number" className="input" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} /></FormField>
          <FormField label="Kilométrage actuel"><input type="number" className="input" value={form.current_mileage} onChange={(e) => set('current_mileage', e.target.value)} /></FormField>
          <FormField label="Statut">
            <Select options={STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Notes"><textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></FormField>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Supprimer le véhicule"
        message={`Voulez-vous vraiment supprimer ${deleteTarget?.brand} ${deleteTarget?.model} (${deleteTarget?.registration || 'sans immatriculation'}) ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
      />
    </div>
  );
}
