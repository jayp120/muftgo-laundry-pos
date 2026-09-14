/**
 * Role-based access control for MuftGo Laundry POS.
 *
 * Roles:
 * - owner   : Superadmin. Created ONLY via public signup. Full access.
 * - manager : Runs the shop. Everything except stores/staff/settings & broadcast.
 * - counter : Minimal billing. POS + orders (+payments) + customers only.
 * - worker  : Floor only. Order status progression, no payments, no billing.
 *
 * Legacy values from before v1.1 ('laundry_owner', 'staff') are normalized so
 * old rows keep working until the rename migration runs.
 */

export type UserRole = 'owner' | 'manager' | 'counter' | 'worker';

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  counter: 'Counter Staff',
  worker: 'Worker',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'Superadmin - full access, created at signup',
  manager: 'Runs the shop - billing, services, expenses, reports',
  counter: 'Billing only - new orders, payments, customers',
  worker: 'Floor only - order status updates, no payments',
};

/** Roles an owner can assign to shop staff (owner itself is signup-only). */
export const ASSIGNABLE_STAFF_ROLES: UserRole[] = ['manager', 'counter', 'worker'];

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  laundry_owner: 'owner',
  staff: 'counter',
};

const KNOWN_ROLES: UserRole[] = ['owner', 'manager', 'counter', 'worker'];

/** Normalize any stored role value (legacy or new) to a valid UserRole. */
export const normalizeRole = (role?: string | null): UserRole => {
  if (!role) return 'counter';
  if (LEGACY_ROLE_MAP[role]) return LEGACY_ROLE_MAP[role];
  return (KNOWN_ROLES as string[]).includes(role) ? (role as UserRole) : 'counter';
};

export type AppSection =
  | 'pos'
  | 'orders'
  | 'customers'
  | 'services'
  | 'expenses'
  | 'revenue'
  | 'stores'
  | 'broadcast';

const SECTION_ACCESS: Record<AppSection, UserRole[]> = {
  pos: ['owner', 'manager', 'counter'],
  orders: ['owner', 'manager', 'counter', 'worker'],
  customers: ['owner', 'manager', 'counter'],
  services: ['owner', 'manager'],
  expenses: ['owner', 'manager'],
  revenue: ['owner', 'manager'],
  stores: ['owner'],
  broadcast: ['owner'],
};

export const canAccess = (section: AppSection, role?: string | null): boolean =>
  SECTION_ACCESS[section].includes(normalizeRole(role));

/** Worker can progress order status but must never touch money. */
export const canCollectPayments = (role?: string | null): boolean =>
  normalizeRole(role) !== 'worker';

/** Today's revenue/expense figures are visible to owner + manager only. */
export const canSeeRevenue = (role?: string | null): boolean => {
  const r = normalizeRole(role);
  return r === 'owner' || r === 'manager';
};

export const isOwnerRole = (role?: string | null): boolean => normalizeRole(role) === 'owner';

/** Where each role lands right after sign-in (counter → billing, worker → queue). */
export const getDefaultPath = (role?: string | null): string => {
  const r = normalizeRole(role);
  if (r === 'worker') return '/order-history';
  if (r === 'counter') return '/pos';
  return '/home';
};
