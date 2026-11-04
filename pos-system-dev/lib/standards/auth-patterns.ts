/**
 * Authentication Pattern Utilities
 * 
 * This module provides standardized authentication and authorization patterns
 * for consistent session validation and role-based access control across
 * the HARDYPOS system.
 */

import { getServerSession, type Session } from "next-auth";
import { authOptions } from "../auth";
import { normalizeRole, isValidRole, hasPermission, type Role, type Permission } from "../roles";
import { 
  createAuthErrorResponse, 
  createAuthorizationErrorResponse, 
  type ApiResponse 
} from "./api-responses";

// Standardized session validation result
export interface AuthValidationResult {
  isValid: boolean;
  session: Session | null;
  user: SessionUser | null;
  error?: string;
  code?: string;
}

// Standardized user interface for sessions
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  businessId?: string;
  locationId?: string;
  store?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

// Role-based access control result
export interface AccessControlResult {
  hasAccess: boolean;
  user: SessionUser | null;
  error?: string;
  code?: string;
}

/**
 * Validates the current session and returns standardized result
 * @returns Promise<AuthValidationResult> - Validation result with session data
 */
export async function validateSession(): Promise<AuthValidationResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return {
        isValid: false,
        session: null,
        user: null,
        error: "No active session found",
        code: "NO_SESSION"
      };
    }

    // Validate user data completeness
    if (!session.user.id || !session.user.email || !session.user.role) {
      return {
        isValid: false,
        session,
        user: null,
        error: "Incomplete session data",
        code: "INVALID_SESSION"
      };
    }

    // Validate role format
    if (!isValidRole(session.user.role)) {
      return {
        isValid: false,
        session,
        user: null,
        error: "Invalid user role",
        code: "INVALID_ROLE"
      };
    }

    // Check if user is active
    if (!session.user.isActive) {
      return {
        isValid: false,
        session,
        user: null,
        error: "User account is inactive",
        code: "INACTIVE_USER"
      };
    }

    // Create standardized user object
    const user: SessionUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || session.user.email,
      role: normalizeRole(session.user.role),
      isActive: session.user.isActive,
      businessId: session.user.businessId,
      locationId: session.user.locationId,
      store: session.user.store
    };

    return {
      isValid: true,
      session,
      user,
    };
  } catch (error) {
    return {
      isValid: false,
      session: null,
      user: null,
      error: "Session validation failed",
      code: "VALIDATION_ERROR"
    };
  }
}

/**
 * Validates session and checks if user has required permission
 * @param permission - Required permission string
 * @returns Promise<AccessControlResult> - Access control result
 */
export async function validatePermission(permission: Permission): Promise<AccessControlResult> {
  const validation = await validateSession();
  
  if (!validation.isValid || !validation.user) {
    return {
      hasAccess: false,
      user: null,
      error: validation.error || "Authentication required",
      code: validation.code || "AUTH_REQUIRED"
    };
  }

  const userHasPermission = hasPermission(validation.user.role, permission);
  
  if (!userHasPermission) {
    return {
      hasAccess: false,
      user: validation.user,
      error: `Insufficient permissions. Required: ${permission}`,
      code: "INSUFFICIENT_PERMISSIONS"
    };
  }

  return {
    hasAccess: true,
    user: validation.user
  };
}

/**
 * Validates session and checks if user has one of the required roles
 * @param requiredRoles - Array of required roles
 * @returns Promise<AccessControlResult> - Access control result
 */
export async function validateRole(requiredRoles: Role[]): Promise<AccessControlResult> {
  const validation = await validateSession();
  
  if (!validation.isValid || !validation.user) {
    return {
      hasAccess: false,
      user: null,
      error: validation.error || "Authentication required",
      code: validation.code || "AUTH_REQUIRED"
    };
  }

  const normalizedRequiredRoles = requiredRoles.map(role => normalizeRole(role));
  const userHasRole = normalizedRequiredRoles.includes(validation.user.role);
  
  if (!userHasRole) {
    return {
      hasAccess: false,
      user: validation.user,
      error: `Insufficient role. Required: ${normalizedRequiredRoles.join(" or ")}`,
      code: "INSUFFICIENT_ROLE"
    };
  }

  return {
    hasAccess: true,
    user: validation.user
  };
}

/**
 * Validates session and checks business context access
 * @param businessId - Required business ID
 * @returns Promise<AccessControlResult> - Access control result
 */
export async function validateBusinessAccess(businessId: string): Promise<AccessControlResult> {
  const validation = await validateSession();
  
  if (!validation.isValid || !validation.user) {
    return {
      hasAccess: false,
      user: null,
      error: validation.error || "Authentication required",
      code: validation.code || "AUTH_REQUIRED"
    };
  }

  // Admin users can access any business
  if (validation.user.role === "ADMIN") {
    return {
      hasAccess: true,
      user: validation.user
    };
  }

  // Other users must belong to the same business
  if (validation.user.businessId !== businessId) {
    return {
      hasAccess: false,
      user: validation.user,
      error: "Access denied to this business",
      code: "BUSINESS_ACCESS_DENIED"
    };
  }

  return {
    hasAccess: true,
    user: validation.user
  };
}

/**
 * Creates a standardized authentication error response
 * @param result - Auth validation result
 * @returns ApiResponse - Standardized error response
 */
export function createAuthenticationErrorResponse(result: AuthValidationResult): ApiResponse {
  return createAuthErrorResponse(result.error || "Authentication required");
}

/**
 * Creates a standardized authorization error response
 * @param result - Access control result
 * @returns ApiResponse - Standardized error response
 */
export function createAuthorizationErrorFromResult(result: AccessControlResult): ApiResponse {
  return createAuthorizationErrorResponse(result.error || "Insufficient permissions");
}

/**
 * Higher-order function to protect API routes with authentication
 * @param handler - The API route handler function
 * @returns Protected API route handler
 */
export function withAuth<T extends any[]>(
  handler: (user: SessionUser, ...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    return handler(validation.user, ...args);
  };
}

/**
 * Higher-order function to protect API routes with permission checking
 * @param permission - Required permission
 * @param handler - The API route handler function
 * @returns Protected API route handler
 */
export function withPermission<T extends any[]>(
  permission: Permission,
  handler: (user: SessionUser, ...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const accessControl = await validatePermission(permission);
    
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      
      return new Response(JSON.stringify(errorResponse), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    }

    return handler(accessControl.user, ...args);
  };
}

/**
 * Higher-order function to protect API routes with role checking
 * @param requiredRoles - Array of required roles
 * @param handler - The API route handler function
 * @returns Protected API route handler
 */
export function withRole<T extends any[]>(
  requiredRoles: Role[],
  handler: (user: SessionUser, ...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const accessControl = await validateRole(requiredRoles);
    
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      
      return new Response(JSON.stringify(errorResponse), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    }

    return handler(accessControl.user, ...args);
  };
}

/**
 * Utility to get current user from session (for use in components)
 * @returns Promise<SessionUser | null> - Current user or null
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const validation = await validateSession();
  return validation.user;
}

/**
 * Utility to check if current user has permission (for use in components)
 * @param permission - Permission to check
 * @returns Promise<boolean> - True if user has permission
 */
export async function currentUserHasPermission(permission: Permission): Promise<boolean> {
  const accessControl = await validatePermission(permission);
  return accessControl.hasAccess;
}

/**
 * Utility to check if current user has role (for use in components)
 * @param roles - Roles to check
 * @returns Promise<boolean> - True if user has one of the roles
 */
export async function currentUserHasRole(roles: Role[]): Promise<boolean> {
  const accessControl = await validateRole(roles);
  return accessControl.hasAccess;
}

// Migration helpers for existing session data

/**
 * Migrates legacy user data to standardized format
 * @param legacyUser - User data with potential legacy fields
 * @returns SessionUser - Standardized user object
 */
export function migrateUserData(legacyUser: any): SessionUser {
  // Handle name field migration from firstName/lastName
  let name = legacyUser.name;
  if (!name && (legacyUser.firstName || legacyUser.lastName)) {
    name = [legacyUser.firstName, legacyUser.lastName]
      .filter(Boolean)
      .join(' ') || legacyUser.email;
  }
  if (!name) {
    name = legacyUser.email;
  }

  // Normalize role to uppercase
  let role: Role;
  try {
    role = normalizeRole(legacyUser.role);
  } catch {
    // Fallback to CASHIER if role is invalid
    role = "CASHIER";
  }

  return {
    id: legacyUser.id,
    email: legacyUser.email,
    name,
    role,
    isActive: legacyUser.isActive ?? true,
    businessId: legacyUser.businessId,
    locationId: legacyUser.locationId,
    store: legacyUser.store
  };
}

/**
 * Creates backward compatible user object for legacy code
 * @param user - Standardized user object
 * @returns Legacy user format
 */
export function createLegacyUserFormat(user: SessionUser): any {
  const nameParts = user.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    ...user,
    firstName,
    lastName,
    // Keep both formats available
    name: user.name
  };
}

/**
 * Validates and migrates session data if needed
 * @param session - Raw session from NextAuth
 * @returns Standardized session with migrated user data
 */
export function migrateSessionData(session: any): Session | null {
  if (!session || !session.user) {
    return null;
  }

  const migratedUser = migrateUserData(session.user);
  
  return {
    ...session,
    user: migratedUser
  };
}