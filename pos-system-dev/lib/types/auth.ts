// Authentication and authorization types

// Import Role type from main types file to avoid duplication
import type { Role } from '../types';

// Re-export Role for convenience
export type { Role };

// Unified User interface with consistent field names
export interface User {
  id: string
  email: string
  name: string // Consolidated from firstName/lastName
  role: Role
  isActive: boolean
  businessId?: string
  locationId?: string
  createdAt: Date
  updatedAt: Date
}

// NextAuth integration types
export interface SessionUser extends User {
  image?: string
}

// Session interface for NextAuth
export interface Session {
  user: SessionUser
  expires: string
}

// Authentication result types
export interface AuthValidationResult {
  isValid: boolean
  user?: User
  error?: string
}

// Backward compatibility helpers
export const getDisplayName = (user: User | SessionUser): string => {
  return user.name || user.email;
};

// Helper to convert legacy firstName/lastName to name
export const consolidateName = (firstName?: string, lastName?: string): string => {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  return firstName || lastName || '';
};

// Helper to extract first and last names from consolidated name (for backward compatibility)
export const splitName = (name: string): { firstName: string; lastName: string } => {
  const parts = name.trim().split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
};