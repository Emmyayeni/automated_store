// Role type definition (moved here to avoid circular imports)
export type Role = "ADMIN" | "MANAGER" | "CASHIER";

export interface User {
  id: string
  email: string
  name: string  // Consolidated from firstName/lastName to match schema
  role: Role    // Using standardized uppercase Role type
  isActive: boolean
  businessId?: string
  locationId?: string
  createdAt: Date
  updatedAt: Date
}

// Enums for pharmacy and medical equipment
export type DrugType = 'prescription' | 'otc' | 'controlled' | 'medical_device' | 'supplement' | 'personal_care';
export type DrugForm = 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'ointment' | 'drops' | 'inhaler' | 'patch' | 'suppository';
export type DrugStorage = 'room_temperature' | 'refrigerated' | 'frozen' | 'controlled_room';

// Consolidated Product interface that includes all variants
export interface Product {
  id: string
  name: string
  description?: string
  sku: string
  barcode?: string
  price: number
  cost?: number
  categoryId?: string
  stockQuantity: number
  lowStockThreshold: number
  isActive: boolean
  imageUrl?: string
  category?: Category
  
  // Pharmacy-specific fields (optional)
  drugType?: DrugType
  drugForm?: DrugForm
  strength?: string
  genericName?: string
  brandName?: string
  manufacturer?: string
  batchNumber?: string
  expiryDate?: Date
  manufacturingDate?: Date
  drugLicenseNumber?: string
  storageConditions?: DrugStorage
  activeIngredient?: string
  dosageInstructions?: string
  sideEffects?: string
  contraindications?: string
  requiresPrescription?: boolean
  isControlledSubstance?: boolean
  controlledSubstanceSchedule?: string
  
  // Equipment-specific fields (optional)
  modelNumber?: string
  serialNumber?: string
  warrantyPeriod?: string
  equipmentType?: string
  powerRequirements?: string
  dimensions?: string
  weight?: string
  maintenanceSchedule?: string
  calibrationRequired?: boolean
  needsMaintenance?: boolean
  
  // Common inventory fields
  costPrice?: number
  stockLevel?: number
  reorderLevel?: number
  location?: string
  
  // Certification and compliance
  certificationNumber?: string
  specialHandling?: string
  
  createdAt: Date
  updatedAt: Date
  
  // Legacy fields for backward compatibility
  stock?: any // Deprecated - use stockQuantity instead
}

// Specialized interfaces that extend the base Product
export interface PharmacyProduct extends Product {
  drugType: DrugType
  drugForm: DrugForm
  strength: string
  requiresPrescription: boolean
}

export interface MedicalEquipment extends Product {
  modelNumber: string
  serialNumber: string
  equipmentType: string
  warrantyPeriod: string
}

export interface Category {
  id: string
  name: string
  description?: string
}

export interface Customer {
  id: string
  name?: string  // Changed from firstName/lastName to match schema
  email?: string
  phone?: string
  loyaltyPoints: number
}

export interface Transaction {
  id: string
  transactionNumber: string
  customerId?: string
  userId: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paymentMethod: string
  status: "completed" | "refunded" | "voided"
  createdAt: Date
  items?: TransactionItem[]
  customer?: Customer
  user?: User
}

export interface TransactionItem {
  id: string
  transactionId: string
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: Product
}

export interface CartItem {
  product: Product
  quantity: number
  uomId?: string
  uomCode?: string
  uomName?: string
  uomAbbreviation?: string
  conversionFactor?: number
  pricePerUnit?: number
}

// Admin Inventory Management Types for Sierra Leone
export interface AdminInventoryItem {
  id: string
  productId: string
  productName: string
  sku: string
  quantity: number
  minStockLevel: number
  maxStockLevel: number
  costPrice: number
  sellPrice: number
  category: string
  locationId: string
  locationName: string
  locationAddress?: string
  updatedAt: string
  description?: string
  isActive: boolean
}

export interface Location {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  businessId: string
  managerId?: string
  status: 'active' | 'inactive' | 'under_construction'
  createdAt: Date
}

export interface InventoryTransferRequest {
  fromLocationId: string
  toLocationId: string
  productId: string
  quantity: number
  reason: string
  notes?: string
}

export interface InventoryTransfer {
  id: string
  transferNumber: string
  fromLocationId: string
  toLocationId: string
  requestedBy: string
  approvedBy?: string
  status: 'pending' | 'approved' | 'rejected' | 'shipped' | 'received' | 'cancelled'
  notes?: string
  requestedDate: Date
  approvedDate?: Date
  shippedDate?: Date
  receivedDate?: Date
  createdAt: Date
  items?: InventoryTransferItem[]
}

export interface InventoryTransferItem {
  id: string
  transferId: string
  productId: string
  quantityRequested: number
  quantityShipped: number
  quantityReceived: number
  notes?: string
  product?: Product
}

export interface InventoryAdjustmentLog {
  id: string
  locationId: string
  locationName?: string
  productId: string
  productName?: string
  productSku?: string
  adjustmentType: 'manual' | 'sale' | 'return' | 'waste' | 'theft' | 'damage' | 'recount' | 'transfer_in' | 'transfer_out' | 'production' | 'expired'
  previousQuantity: number
  adjustmentQuantity: number
  newQuantity: number
  reason: string
  adjustedBy: string
  adjustedByName?: string
  referenceId?: string
  referenceType?: string
  notes?: string
  createdAt: Date
}

