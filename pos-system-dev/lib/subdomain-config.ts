// Subdomain configuration for different environments
export const SUBDOMAIN_CONFIG = {
  development: {
    main: "http://yourdomain.local:3000",
    pos: "http://pos.yourdomain.local:3000",
    admin: "http://admin.yourdomain.local:3000",
    manager: "http://manager.yourdomain.local:3000",
    cashier: "http://cashier.yourdomain.local:3000",
  },
  production: {
    main: process.env.NEXT_PUBLIC_MAIN_URL || "https://yourdomain.com",
    pos: process.env.NEXT_PUBLIC_POS_URL || "https://pos.yourdomain.com",
    admin: process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.yourdomain.com",
    manager: process.env.NEXT_PUBLIC_MANAGER_URL || "https://manager.yourdomain.com",
    cashier: process.env.NEXT_PUBLIC_CASHIER_URL || "https://cashier.yourdomain.com",
  }
};

export const getSubdomainUrl = (subdomain: keyof typeof SUBDOMAIN_CONFIG.production) => {
  const env = process.env.NODE_ENV === "production" ? "production" : "development";
  return SUBDOMAIN_CONFIG[env][subdomain];
};

export const getLoginUrl = (role?: string) => {
  switch (role?.toLowerCase()) {
    case "admin":
      return getSubdomainUrl("admin");
    case "manager":
      return getSubdomainUrl("manager");
    case "cashier":
      return getSubdomainUrl("cashier");
    default:
      return getSubdomainUrl("pos");
  }
};

// Utility to detect current subdomain
export const getCurrentSubdomain = () => {
  if (typeof window === "undefined") return null;
  
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  
  if (parts.length > 2) {
    return parts[0].toLowerCase();
  } else if (parts.length === 2 && parts[1].includes("local")) {
    return parts[0].toLowerCase();
  }
  
  return null;
};

// Check if current page matches expected subdomain for role
export const isCorrectSubdomainForRole = (role?: string) => {
  const currentSubdomain = getCurrentSubdomain();
  const expectedSubdomain = role?.toLowerCase();
  
  // Special cases
  if (expectedSubdomain === "admin" && currentSubdomain === "admin") return true;
  if (expectedSubdomain === "manager" && currentSubdomain === "manager") return true;
  if (expectedSubdomain === "cashier" && currentSubdomain === "cashier") return true;
  if ((expectedSubdomain === "employee" || !expectedSubdomain) && currentSubdomain === "pos") return true;
  
  return false;
};
