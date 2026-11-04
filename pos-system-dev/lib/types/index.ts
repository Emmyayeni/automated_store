// Centralized type exports for HARDYPOS

// Authentication and authorization types
export * from './auth';

// API response and request types
export * from './api';

// Business domain types
export * from './business';

// Re-export core types from main types file for backward compatibility
export type {
  User,
  Product,
  PharmacyProduct,
  MedicalEquipment,
  DrugType,
  DrugForm,
  DrugStorage,
  Category,
  Customer,
  Transaction,
  TransactionItem,
  CartItem,
  AdminInventoryItem,
  Location,
  InventoryTransferRequest,
  InventoryTransfer,
  InventoryTransferItem,
  InventoryAdjustmentLog
} from '../types';

// Import types for use in search params
import type { Role } from './auth';
import type { DrugType } from '../types';

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Database entity types (for ORM operations)
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// Form types
export type FormData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type FormErrors<T> = Partial<Record<keyof T, string>>;

// Search and filter types
export interface BaseSearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductSearchParams extends BaseSearchParams {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  drugType?: DrugType;
  equipmentType?: string;
}

export interface UserSearchParams extends BaseSearchParams {
  role?: Role;
  isActive?: boolean;
  locationId?: string;
}

export interface TransactionSearchParams extends BaseSearchParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  status?: string;
  customerId?: string;
  locationId?: string;
}