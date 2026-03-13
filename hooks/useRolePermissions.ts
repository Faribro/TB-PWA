import { useSession } from 'next-auth/react';

export function useRolePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  
  return {
    canSeeAllDistricts: role === 'State Program Manager' || role === 'NTEP Admin',
    canSeeCoordinatorFilter: role === 'State Program Manager',
    canSeePII: role !== 'NTEP Admin',
    isLockedToDistrict: role === 'District Coordinator',
    isDataEntryOnly: role === 'Data Entry Operator',
    lockedDistrict: role === 'District Coordinator' ? session?.user?.district : null,
  };
}
