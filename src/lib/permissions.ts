/** Permission catalog — shared by server (enforcement) and client (UI hiding). */
export const PERMISSIONS = {
  "dashboard.view": { group: "General", label: "View dashboard overview" },
  "users.view": { group: "Customers", label: "View customers" },
  "users.contact": { group: "Customers", label: "See full email / phone (unmasked)" },
  "users.manage": { group: "Customers", label: "Activate / deactivate / block customers" },
  "orders.view": { group: "Orders", label: "View orders, birth details and reports" },
  "orders.manage": { group: "Orders", label: "Regenerate reports, resend emails, cancel orders" },
  "payments.view": { group: "Orders", label: "Payment & provider logs (request / response)" },
  "payments.refund": { group: "Orders", label: "Refund payments" },
  "services.manage": { group: "Catalogue", label: "Create / edit reports, prices and visibility" },
  "coupons.manage": { group: "Catalogue", label: "Create / edit coupons" },
  "api.view": { group: "Catalogue", label: "AstrologyAPI usage, cache and test calls" },
  "messages.view": { group: "Support", label: "Contact form inbox" },
  "sessions.view": { group: "Security", label: "View session logs" },
  "sessions.revoke": { group: "Security", label: "Force logout sessions" },
  "audit.view": { group: "Security", label: "View audit trail" },
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];
export const isPermission = (p: string): p is Permission => Object.prototype.hasOwnProperty.call(PERMISSIONS, p);

/** Admin-only capabilities (never grantable to staff). */
export const ADMIN_ONLY = ["staff.manage", "settings.manage"] as const;

export type AdminRole = "admin" | "staff";
export type AdminIdentity = { id: number; name: string; email: string; role: AdminRole; permissions: Permission[]; avatar?: string | null };

export function can(admin: Pick<AdminIdentity, "role" | "permissions">, perm: Permission | (typeof ADMIN_ONLY)[number]) {
  if (admin.role === "admin") return true;
  return (admin.permissions as string[]).includes(perm);
}
