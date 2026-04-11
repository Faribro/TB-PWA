/**
 * lib/constants/roles.ts
 * Central source of truth for RBAC roles and permissions
 * Enterprise-grade type safety for healthcare data security
 */

// Strict role enum - prevents typos and enables autocomplete
export const Role = {
  ADMIN: 'admin',
  PROGRAM_MANAGER: 'Program Manager',
  STATE_PROGRAM_MANAGER: 'State Program Manager',
  ME_OFFICER: 'M&E Officer',
  PRISON_COORDINATOR: 'Prison Coordinator',
} as const;

// Type-safe role type derived from enum
export type UserRole = typeof Role[keyof typeof Role];

// Legacy short codes for backward compatibility
export const RoleShortCode = {
  ADMIN: 'admin',
  PM: 'PM',
  SPM: 'SPM',
  ME: 'ME',
  PC: 'PC',
} as const;

// Map short codes to full role names
export const ROLE_MAPPING: Record<string, UserRole> = {
  'admin': Role.ADMIN,
  'PM': Role.PROGRAM_MANAGER,
  'SPM': Role.STATE_PROGRAM_MANAGER,
  'ME': Role.ME_OFFICER,
  'PC': Role.PRISON_COORDINATOR,
  // Full names map to themselves
  'Program Manager': Role.PROGRAM_MANAGER,
  'State Program Manager': Role.STATE_PROGRAM_MANAGER,
  'M&E Officer': Role.ME_OFFICER,
  'Prison Coordinator': Role.PRISON_COORDINATOR,
};

// Normalize role to canonical form
export function normalizeRole(role: string | undefined): UserRole | null {
  if (!role) return null;
  return ROLE_MAPPING[role] || null;
}

// Data access tiers
export enum DataAccessTier {
  NATIONAL = 'NATIONAL',     // See all records
  STATE = 'STATE',           // See state-level records
  DISTRICT = 'DISTRICT',     // See district-level records
  FACILITY = 'FACILITY',     // See facility/staff-level records
}

// Role to data access tier mapping
export const ROLE_DATA_ACCESS: Record<UserRole, DataAccessTier> = {
  [Role.ADMIN]: DataAccessTier.NATIONAL,
  [Role.PROGRAM_MANAGER]: DataAccessTier.NATIONAL,
  [Role.STATE_PROGRAM_MANAGER]: DataAccessTier.STATE,
  [Role.ME_OFFICER]: DataAccessTier.STATE,
  [Role.PRISON_COORDINATOR]: DataAccessTier.FACILITY,
};

// Route permissions - defines which roles can access which routes
export const RoutePermissions: Record<string, readonly UserRole[]> = {
  '/dashboard/command-hub': [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  '/dashboard/my-submissions': [
    Role.PRISON_COORDINATOR,
  ],
  '/dashboard/submit-new': [
    Role.PRISON_COORDINATOR,
  ],
  '/dashboard/vertex': [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  '/dashboard/follow-up': [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  '/dashboard/mande': [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  '/dashboard/gis': [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  '/dashboard/settings': [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
    Role.PRISON_COORDINATOR,
  ],
  '/admin': [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
  ],
  '/docs': [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
    Role.PRISON_COORDINATOR,
  ],
} as const;

// Feature permissions - granular control over UI features
export const FeaturePermissions: Record<string, readonly UserRole[]> = {
  EXPORT_DATA: [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  MANAGE_USERS: [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
  ],
  VIEW_ANALYTICS: [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  EDIT_PATIENT_DATA: [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  VIEW_GIS_MAP: [
    Role.ADMIN,
    Role.PROGRAM_MANAGER,
    Role.STATE_PROGRAM_MANAGER,
    Role.ME_OFFICER,
  ],
  SUBMIT_FORMS: [
    Role.PRISON_COORDINATOR,
  ],
} as const;

// Helper: Check if user has permission for a route
export function hasRoutePermission(userRole: UserRole | null, route: string): boolean {
  if (!userRole) return false;
  
  // Find matching route pattern
  const routeKey = Object.keys(RoutePermissions).find(key => route.startsWith(key));
  if (!routeKey) return false;
  
  const allowedRoles = RoutePermissions[routeKey as keyof typeof RoutePermissions];
  return allowedRoles.includes(userRole);
}

// Helper: Check if user has a specific feature permission
export function hasFeaturePermission(
  userRole: UserRole | null,
  feature: keyof typeof FeaturePermissions
): boolean {
  if (!userRole) return false;
  return FeaturePermissions[feature].includes(userRole);
}

// Helper: Get default route for a role
export function getDefaultRoute(userRole: UserRole | null): string {
  if (!userRole) return '/login';
  
  switch (userRole) {
    case Role.PRISON_COORDINATOR:
      return '/dashboard/my-submissions';
    case Role.ME_OFFICER:
    case Role.STATE_PROGRAM_MANAGER:
      return '/dashboard/vertex';
    case Role.ADMIN:
    case Role.PROGRAM_MANAGER:
      return '/dashboard/command-hub';
    default:
      return '/dashboard/command-hub';
  }
}

// Helper: Get accessible routes for a role
export function getAccessibleRoutes(userRole: UserRole | null): string[] {
  if (!userRole) return [];
  
  return Object.entries(RoutePermissions)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([route]) => route);
}
