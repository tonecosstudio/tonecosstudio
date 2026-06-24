export const ADMIN_ACCESS_ROLES = ["admin", "super_admin"] as const;

export type AdminAccessRole = (typeof ADMIN_ACCESS_ROLES)[number];

const ADMIN_ACCESS_ROLE_SET = new Set<string>(ADMIN_ACCESS_ROLES);

export function hasAdminAccessRole(
  role: string | null | undefined,
): role is AdminAccessRole {
  return typeof role === "string" && ADMIN_ACCESS_ROLE_SET.has(role);
}
