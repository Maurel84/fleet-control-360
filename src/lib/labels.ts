// Shared label maps for enums used across the app (French UI).

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Réservé',
  rented: 'En location',
  on_mission: 'En mission',
  assigned: 'Affecté',
  maintenance: 'En entretien',
  repair: 'En réparation',
  immobilized: 'Immobilisé',
  accident: 'Accidenté',
  seized: 'Saisi',
  out_of_service: 'Hors service',
  sold: 'Vendu',
};

export const VEHICLE_STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  reserved: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  rented: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  on_mission: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  assigned: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  repair: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  immobilized: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  accident: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  seized: 'bg-stone-100 text-stone-700 dark:bg-stone-900/40 dark:text-stone-300',
  out_of_service: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  sold: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
};

export const DRIVER_STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  on_mission: 'En mission',
  resting: 'En repos',
  absent: 'Absent',
  suspended: 'Suspendu',
  on_leave: 'En congé',
  unavailable: 'Indisponible',
  terminated: 'Contrat terminé',
};

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  on_mission: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  resting: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  absent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  on_leave: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  unavailable: 'bg-stone-100 text-stone-700 dark:bg-stone-900/40 dark:text-stone-300',
  terminated: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
};

export const RENTAL_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  quote_sent: 'Devis envoyé',
  confirmed: 'Confirmée',
  paid: 'Payée',
  vehicle_delivered: 'Véhicule remis',
  in_progress: 'En cours',
  extended: 'Prolongée',
  late: 'En retard',
  returned: 'Retournée',
  closed: 'Clôturée',
  canceled: 'Annulée',
  dispute: 'Litige',
};

export const RENTAL_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  quote_sent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  paid: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  vehicle_delivered: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  extended: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  late: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  returned: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  canceled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  dispute: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export const MISSION_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  confirmed: 'Confirmée',
  team_assigned: 'Équipe affectée',
  departed: 'Départ effectué',
  in_progress: 'En cours',
  arrived: 'Arrivée confirmée',
  completed: 'Terminée',
  suspended: 'Suspendue',
  canceled: 'Annulée',
  incident: 'Incident signalé',
};

export const MISSION_STATUS_COLORS: Record<string, string> = {
  planned: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  team_assigned: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  departed: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  arrived: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  canceled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  incident: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

export const MISSION_TYPE_LABELS: Record<string, string> = {
  vip_escort: 'Escorte VIP',
  personnel_transport: 'Transport du personnel',
  shuttle: 'Navette',
  airport_transfer: 'Transfert aéroport',
  convoyage: 'Convoyage',
  close_protection: 'Sécurité rapprochée',
  administrative: 'Mission administrative',
  logistics: 'Logistique',
  school_transport: 'Transport scolaire',
  tourist_transport: 'Transport touristique',
  delivery: 'Livraison',
  long_term: 'Mission longue durée',
  other: 'Autre',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Espèces',
  transfer: 'Virement',
  check: 'Chèque',
  card: 'Carte bancaire',
  mobile_money: 'Mobile Money',
  online: 'Paiement en ligne',
  credit: 'À crédit',
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  carburant: 'Carburant',
  entretien: 'Entretien',
  reparation: 'Réparation',
  pieces: 'Pièces',
  assurance: 'Assurance',
  vignette: 'Vignette',
  visite_technique: 'Visite technique',
  salaires: 'Salaires',
  primes: 'Primes',
  peages: 'Péages',
  parking: 'Parking',
  lavage: 'Lavage',
  amendes: 'Amendes',
  location_partenaire: 'Location partenaire',
  frais_mission: 'Frais de mission',
  autres: 'Autres',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  unpaid: 'Impayée',
  partial: 'Partielle',
  paid: 'Payée',
  overdue: 'En retard',
  canceled: 'Annulée',
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  unpaid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  partial: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  canceled: 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
};

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: 'Particulier',
  company: 'Entreprise',
  administration: 'Administration',
  ngo: 'ONG',
  partner: 'Partenaire',
  agency: 'Agence',
  event_organizer: 'Organisateur',
};

export const FUEL_TYPE_LABELS: Record<string, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  hybride: 'Hybride',
  electrique: 'Électrique',
  gaz: 'Gaz',
};

export const VEHICLE_DOCUMENT_LABELS: Record<string, string> = {
  insurance: 'Assurance',
  carte_grise: 'Carte grise',
  visite_technique: 'Visite technique',
  vignette: 'Vignette',
  certificat_conformite: 'Certificat de conformité',
  licence_transport: 'Licence de transport',
  autorisation_speciale: 'Autorisation spéciale',
  document_douanier: 'Document douanier',
  controle_technique: 'Contrôle technique',
  certificat_propriete: 'Certificat de propriété',
  contrat_leasing: 'Contrat de leasing',
  document_gps: 'Document GPS',
  autre: 'Autre',
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  valid: 'Valide',
  expiring: 'Expire bientôt',
  expired: 'Expiré',
  renewing: 'En renouvellement',
};

export const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  valid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  expiring: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  renewing: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

export const NOTIFICATION_SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
};

export const RISK_LEVEL_COLORS: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const SALES_PAYMENT_TYPE_LABELS: Record<string, string> = {
  cash: 'Comptant',
  credit: 'Crédit',
  leasing: 'Leasing',
  installment: 'Échéances',
};

export const SALES_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending_approval: 'En attente',
  approved: 'Validé',
  active_installments: 'Mensualités actives',
  completed: 'Clôturé',
  cancelled: 'Annulé',
};

export const SALES_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  active_installments: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};
