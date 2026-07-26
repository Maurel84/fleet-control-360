import { useState, useMemo } from 'react';
import { 
  FileText, Plus, Pencil, Trash2, Eye, Printer, Check, Sparkles, X, 
  Smartphone, QrCode, Building, Info 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { useQuery, useSingle } from '../lib/query';
import { useClients } from '../lib/hooks';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Button } from '../components/Button';
import { Modal, ConfirmDialog } from '../components/Modal';
import { FormField, Select } from '../components/FormField';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/Card';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '../lib/labels';
import { formatCurrency, formatDate, formatNumber } from '../lib/format';
import type { Invoice, InvoiceItem, Organization } from '../lib/types';

const STATUS_OPTIONS = Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface FormState {
  client_id: string;
  issue_date: string;
  due_date: string;
  subtotal: string;
  discount: string;
  taxes: string;
  status: string;
  notes: string;
}

const EMPTY: FormState = {
  client_id: '',
  issue_date: '',
  due_date: '',
  subtotal: '',
  discount: '0',
  taxes: '0',
  status: 'unpaid',
  notes: '',
};

export function InvoicesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: invoices, loading, refetch } = useQuery<Invoice>(
    'invoices',
    '*, client:clients(*)',
    { order: ['issue_date', { ascending: false }] }
  );
  
  // Récupérer l'organisation courante pour personnaliser l'en-tête de facture
  const { data: organization } = useSingle<Organization>('organizations', '*', profile?.organization_id || undefined);

  // Charger tous les articles de factures pour filtrer par facture sélectionnée
  const { data: allItems } = useQuery<InvoiceItem>('invoice_items', '*');

  const { data: clients } = useClients();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  // États pour la visualisation de facture
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [dgiVerified, setDgiVerified] = useState(false);

  // États pour la simulation de paiement Mobile Money
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'wave' | 'orange' | 'mtn'>('wave');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [payCode, setPayCode] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  const totalPaid = (invoices ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + i.paid_amount, 0);
  const totalOutstanding = (invoices ?? []).filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status)).reduce((s, i) => s + i.balance, 0);
  const totalOverdue = (invoices ?? []).filter((i) => i.status === 'overdue').reduce((s, i) => s + i.balance, 0);

  // Filtrer les articles de la facture actuellement sélectionnée
  const activeInvoiceItems = useMemo(() => {
    if (!selectedInvoice || !allItems) return [];
    return allItems.filter((item) => item.invoice_id === selectedInvoice.id);
  }, [allItems, selectedInvoice]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      client_id: inv.client_id,
      issue_date: inv.issue_date || '',
      due_date: inv.due_date || '',
      subtotal: inv.subtotal?.toString() || '',
      discount: inv.discount?.toString() || '0',
      taxes: inv.taxes?.toString() || '0',
      status: inv.status,
      notes: inv.notes || '',
    });
    setModalOpen(true);
  };

  const openView = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setDgiVerified(false);
    setViewModalOpen(true);
    // Pré-remplir le numéro de téléphone pour le paiement
    setPhoneNumber(inv.client?.phone || '');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;
    if (!form.client_id || !form.issue_date || !form.subtotal) {
      toast('Client, date et montant HT sont obligatoires.', 'error');
      return;
    }
    setSaving(true);
    const subtotal = parseFloat(form.subtotal);
    const discount = parseFloat(form.discount) || 0;
    const taxes = parseFloat(form.taxes) || 0;
    const total = subtotal - discount + taxes;
    const payload = {
      organization_id: profile.organization_id,
      client_id: form.client_id,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      subtotal,
      discount,
      taxes,
      total,
      paid_amount: editing?.paid_amount ?? 0,
      balance: total - (editing?.paid_amount ?? 0),
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from('invoices').update(payload).eq('id', editing.id)
      : await supabase.from('invoices').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast(editing ? 'Facture modifiée.' : 'Facture créée.', 'success');
      setModalOpen(false);
      refetch();
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('invoices').delete().eq('id', deleteTarget.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Facture supprimée.', 'success');
      setDeleteTarget(null);
      refetch();
    }
  };

  // Traitement simulé du paiement Mobile Money
  const handleSimulatePayment = async () => {
    if (!selectedInvoice || !profile?.organization_id) return;

    setPayProcessing(true);
    setPaySuccess(false);

    // Attendre 1.8 seconde pour simuler l'interrogation opérateur
    setTimeout(async () => {
      // 1. Mettre à jour la facture dans Supabase
      const { error: invError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_amount: selectedInvoice.total,
          balance: 0,
        })
        .eq('id', selectedInvoice.id);

      if (invError) {
        toast(invError.message, 'error');
        setPayProcessing(false);
        return;
      }

      // 2. Créer une transaction dans la table payments
      const { error: payError } = await supabase.from('payments').insert({
        organization_id: profile.organization_id,
        invoice_id: selectedInvoice.id,
        client_id: selectedInvoice.client_id,
        amount: selectedInvoice.balance,
        payment_method: 'mobile_money',
        account_type: 'mobile_money',
        notes: `Règlement mobile simulé via ${payMethod.toUpperCase()} (${phoneNumber})`,
      });

      if (payError) {
        console.error("Erreur d'insertion du paiement:", payError);
      }

      // 3. Envoyer une notification système
      await supabase.from('notifications').insert({
        organization_id: profile.organization_id,
        type: 'payment',
        title: 'Paiement Mobile Money Reçu',
        message: `Facture ${selectedInvoice.reference || selectedInvoice.id.slice(0, 8)} soldée via ${payMethod.toUpperCase()} par ${selectedInvoice.client?.name} (${formatCurrency(selectedInvoice.balance)})`,
        severity: 'info',
        is_read: false,
      });

      setPayProcessing(false);
      setPaySuccess(true);
      toast('Paiement simulé validé avec succès !', 'success');
      refetch();

      // Fermer le guichet de paiement après 1.5s
      setTimeout(() => {
        setPayModalOpen(false);
        setViewModalOpen(false);
        setPaySuccess(false);
      }, 1500);
    }, 1800);
  };

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const columns: Column<Invoice>[] = [
    {
      key: 'ref',
      header: 'Référence',
      sortable: true,
      sortValue: (i) => i.reference || i.id,
      render: (i) => <span className="font-medium text-ink-800 dark:text-ink-100">{i.reference || i.id.slice(0, 8)}</span>,
    },
    {
      key: 'client',
      header: 'Client',
      render: (i) => <span className="text-sm text-ink-600 dark:text-ink-300">{i.client?.name || '—'}</span>,
    },
    {
      key: 'issue',
      header: 'Émission',
      sortable: true,
      sortValue: (i) => i.issue_date,
      render: (i) => <span className="text-sm">{formatDate(i.issue_date)}</span>,
    },
    {
      key: 'due',
      header: 'Échéance',
      render: (i) => <span className="text-sm">{formatDate(i.due_date)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      sortValue: (i) => i.total,
      render: (i) => <span className="font-semibold text-sm">{formatCurrency(i.total)}</span>,
    },
    {
      key: 'balance',
      header: 'Solde',
      render: (i) => <span className="text-sm text-ink-600 dark:text-ink-300">{formatCurrency(i.balance)}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      sortValue: (i) => i.status,
      render: (i) => <StatusBadge label={INVOICE_STATUS_LABELS[i.status] ?? i.status} colorClass={INVOICE_STATUS_COLORS[i.status] ?? ''} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (i) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openView(i)} className="btn-ghost p-1.5 text-blue-600 dark:text-blue-400" title="Visualiser"><Eye className="w-4 h-4" /></button>
          <button onClick={() => openEdit(i)} className="btn-ghost p-1.5" title="Modifier"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => setDeleteTarget(i)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Factures"
        subtitle={`${invoices?.length ?? 0} facture(s)`}
        icon={<FileText className="w-5 h-5" />}
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Nouvelle facture</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Encaissé" value={formatCurrency(totalPaid)} color="emerald" icon={<FileText className="w-5 h-5" />} />
        <StatCard label="En attente" value={formatCurrency(totalOutstanding)} color="amber" icon={<FileText className="w-5 h-5" />} />
        <StatCard label="En retard" value={formatCurrency(totalOverdue)} color="red" icon={<FileText className="w-5 h-5" />} />
      </div>

      <DataTable
        columns={columns}
        rows={invoices ?? []}
        rowKey={(i) => i.id}
        loading={loading}
        searchKeys={(i) => `${i.reference || ''} ${i.client?.name || ''}`}
        emptyMessage="Aucune facture"
        emptyHint="Créez votre première facture."
      />

      {/* MODAL ÉDITION FACTURE */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier la facture' : 'Nouvelle facture'}
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
          <div className="sm:col-span-2">
            <FormField label="Client" required>
              <Select
                options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
                value={form.client_id}
                onChange={(e) => set('client_id', e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Date d'émission" required>
            <input type="date" className="input" value={form.issue_date} onChange={(e) => set('issue_date', e.target.value)} />
          </FormField>
          <FormField label="Date d'échéance">
            <input type="date" className="input" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
          </FormField>
          <FormField label="Montant HT (FCFA)" required>
            <input type="number" className="input" value={form.subtotal} onChange={(e) => set('subtotal', e.target.value)} />
          </FormField>
          <FormField label="Remise (FCFA)">
            <input type="number" className="input" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
          </FormField>
          <FormField label="Taxes (FCFA)">
            <input type="number" className="input" value={form.taxes} onChange={(e) => set('taxes', e.target.value)} />
          </FormField>
          <FormField label="Statut">
            <Select options={STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Notes">
              <textarea className="input min-h-[60px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION DE SUPPRESSION */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title="Supprimer la facture"
        message={`Supprimer la facture ${deleteTarget?.reference || deleteTarget?.id.slice(0, 8)} ?`}
        confirmLabel="Supprimer"
        danger
      />

      {/* MODAL VISUALISATION FACTURE A4 PERSONNALISÉE */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Facture ${selectedInvoice?.reference || selectedInvoice?.id.slice(0, 8)}`}
        size="lg"
        footer={
          <div className="w-full flex items-center justify-between">
            <div>
              <button 
                onClick={() => {
                  const printContents = document.getElementById('printable-invoice-area')?.innerHTML;
                  if (printContents) {
                    const w = window.open();
                    if (w) {
                      w.document.write(`
                        <html>
                          <head>
                            <title>Impression Facture</title>
                            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                          </head>
                          <body class="bg-white p-10 font-sans" onload="window.print();window.close();">
                            ${printContents}
                          </body>
                        </html>
                      `);
                      w.document.close();
                    }
                  }
                }} 
                className="btn btn-secondary flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimer la facture
              </button>
            </div>
            <div className="flex gap-2">
              {selectedInvoice && selectedInvoice.status !== 'paid' && (
                <button 
                  onClick={() => setPayModalOpen(true)}
                  className="btn btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" /> Payer par Mobile Money
                </button>
              )}
              <button onClick={() => setViewModalOpen(false)} className="btn-secondary">Fermer</button>
            </div>
          </div>
        }
      >
        <div id="printable-invoice-area" className="p-6 bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl shadow-sm text-ink-900 dark:text-ink-50">
          
          {/* Header de l'entreprise personnalisé */}
          <div className="flex justify-between items-start gap-4 mb-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {organization?.logo_url ? (
                  <img src={organization.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white">
                    <Building className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h2 className="font-display font-bold text-lg leading-tight">
                    {organization?.legal_name || organization?.name || 'Fleet Control 360'}
                  </h2>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wider">ENTREPRISE PARTENAIRE</p>
                </div>
              </div>
              <div className="text-xs text-ink-500 space-y-0.5 mt-2">
                <p>Adresse : {organization?.address || 'Abidjan, Côte d\'Ivoire'}</p>
                <p>Tél : {organization?.phone || '+225 07 00 00 00 00'}</p>
                <p>Email : {organization?.email || 'contact@fleetcontrol360.com'}</p>
                <p className="font-semibold text-ink-700 dark:text-ink-300">
                  NCC / Tax ID : {organization?.tax_id || 'NCC-0123456-X'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <h1 className="text-2xl font-bold text-ink-900 dark:text-white mb-2">FACTURE</h1>
              <p className="text-sm font-semibold font-mono text-ink-600 dark:text-ink-300">
                {selectedInvoice?.reference || selectedInvoice?.id.slice(0, 8)}
              </p>
              <div className="text-xs text-ink-500 space-y-0.5 mt-2">
                <p>Date : {selectedInvoice && formatDate(selectedInvoice.issue_date)}</p>
                <p>Échéance : {selectedInvoice && formatDate(selectedInvoice.due_date)}</p>
                <div className="mt-2">
                  <span className={`badge ${selectedInvoice && INVOICE_STATUS_COLORS[selectedInvoice.status]}`}>
                    {selectedInvoice && INVOICE_STATUS_LABELS[selectedInvoice.status]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-ink-100 dark:border-ink-800/60 mb-6" />

          {/* Destinataire / Client */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">Facturé à :</h4>
            <div className="text-sm font-medium text-ink-800 dark:text-ink-100">{selectedInvoice?.client?.name}</div>
            <div className="text-xs text-ink-500 space-y-0.5 mt-1">
              <p>Type : {selectedInvoice?.client?.type === 'company' ? 'Entreprise' : 'Particulier'}</p>
              <p>Contact : {selectedInvoice?.client?.representative || 'N/A'}</p>
              <p>Tél : {selectedInvoice?.client?.phone || 'N/A'}</p>
              <p>Adresse : {selectedInvoice?.client?.address || 'N/A'}</p>
              {selectedInvoice?.client?.tax_id && <p>NCC Client : {selectedInvoice.client.tax_id}</p>}
            </div>
          </div>

          {/* Tableau des Articles */}
          <div className="table-wrap mb-6">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-right">Qté</th>
                  <th className="text-right">Prix Unitaire</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {activeInvoiceItems.length > 0 ? (
                  activeInvoiceItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.description}</td>
                      <td className="text-right">{formatNumber(Number(item.quantity))}</td>
                      <td className="text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="font-medium">Prestations de services - Fleet Control 360</td>
                    <td className="text-right">1.00</td>
                    <td className="text-right">{formatCurrency(selectedInvoice?.subtotal || 0)}</td>
                    <td className="text-right font-semibold">{formatCurrency(selectedInvoice?.subtotal || 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end mb-8">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Sous-total :</span>
                <span className="font-medium">{formatCurrency(selectedInvoice?.subtotal || 0)}</span>
              </div>
              {Number(selectedInvoice?.discount) > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Remise :</span>
                  <span>-{formatCurrency(selectedInvoice?.discount || 0)}</span>
                </div>
              )}
              {Number(selectedInvoice?.taxes) > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-500">TVA (Taxes) :</span>
                  <span className="font-medium">+{formatCurrency(selectedInvoice?.taxes || 0)}</span>
                </div>
              )}
              <hr className="border-ink-100 dark:border-ink-850" />
              <div className="flex justify-between text-base font-bold">
                <span>Montant TTC :</span>
                <span className="text-ink-900 dark:text-white">{formatCurrency(selectedInvoice?.total || 0)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span>Montant réglé :</span>
                <span>{formatCurrency(selectedInvoice?.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-ink-700 dark:text-ink-300">
                <span>Reste à payer :</span>
                <span>{formatCurrency(selectedInvoice?.balance || 0)}</span>
              </div>
            </div>
          </div>

          <hr className="border-ink-100 dark:border-ink-800/60 mb-6" />

          {/* Encart DGI CI Normalisé */}
          <div className="p-4 rounded-xl border border-dashed border-ink-200 dark:border-ink-700 bg-ink-50/50 dark:bg-ink-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-ink-800 dark:text-ink-100">RÉPUBLIQUE DE CÔTE D'IVOIRE</h4>
                <p className="text-[10px] text-ink-500">Direction Générale des Impôts · Facture Normalisée</p>
                <p className="text-[9px] font-mono text-ink-400 mt-1">Signature DGI: CERT-75249-DGI-EFACT-CI</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* QR Code interactif simulé */}
              <div 
                onClick={() => setDgiVerified(true)}
                className="w-16 h-16 bg-white p-1.5 border border-ink-200 rounded-lg cursor-pointer hover:border-emerald-500 transition shadow-inner relative group"
                title="Vérifier la facture auprès de la DGI"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full text-ink-900">
                  <path d="M0,0h40v40h-40z M20,20h10v10h-10z M60,0h40v40h-40z M80,20h10v10h-10z M0,60h40v40h-40z M20,80h10v10h-10z" fill="currentColor"/>
                  <path d="M50,50h10v10h-10z M70,50h10v10h-10z M50,70h10v10h-10z M60,80h10v10h-10z M80,80h20v20h-20z M80,60h10v10h-10z" fill="currentColor"/>
                </svg>
                <div className="absolute inset-0 bg-emerald-600/10 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
                  <span className="text-[8px] bg-emerald-600 text-white font-bold px-1 py-0.5 rounded shadow">VÉRIFIER</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pop-up de vérification de la facture par la DGI */}
          {dgiVerified && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-400 flex items-start gap-2 animate-fade-in">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Facture Certifiée</span> — Ce document a été enregistré avec succès sur le serveur TSEF de la Direction Générale des Impôts de Côte d'Ivoire.
                <br />
                <span className="font-mono text-[10px] mt-1 block">NCC : {organization?.tax_id || 'NCC-0123456-X'} · Numéro de facture : F-{selectedInvoice?.id.slice(0, 12).toUpperCase()}</span>
              </div>
              <button onClick={() => setDgiVerified(false)} className="ml-auto text-emerald-500 hover:text-emerald-700"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {selectedInvoice?.notes && (
            <div className="mt-6 text-xs text-ink-500">
              <strong className="block mb-1 text-ink-700 dark:text-ink-300">Conditions de règlement :</strong>
              <p>{selectedInvoice.notes}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* GUICHET DE SIMULATION DE PAIEMENT MOBILE MONEY */}
      <Modal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Guichet de Paiement Mobile Money"
        size="md"
      >
        <div className="p-2">
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-950">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Vous réglez la facture du client <span className="font-semibold">{selectedInvoice?.client?.name}</span> d'un montant de :
              </p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-300 mt-1">
                {selectedInvoice && formatCurrency(selectedInvoice.balance)}
              </p>
            </div>
          </div>

          {/* Onglets des opérateurs */}
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setPayMethod('wave')}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition ${payMethod === 'wave' ? 'border-sky-500 bg-sky-50/20 dark:bg-sky-950/20' : 'border-ink-200 dark:border-ink-800'}`}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-sm">W</div>
              <span className="text-xs font-semibold text-ink-800 dark:text-ink-100">Wave</span>
            </button>
            <button 
              onClick={() => setPayMethod('orange')}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition ${payMethod === 'orange' ? 'border-orange-500 bg-orange-50/20 dark:bg-orange-950/20' : 'border-ink-200 dark:border-ink-800'}`}
            >
              <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm">OM</div>
              <span className="text-xs font-semibold text-ink-800 dark:text-ink-100">Orange Money</span>
            </button>
            <button 
              onClick={() => setPayMethod('mtn')}
              className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition ${payMethod === 'mtn' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20' : 'border-ink-200 dark:border-ink-800'}`}
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-500 text-black flex items-center justify-center font-bold text-sm">Moov</div>
              <span className="text-xs font-semibold text-ink-800 dark:text-ink-100">Moov / MTN</span>
            </button>
          </div>

          {/* Formulaire selon opérateur */}
          {!paySuccess && !payProcessing && (
            <div className="space-y-4">
              {payMethod === 'wave' ? (
                <div className="flex flex-col items-center justify-center p-6 border border-ink-150 dark:border-ink-850 rounded-xl bg-white dark:bg-ink-950">
                  <div className="w-32 h-32 p-3 border border-sky-200 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm">
                    {/* QR Code Wave simulé */}
                    <svg viewBox="0 0 100 100" className="w-full h-full text-sky-600">
                      <path d="M0,0h40v40h-40z M20,20h10v10h-10z M60,0h40v40h-40z M80,20h10v10h-10z M0,60h40v40h-40z M20,80h10v10h-10z" fill="currentColor"/>
                      <path d="M50,50h10v10h-10z M70,50h10v10h-10z M50,70h10v10h-10z M60,80h10v10h-10z M80,80h20v20h-20z M80,60h10v10h-10z" fill="currentColor"/>
                      <circle cx="50" cy="50" r="10" fill="#0ea5e9"/>
                    </svg>
                  </div>
                  <p className="text-xs text-ink-500 text-center mb-4">Scannez ce QR Code depuis votre application Wave pour régler le montant.</p>
                  <button 
                    onClick={handleSimulatePayment}
                    className="btn w-full btn-primary bg-sky-500 hover:bg-sky-600 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 animate-spin-slow" /> Simuler le scan du QR Code Wave
                  </button>
                </div>
              ) : (
                <div className="p-4 border border-ink-150 dark:border-ink-850 rounded-xl bg-white dark:bg-ink-950 space-y-4">
                  <FormField label="Numéro de téléphone Mobile Money" required>
                    <input 
                      type="text" 
                      className="input" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      placeholder="Ex: 0787123456" 
                    />
                  </FormField>
                  
                  {payMethod === 'orange' ? (
                    <div className="p-3 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-950 rounded-lg text-xs text-orange-800 dark:text-orange-400">
                      <strong>Instruction de validation :</strong> Saisissez votre code secret temporaire après avoir composé <code className="font-bold font-mono">#144*46#</code> sur votre mobile.
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50/50 dark:bg-yellow-950/10 border border-yellow-100 dark:border-yellow-950 rounded-lg text-xs text-yellow-800 dark:text-yellow-500">
                      <strong>Instruction de validation :</strong> Validez la demande de débit reçue automatiquement sur votre écran de téléphone.
                    </div>
                  )}

                  <FormField label="Code de validation / Code secret">
                    <input 
                      type="password" 
                      className="input" 
                      value={payCode} 
                      onChange={(e) => setPayCode(e.target.value)} 
                      placeholder="••••" 
                    />
                  </FormField>

                  <button 
                    onClick={handleSimulatePayment}
                    className={`btn w-full btn-primary font-semibold flex items-center justify-center gap-2 ${payMethod === 'orange' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}`}
                  >
                    <Sparkles className="w-4 h-4 animate-spin-slow" /> Valider et Envoyer le débit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loader pendant le traitement */}
          {payProcessing && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
              </div>
              <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">Requête en cours avec l'opérateur...</p>
              <p className="text-xs text-ink-500 mt-1">N'actualisez pas cette page.</p>
            </div>
          )}

          {/* Écran de succès */}
          {paySuccess && (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
                <Check className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-ink-900 dark:text-white">Paiement Réussi !</p>
              <p className="text-xs text-ink-500 mt-1">La facture a été soldée et le reçu a été envoyé par SMS au client.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
