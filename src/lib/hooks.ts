import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { Agency, Vehicle, Client, Driver, Supplier, VehicleCategory } from './types';

export function useOrg<T>(
  table: string,
  select: string,
  extra?: { eq?: [string, string]; order?: [string, { ascending?: boolean }] },
): { data: T[] | null; loading: boolean } {
  const { profile } = useAuth();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.organization_id) { setData(null); setLoading(false); return; }
    let active = true;
    setLoading(true);
    let q = supabase.from(table).select(select).eq('organization_id', profile.organization_id);
    if (extra?.eq) q = q.eq(extra.eq[0], extra.eq[1]);
    if (extra?.order) q = q.order(extra.order[0], extra.order[1]);
    q.then(({ data: rows }) => {
      if (!active) return;
      setData((rows as T[]) ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [profile?.organization_id, table, select]);

  return { data, loading };
}

export function useAgencies() {
  return useOrg<Agency>('agencies', '*', { order: ['name', { ascending: true }] });
}
export function useVehicles() {
  return useOrg<Vehicle>('vehicles', 'id, internal_number, registration, brand, model, status', { order: ['brand', { ascending: true }] });
}
export function useClients() {
  return useOrg<Client>('clients', 'id, name, type, account_status', { order: ['name', { ascending: true }] });
}
export function useDrivers() {
  return useOrg<Driver>('drivers', 'id, first_name, last_name, status, matricule', { order: ['first_name', { ascending: true }] });
}
export function useSuppliers() {
  return useOrg<Supplier>('suppliers', 'id, name, type', { order: ['name', { ascending: true }] });
}
export function useVehicleCategories() {
  return useOrg<VehicleCategory>('vehicle_categories', '*', { order: ['name', { ascending: true }] });
}
