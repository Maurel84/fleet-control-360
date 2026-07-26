import {
  LayoutDashboard, Car, Users, UserCircle, CalendarCheck, Truck, FileText,
  Wrench, Fuel, Wallet, AlertTriangle, Building2, BarChart3, Bell,
  Settings, ShieldCheck, MapPin, ClipboardList, ShoppingBag,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}
export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Exploitation',
    items: [
      { to: '/vehicles', label: 'Parc automobile', icon: Car, permission: 'vehicles.read' },
      { to: '/drivers', label: 'Chauffeurs', icon: UserCircle, permission: 'drivers.read' },
      { to: '/clients', label: 'Clients', icon: Users, permission: 'clients.read' },
      { to: '/rentals', label: 'Locations', icon: CalendarCheck, permission: 'rentals.read' },
      { to: '/planning', label: 'Planning', icon: CalendarCheck, permission: 'rentals.read' },
      { to: '/sales', label: 'Vente & Crédit', icon: ShoppingBag, permission: 'finance.read' },
      { to: '/missions', label: 'Missions & escortes', icon: Truck, permission: 'missions.read' },
      { to: '/movements', label: 'Sorties & retours', icon: ClipboardList, permission: 'movements.read' },
    ],
  },
  {
    title: 'Maintenance',
    items: [
      { to: '/maintenance', label: 'Maintenance', icon: Wrench, permission: 'maintenance.read' },
      { to: '/fuel', label: 'Carburant', icon: Fuel, permission: 'fuel.read' },
      { to: '/incidents', label: 'Accidents & incidents', icon: AlertTriangle, permission: 'vehicles.read' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/finance/invoices', label: 'Factures', icon: FileText, permission: 'finance.read' },
      { to: '/finance/payments', label: 'Paiements', icon: Wallet, permission: 'finance.read' },
      { to: '/finance/expenses', label: 'Dépenses', icon: Wallet, permission: 'finance.read' },
    ],
  },
  {
    title: 'Suivi',
    items: [
      { to: '/gps', label: 'GPS', icon: MapPin, permission: 'gps.read' },
      { to: '/drivers/eco', label: 'Éco-Conduite', icon: ShieldCheck, permission: 'drivers.read' },
      { to: '/notifications', label: 'Notifications', icon: Bell, permission: 'notifications.read' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/agencies', label: 'Agences', icon: Building2 },
      { to: '/suppliers', label: 'Fournisseurs', icon: Building2 },
      { to: '/reports', label: 'Rapports', icon: BarChart3, permission: 'reports.read' },
      { to: '/audit', label: "Journal d'audit", icon: ShieldCheck, permission: 'audit.read' },
      { to: '/settings', label: 'Paramètres', icon: Settings, permission: 'settings.read' },
    ],
  },
];
