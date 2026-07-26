import { useAuth } from './auth';

export function usePermissions() {
  const { permissions, profile } = useAuth();

  const isPlatformAdmin = !!profile?.is_platform_admin;
  const hasAll = permissions.includes('*');

  const can = (perm: string): boolean => {
    if (isPlatformAdmin || hasAll) return true;
    return permissions.includes(perm);
  };

  const canAny = (perms: string[]): boolean => perms.some(can);

  return { can, canAny, isPlatformAdmin, permissions };
}
