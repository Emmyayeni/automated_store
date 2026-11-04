// Business domain types

// Re-export Product types from main types file
export type {
  Product,
  PharmacyProduct,
  MedicalEquipment,
  DrugType,
  DrugForm,
  DrugStorage
} from '../types';

// Re-export other business types from main types file
export type {
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

// Business-specific enums and constants
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  MOBILE: 'mobile',
  OTHER: 'other',
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const TRANSACTION_STATUS = {
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
  VOIDED: 'voided',
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

export const LOCATION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  UNDER_CONSTRUCTION: 'under_construction',
} as const;

export type LocationStatus = typeof LOCATION_STATUS[keyof typeof LOCATION_STATUS];

// Inventory adjustment types
export const ADJUSTMENT_TYPES = {
  MANUAL: 'manual',
  SALE: 'sale',
  RETURN: 'return',
  WASTE: 'waste',
  THEFT: 'theft',
  DAMAGE: 'damage',
  RECOUNT: 'recount',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  PRODUCTION: 'production',
  EXPIRED: 'expired',
} as const;

export type AdjustmentType = typeof ADJUSTMENT_TYPES[keyof typeof ADJUSTMENT_TYPES];

// Transfer status types
export const TRANSFER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SHIPPED: 'shipped',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;

export type TransferStatus = typeof TRANSFER_STATUS[keyof typeof TRANSFER_STATUS];