/**
 * Authentication and Authorization Utilities
 * 
 * This module provides standardized authentication and authorization utilities
 * for validating user roles and permissions across API endpoints.
 */

import { auth } from '@/lib/auth';
import { ROLE_PERMISSIONS, normalizeRole, type Role, type Permission } from '@/lib/roles';

// Authentication result interface
export interface AuthValidationResult {
  isValid: boolean;
  session?: any;
  user?: any;
  error?: string;
}

// Access control result interface
export interface AccessControlResult {
  hasAccess: boolean;
  user?: any;
  error?: string;
  code?: "AUTH_REQUIRED" | "INSUFFICIENT_PERMISSIONS" | "INACTIVE_USER";
}

/**
 * Validates user authentication and role permissions
 * @param allowedRoles - Array of roles that can access this resource
 * @returns Access control result with user info if authorized
 */
export async function validateRole(allowedRoles: Role[]): Promise<AccessControlResult> {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        hasAccess: false,
        error: "Authentication required",
        code: "AUTH_REQUIRED"
      };
    }

    const user = session.user as any; // Cast to any to access custom properties
    
    // Check if user is active
    if (user.isActive === false) {
      return {
        hasAccess: false,
        error: "User account is inactive",
        code: "INACTIVE_USER"
      };
    }

    // Check role permissions
    const userRole = normalizeRole(user.role || '');
    const hasValidRole = allowedRoles.some(role => 
      normalizeRole(role) === userRole
    );

    if (!hasValidRole) {
      return {
        hasAccess: false,
        error: "Insufficient permissions for this operation",
        code: "INSUFFICIENT_PERMISSIONS"
      };
    }

    return {
      hasAccess: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole,
        businessId: user.businessId,
        locationId: user.locationId,
        isActive: user.isActive !== false
      }
    };

  } catch (error) {
    return {
      hasAccess: false,
      error: "Authentication validation failed",
      code: "AUTH_REQUIRED"
    };
  }
}

/**
 * Validates user authentication without role checking
 * @returns Authentication validation result
 */
export async function validateAuthentication(): Promise<AuthValidationResult> {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return {
        isValid: false,
        error: "Authentication required"
      };
    }

    const user = session.user as any; // Cast to any to access custom properties
    
    if (user.isActive === false) {
      return {
        isValid: false,
        error: "User account is inactive"
      };
    }

    return {
      isValid: true,
      session,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId,
        locationId: user.locationId,
        isActive: user.isActive !== false
      }
    };

  } catch (error) {
    return {
      isValid: false,
      error: "Authentication validation failed"
    };
  }
}

/**
 * Checks if user has specific permission
 * @param userRole - User's role
 * @param permission - Permission to check
 * @returns True if user has permission
 */
export function hasPermission(userRole: string, permission: Permission): boolean {
  try {
    const normalizedRole = normalizeRole(userRole);
    return ROLE_PERMISSIONS[normalizedRole]?.includes(permission) || false;
  } catch {
    return (ROLE_PERMISSIONS[userRole] as Permission[])?.includes(permission) || false;
  }
}

/**
 * Creates an authentication error response
 * @param authResult - Authentication validation result
 * @returns Standardized authentication error response
 */
export function createAuthenticationErrorResponse(authResult: AuthValidationResult) {
  return {
    success: false,
    error: authResult.error || "Authentication required",
    code: "AUTH_ERROR",
    timestamp: new Date().toISOString()
  };
}