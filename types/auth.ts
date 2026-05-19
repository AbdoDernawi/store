export type AppRole =
  | "super_admin"
  | "admin"
  | "marketer"
  | "delivery"
  | "customer";

export type AuthUser = {
  id: string;
  phone: string;
  fullName: string;
  role: AppRole;
};

export type AuthSession = AuthUser & {
  issuedAt: number;
  expiresAt: number;
};

export const roleHomePath: Record<AppRole, string> = {
  super_admin: "/admin/dashboard",
  admin: "/admin/dashboard",
  marketer: "/marketer/dashboard",
  delivery: "/delivery/dashboard",
  customer: "/customer/home",
};

export const protectedRoleGroups: Array<{
  prefix: string;
  roles: AppRole[];
}> = [
  { prefix: "/admin", roles: ["super_admin", "admin"] },
  { prefix: "/marketer", roles: ["marketer"] },
  { prefix: "/delivery", roles: ["delivery"] },
  { prefix: "/customer", roles: ["customer"] },
];
