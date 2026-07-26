// Domain types mirroring the Supabase schema. Kept deliberately permissive
// (many optional fields) so partial inserts and list projections type-check.

export interface Organization {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency_code: string;
  timezone: string;
  locale: string;
  logo_url: string | null;
  primary_color: string | null;
  is_active: boolean;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface Agency {
  id: string;
  organization_id: string;
  branch_id: string | null;
  name: string;
  code: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  phone: string | null;
  manager_name: string | null;
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_platform_admin: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  organization_id: string | null;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  created_at: string;
}

export interface VehicleCategory {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  organization_id: string;
  agency_id: string | null;
  category_id: string | null;
  internal_number: string | null;
  registration: string | null;
  vin: string | null;
  brand: string;
  model: string;
  version: string | null;
  category: string | null;
  vehicle_type: string | null;
  color: string | null;
  year_manufactured: number | null;
  first_registration_date: string | null;
  seats: number | null;
  fuel_type: string | null;
  tank_capacity: number | null;
  estimated_consumption: number | null;
  transmission: string | null;
  power_hp: number | null;
  current_mileage: number;
  ownership_type: string;
  owner_name: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  estimated_value: number | null;
  monthly_depreciation: number | null;
  status: string;
  availability: string;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  agency?: Agency | null;
  category_ref?: VehicleCategory | null;
}

export interface VehicleDocument {
  id: string;
  organization_id: string;
  vehicle_id: string;
  type: string;
  document_number: string | null;
  issuer: string | null;
  start_date: string | null;
  expiry_date: string | null;
  cost: number | null;
  status: string;
  file_url: string | null;
  reminder_enabled: boolean;
  responsible: string | null;
  vehicle?: Vehicle | null;
}

export interface Driver {
  id: string;
  organization_id: string;
  agency_id: string | null;
  matricule: string | null;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  gender: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact: string | null;
  hire_date: string | null;
  contract_type: string | null;
  status: string;
  license_number: string | null;
  license_category: string | null;
  license_issue_date: string | null;
  license_expiry_date: string | null;
  experience_years: number | null;
  certifications: string | null;
  languages: string | null;
  salary: number | null;
  bonus: number | null;
  rating: number | null;
  sanctions: string | null;
  notes: string | null;
  archived_at: string | null;
  agency?: Agency | null;
}

export interface Client {
  id: string;
  organization_id: string;
  type: string;
  name: string;
  representative: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  trade_register: string | null;
  id_document: string | null;
  credit_limit: number | null;
  payment_delay_days: number | null;
  risk_level: string;
  account_status: string;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  type: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  services: string | null;
  rating: number | null;
  notes: string | null;
}

export interface Rental {
  id: string;
  organization_id: string;
  reference: string | null;
  booking_id: string | null;
  client_id: string;
  vehicle_id: string;
  driver_id: string | null;
  agency_departure_id: string | null;
  agency_return_id: string | null;
  start_datetime: string;
  planned_return_datetime: string;
  actual_return_datetime: string | null;
  destination: string | null;
  days_count: number | null;
  km_included: number | null;
  daily_rate: number;
  km_rate: number | null;
  fuel_provided: boolean | null;
  deposit: number;
  discount: number | null;
  taxes: number | null;
  extra_fees: number | null;
  total_amount: number;
  status: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  client?: Client | null;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
}

export interface Mission {
  id: string;
  organization_id: string;
  reference: string | null;
  client_id: string | null;
  vehicle_id: string | null;
  primary_driver_id: string | null;
  secondary_driver_id: string | null;
  agency_id: string | null;
  mission_type: string;
  departure_point: string | null;
  destination: string | null;
  intermediate_stops: string | null;
  start_datetime: string;
  planned_end_datetime: string;
  actual_end_datetime: string | null;
  passengers: number | null;
  confidentiality: string;
  security_level: string;
  instructions: string | null;
  onsite_contact: string | null;
  billed_amount: number;
  estimated_costs: number | null;
  advance_amount: number;
  status: string;
  created_at: string;
  client?: Client | null;
  vehicle?: Vehicle | null;
  primary_driver?: Driver | null;
}

export interface VehicleMovement {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string | null;
  movement_type: string;
  rental_id: string | null;
  mission_id: string | null;
  datetime: string;
  mileage: number | null;
  fuel_level: string | null;
  vehicle_condition: string | null;
  accessories: string | null;
  damages: string | null;
  missing_items: string | null;
  authorized_by: string | null;
  controlled_by: string | null;
  decision: string | null;
  notes: string | null;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
}

export interface FuelEntry {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string | null;
  date: string;
  station_name: string | null;
  fuel_type: string | null;
  quantity: number;
  price_per_unit: number;
  amount: number;
  mileage: number | null;
  level_before: string | null;
  level_after: string | null;
  payment_method: string | null;
  fuel_card: string | null;
  notes: string | null;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
}

export interface MaintenanceRequest {
  id: string;
  organization_id: string;
  vehicle_id: string;
  reference: string | null;
  requested_by: string | null;
  issue_type: string;
  description: string | null;
  priority: string;
  estimated_cost: number | null;
  status: string;
  created_at: string;
  vehicle?: Vehicle | null;
}

export interface WorkOrder {
  id: string;
  organization_id: string;
  reference: string | null;
  vehicle_id: string;
  garage_supplier_id: string | null;
  description: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  labor_cost: number | null;
  parts_cost: number | null;
  start_date: string | null;
  end_date: string | null;
  return_to_service_date: string | null;
  status: string;
  vehicle?: Vehicle | null;
}

export interface Expense {
  id: string;
  organization_id: string;
  reference: string | null;
  vehicle_id: string | null;
  mission_id: string | null;
  agency_id: string | null;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  supplier_id: string | null;
  requested_by: string | null;
  approved_by: string | null;
  justification_url: string | null;
  status: string;
  vehicle?: Vehicle | null;
}

export interface Invoice {
  id: string;
  organization_id: string;
  reference: string | null;
  client_id: string;
  rental_id: string | null;
  mission_id: string | null;
  quote_id: string | null;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  discount: number;
  taxes: number;
  total: number;
  paid_amount: number;
  balance: number;
  status: string;
  notes: string | null;
  client?: Client | null;
}

export interface InvoiceItem {
  id: string;
  organization_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id: string;
  organization_id: string;
  reference: string | null;
  invoice_id: string | null;
  client_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  account_type: string;
  notes: string | null;
  receipt_url: string | null;
  client?: Client | null;
  invoice?: Invoice | null;
}

export interface Accident {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string | null;
  accident_date: string;
  location: string | null;
  description: string | null;
  accident_type: string | null;
  severity: string;
  third_parties: string | null;
  injuries: string | null;
  material_damage: string | null;
  estimated_amount: number | null;
  deductible: number | null;
  status: string;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
}

export interface Incident {
  id: string;
  organization_id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  incident_type: string;
  incident_date: string;
  description: string | null;
  resolution: string | null;
  status: string;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
}

export interface Fine {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string | null;
  fine_date: string;
  reason: string | null;
  location: string | null;
  amount: number;
  authority: string | null;
  payment_deadline: string | null;
  paid_by: string | null;
  status: string;
  salary_deducted: boolean;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string | null;
  severity: string;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  module: string | null;
  entity_type: string | null;
  entity_id: string | null;
  old_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface GpsPosition {
  id: string;
  organization_id: string;
  vehicle_id: string;
  gps_device_id: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  engine_state: string | null;
  battery_level: number | null;
  recorded_at: string;
  is_demo: boolean;
  vehicle?: Vehicle | null;
}

export interface GpsDevice {
  id: string;
  organization_id: string;
  vehicle_id: string | null;
  provider: string;
  imei: string | null;
  device_id: string | null;
  sim_phone: string | null;
  installed_at: string | null;
  is_active: boolean;
  battery_level: number | null;
  last_signal_at: string | null;
  vehicle?: Vehicle | null;
}

export interface ApplicationSettings {
  id: string;
  organization_id: string;
  settings: Record<string, unknown>;
}

export interface SalesDeal {
  id: string;
  organization_id: string;
  vehicle_id: string;
  client_id: string;
  sale_price: number;
  payment_type: string;
  down_payment: number;
  installments_count: number | null;
  monthly_payment: number;
  status: string;
  sale_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle | null;
  client?: Client | null;
}

export interface Inspection {
  id: string;
  organization_id: string;
  rental_id: string;
  type: 'check_in' | 'check_out';
  inspector_name: string;
  odometer: number;
  fuel_level: 'empty' | 'quarter' | 'half' | 'three_quarters' | 'full';
  cleanliness: 'clean' | 'average' | 'dirty';
  tyres_ok: boolean;
  spare_wheel_ok: boolean;
  damages: Array<{ area: string; damage_type: string }>;
  notes: string | null;
  signed_by: string;
  created_at: string;
}

