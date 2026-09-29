// Admin roles.
//
// The previous version of this file exported a hardcoded PASSCODE and a cookie
// value of the literal string 'authenticated'. Both were in a public repo, and
// the proxy compared the cookie to that constant — so anyone could set the
// cookie by hand and walk into /admin. Sign-in now goes through Supabase Auth
// with email and password, and access is checked against the public.admins
// table — holding valid credentials is not the same as being an admin.

export const ROLE_OWNER = 'owner';
export const ROLE_ADMIN = 'admin';

/** Owners may manage the admin list and read the audit log. */
export function canManageUsers(admin) {
  return admin?.role === ROLE_OWNER;
}

/** The audit log is owner-only; it records what every admin did. */
export function canViewAudit(admin) {
  return admin?.role === ROLE_OWNER;
}

export const ROLE_LABELS = {
  [ROLE_OWNER]: 'Owner',
  [ROLE_ADMIN]: 'Admin',
};

export const ROLE_HINTS = {
  [ROLE_OWNER]: 'Full access, plus managing admins and reading the audit log.',
  [ROLE_ADMIN]: 'Customers, orders, quotations, invoices and ledger.',
};
