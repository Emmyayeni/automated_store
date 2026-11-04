// ============================================================
// INVENTORY MANAGEMENT SYSTEM — ROLES & PERMISSIONS
// Blueprint: ADMIN | BRANCH_MANAGER | CLERK | CASHIER
// ============================================================

export const ROLES = {
  ADMIN: "ADMIN",
  BRANCH_MANAGER: "BRANCH_MANAGER",
  MANAGER: "MANAGER", // legacy alias for BRANCH_MANAGER
  CLERK: "CLERK",
  CASHIER: "CASHIER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const normalizeRole = (role: string): Role => {
  const upper = role.toUpperCase();
  if (upper === "MANAGER") return "BRANCH_MANAGER"; // map legacy
  if (Object.values(ROLES).includes(upper as Role)) return upper as Role;
  throw new Error(`Invalid role: ${role}`);
};

export const isValidRole = (role: string): role is Role => {
  try { normalizeRole(role); return true; } catch { return false; }
};

// ---- Dashboard routing ----
export const ROLE_DASHBOARD_PATH: Record<string, string> = {
  ADMIN:          "/admin",
  BRANCH_MANAGER: "/admin",     // Managers use the admin inventory suite scoped to their branch
  MANAGER:        "/admin",
  CLERK:          "/admin/stock-in", // Clerks land directly on operational stock-in
  CASHIER:        "/cashier",
  // lowercase fallbacks
  admin:          "/admin",
  branch_manager: "/admin",
  manager:        "/admin",
  clerk:          "/admin/stock-in",
  cashier:        "/cashier",
};

// ---- Permission definitions ----
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: "view_dashboard",
  // Users
  MANAGE_USERS: "manage_users",
  // Branches
  MANAGE_BRANCHES: "manage_branches",
  VIEW_ALL_BRANCHES: "view_all_branches",
  // Products
  MANAGE_PRODUCTS: "manage_products",
  VIEW_PRODUCTS: "view_products",
  // Categories
  MANAGE_CATEGORIES: "manage_categories",
  // Inventory
  VIEW_ALL_INVENTORY: "view_all_inventory",
  VIEW_BRANCH_INVENTORY: "view_branch_inventory",
  // Stock operations
  RECORD_STOCK_IN: "record_stock_in",
  RECORD_STOCK_OUT: "record_stock_out",
  ADJUST_INVENTORY: "adjust_inventory",
  // Transfers
  REQUEST_TRANSFER: "request_transfer",
  APPROVE_TRANSFER: "approve_transfer",
  DISPATCH_TRANSFER: "dispatch_transfer",
  RECEIVE_TRANSFER: "receive_transfer",
  // Reports
  VIEW_ALL_REPORTS: "view_all_reports",
  VIEW_BRANCH_REPORTS: "view_branch_reports",
  EXPORT_REPORTS: "export_reports",
  // Settings
  MANAGE_SETTINGS: "manage_settings",
  // Sales (Cashier)
  PROCESS_SALES: "process_sales",
  VIEW_SALES: "view_sales",
  // Misc
  VIEW_AUDIT_LOGS: "view_audit_logs",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ---- Role → Permission mapping ----
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_BRANCHES,
    PERMISSIONS.VIEW_ALL_BRANCHES,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.VIEW_ALL_INVENTORY,
    PERMISSIONS.VIEW_BRANCH_INVENTORY,
    PERMISSIONS.RECORD_STOCK_IN,
    PERMISSIONS.RECORD_STOCK_OUT,
    PERMISSIONS.ADJUST_INVENTORY,
    PERMISSIONS.REQUEST_TRANSFER,
    PERMISSIONS.APPROVE_TRANSFER,
    PERMISSIONS.DISPATCH_TRANSFER,
    PERMISSIONS.RECEIVE_TRANSFER,
    PERMISSIONS.VIEW_ALL_REPORTS,
    PERMISSIONS.VIEW_BRANCH_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  BRANCH_MANAGER: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_BRANCH_INVENTORY,
    PERMISSIONS.RECORD_STOCK_IN,
    PERMISSIONS.RECORD_STOCK_OUT,
    PERMISSIONS.ADJUST_INVENTORY,
    PERMISSIONS.REQUEST_TRANSFER,
    PERMISSIONS.APPROVE_TRANSFER,
    PERMISSIONS.DISPATCH_TRANSFER,
    PERMISSIONS.RECEIVE_TRANSFER,
    PERMISSIONS.VIEW_BRANCH_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  MANAGER: [ // legacy alias — same as BRANCH_MANAGER
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_BRANCH_INVENTORY,
    PERMISSIONS.RECORD_STOCK_IN,
    PERMISSIONS.RECORD_STOCK_OUT,
    PERMISSIONS.ADJUST_INVENTORY,
    PERMISSIONS.REQUEST_TRANSFER,
    PERMISSIONS.APPROVE_TRANSFER,
    PERMISSIONS.DISPATCH_TRANSFER,
    PERMISSIONS.RECEIVE_TRANSFER,
    PERMISSIONS.VIEW_BRANCH_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  CLERK: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_BRANCH_INVENTORY,
    PERMISSIONS.RECORD_STOCK_IN,
    PERMISSIONS.RECORD_STOCK_OUT,
    PERMISSIONS.REQUEST_TRANSFER,
    PERMISSIONS.RECEIVE_TRANSFER,
    PERMISSIONS.VIEW_BRANCH_REPORTS,
  ],
  CASHIER: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_BRANCH_INVENTORY,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.VIEW_SALES,
  ],
};

// ---- Helper: check permission for a role ----
export const hasPermission = (role: string, permission: Permission): boolean => {
  try {
    const normalized = normalizeRole(role);
    return ROLE_PERMISSIONS[normalized]?.includes(permission) ?? false;
  } catch {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }
};

// ---- Helper: check if user can access a branch ----
export const canAccessBranch = (
  userRole: string,
  userBranchId: string | null | undefined,
  targetBranchId: string
): boolean => {
  try {
    const normalized = normalizeRole(userRole);
    if (normalized === "ADMIN") return true;
    return userBranchId === targetBranchId;
  } catch {
    return false;
  }
};

// ---- Helper: roles that can manage inventory for a branch ----
export const INVENTORY_WRITER_ROLES: Role[] = ["ADMIN", "BRANCH_MANAGER", "MANAGER", "CLERK"];
export const TRANSFER_APPROVER_ROLES: Role[] = ["ADMIN", "BRANCH_MANAGER", "MANAGER"];
