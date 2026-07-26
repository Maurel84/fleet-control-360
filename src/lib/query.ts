import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

interface UseQueryOptions {
  eq?: [string, string | boolean | null];
  order?: [string, { ascending?: boolean }];
  limit?: number;
}

/**
 * Generic org-scoped query hook. Automatically filters by the current
 * user's organization_id and re-fetches when the org changes.
 */
export function useQuery<T>(
  table: string,
  select: string,
  options?: UseQueryOptions,
): { data: T[] | null; loading: boolean; error: string | null; refetch: () => void } {
  const { profile } = useAuth();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!profile?.organization_id) {
      setData(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    let q = supabase.from(table).select(select).eq('organization_id', profile.organization_id);
    if (options?.eq) q = q.eq(options.eq[0], options.eq[1] as never);
    if (options?.order) q = q.order(options.order[0], options.order[1]);
    if (options?.limit) q = q.limit(options.limit);
    q.then(({ data: rows, error: err }) => {
      if (!active) return;
      if (err) {
        setError(err.message);
        setData([]);
      } else {
        setError(null);
        setData((rows as T[]) ?? []);
      }
      setLoading(false);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id, table, select, nonce, options?.eq?.[0], options?.eq?.[1], options?.order?.[0], options?.limit]);

  return { data, loading, error, refetch };
}

/** Fetch a single row by id within the user's org. */
export function useSingle<T>(
  table: string,
  select: string,
  id: string | undefined,
): { data: T | null; loading: boolean; error: string | null } {
  const { profile } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !profile?.organization_id) {
      setData(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from(table)
      .select(select)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .maybeSingle()
      .then(({ data: row, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else setError(null);
        setData(row as T | null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [table, select, id, profile?.organization_id]);

  return { data, loading, error };
}
