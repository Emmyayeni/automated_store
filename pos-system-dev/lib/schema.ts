import * as pg from "drizzle-orm/pg-core";

const { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  numeric, 
  integer, 
  boolean, 
  unique, 
  pgEnum, 
  varchar,
  date,
  index,
  bigint,
  jsonb
} = pg;

// --- ENUMS ---
export const shiftStatusEnum = pgEnum('shift_status', ['scheduled', 'active', 'completed', 'missed']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']);
export const feedbackTypeEnum = pgEnum('feedback_type', ['product', 'service', 'location', 'staff', 'general']);
export const feedbackRatingEnum = pgEnum('feedback_rating', ['1', '2', '3', '4', '5']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'update', 'delete', 'login', 'logout', 'transaction', 'void', 'refund']);
export const inventoryAdjustmentTypeEnum = pgEnum('inventory_adjustment_type', ['manual', 'sale', 'return', 'waste', 'theft', 'damage', 'recount', 'transfer_in', 'transfer_out', 'production', 'expired']);
export const notificationTypeEnum = pgEnum('notification_type', ['info', 'warning', 'error', 'success']);
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms', 'push', 'in_app']);
export const warrantyStatusEnum = pgEnum('warranty_status', ['active', 'expired', 'claimed', 'void']);
export const maintenanceTypeEnum = pgEnum('maintenance_type', ['preventive', 'corrective', 'emergency']);
export const backupStatusEnum = pgEnum('backup_status', ['pending', 'in_progress', 'completed', 'failed']);

// ============================================
// INVENTORY MANAGEMENT SYSTEM ENUMS
// ============================================
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT']);
export const stockStatusEnum = pgEnum('stock_status_enum', ['NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK']);
export const transferStatusEnum = pgEnum('transfer_status_enum', ['REQUESTED', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED']);
export const stockOutReasonEnum = pgEnum('stock_out_reason', ['SALE', 'DAMAGED', 'EXPIRED', 'INTERNAL_USE', 'ADJUSTMENT', 'OTHER']);
export const inventoryAuditActionEnum = pgEnum('inventory_audit_action', ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER_REQUESTED', 'TRANSFER_APPROVED', 'TRANSFER_REJECTED', 'TRANSFER_DISPATCHED', 'TRANSFER_RECEIVED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'BRANCH_CREATED', 'USER_CREATED', 'USER_DEACTIVATED']);

// Pharmacy-specific enums
export const drugTypeEnum = pgEnum('drug_type', ['prescription', 'otc', 'controlled', 'medical_device', 'supplement', 'personal_care']);
export const prescriptionStatusEnum = pgEnum('prescription_status', ['pending', 'verified', 'dispensed', 'completed', 'cancelled']);
export const drugFormEnum = pgEnum('drug_form', ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'patch', 'suppository']);
export const drugStorageEnum = pgEnum('drug_storage', ['room_temperature', 'refrigerated', 'frozen', 'controlled_room']);
export const patientGenderEnum = pgEnum('patient_gender', ['male', 'female', 'other']);

export const businesses = pgTable("businesses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  industry: text("industry"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }),
  currency: text("currency"),
  timezone: text("timezone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  // Extended role set for Inventory Management System
  role: text("role", { enum: ["ADMIN", "BRANCH_MANAGER", "MANAGER", "CLERK", "CASHIER"] }).notNull(),
  businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id"), // branch/location assignment
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Inventory system: unique branch code (e.g. BRN-001)
  branchCode: text("branch_code").unique(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  timezone: text("timezone").default("America/New_York"),
  currency: text("currency").default("USD"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).default("0.08"),
  status: text("status", { enum: ["active", "inactive", "under_construction"] }).default("active"),
  managerId: uuid("manager_id").references(() => users.id),
  openHours: text("open_hours"),
  revenue: integer("revenue"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});


export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category"),
  barcode: text("barcode"),
  // Inventory system: unique SKU constraint (BR-01)
  sku: text("sku").unique(),
  isActive: boolean("is_active").default(true),
  
  // Pharmacy-specific fields
  drugType: drugTypeEnum("drug_type").default('otc'),
  drugForm: drugFormEnum("drug_form"),
  strength: text("strength"), // e.g., "500mg", "10ml"
  genericName: text("generic_name"),
  brandName: text("brand_name"),
  manufacturer: text("manufacturer"),
  batchNumber: text("batch_number"),
  expiryDate: date("expiry_date"),
  manufacturingDate: date("manufacturing_date"),
  drugLicenseNumber: text("drug_license_number"),
  storageConditions: drugStorageEnum("storage_conditions").default('room_temperature'),
  activeIngredient: text("active_ingredient"),
  dosageInstructions: text("dosage_instructions"),
  sideEffects: text("side_effects"),
  contraindications: text("contraindications"),
  requiresPrescription: boolean("requires_prescription").default(false),
  isControlledSubstance: boolean("is_controlled_substance").default(false),
  controlledSubstanceSchedule: text("controlled_substance_schedule"), // Schedule I, II, III, IV, V
  
  // Equipment-specific fields
  modelNumber: text("model_number"),
  serialNumber: text("serial_number"),
  warrantyPeriod: text("warranty_period"), // e.g., "24 months"
  equipmentType: text("equipment_type"), // diagnostic, therapeutic, surgical, laboratory, monitoring
  powerRequirements: text("power_requirements"), // e.g., "100-240V AC"
  dimensions: text("dimensions"), // e.g., "30cm x 20cm x 15cm"
  weight: text("weight"), // e.g., "2.5kg"
  maintenanceSchedule: text("maintenance_schedule"), // e.g., "Every 6 months"
  calibrationRequired: boolean("calibration_required").default(false),
  needsMaintenance: boolean("needs_maintenance").default(false),
  
  // Common inventory fields
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  stockLevel: integer("stock_level").default(0),
  reorderLevel: integer("reorder_level").default(10),
  location: text("location"), // storage location
  
  // Certification and compliance
  certificationNumber: text("certification_number"), // CE, FDA numbers
  specialHandling: text("special_handling"), // special handling instructions
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  // Inventory management: branch-level stock balance
  quantity: integer("quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").default(10),
  // stock_status is derived: NORMAL | LOW_STOCK | OUT_OF_STOCK
  stockStatus: stockStatusEnum("stock_status").default("NORMAL"),
  minStockLevel: integer("min_stock_level").default(10),
  maxStockLevel: integer("max_stock_level").default(100),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  sellPrice: numeric("sell_price", { precision: 10, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    uniqueInventory: unique().on(table.locationId, table.productId),
    locationIdx: index('idx_inventory_location').on(table.locationId),
    productIdx: index('idx_inventory_product').on(table.productId),
    statusIdx: index('idx_inventory_status').on(table.stockStatus),
  };
});

// --- INVENTORY ADJUSTMENT LOGS ---
export const inventoryAdjustmentLogs = pgTable("inventory_adjustment_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  adjustmentType: inventoryAdjustmentTypeEnum("adjustment_type").notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  adjustmentQuantity: integer("adjustment_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  reason: text("reason").notNull(),
  adjustedBy: uuid("adjusted_by").notNull().references(() => users.id),
  referenceId: uuid("reference_id"), // Reference to transaction, transfer, etc.
  referenceType: text("reference_type"), // 'transaction', 'transfer', 'manual', etc.
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  locationIdx: index('idx_inventory_adjustment_logs_location').on(table.locationId),
  productIdx: index('idx_inventory_adjustment_logs_product').on(table.productId),
  typeIdx: index('idx_inventory_adjustment_logs_type').on(table.adjustmentType),
  dateIdx: index('idx_inventory_adjustment_logs_date').on(table.createdAt),
  adjustedByIdx: index('idx_inventory_adjustment_logs_adjusted_by').on(table.adjustedBy),
}));

// --- INVENTORY TRANSFERS (Enhanced for full REQUESTED→APPROVED→IN_TRANSIT→RECEIVED workflow) ---
export const inventoryTransfers = pgTable("inventory_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  transferNumber: text("transfer_number").notNull().unique(),
  fromLocationId: uuid("from_location_id").notNull().references(() => locations.id),
  toLocationId: uuid("to_location_id").notNull().references(() => locations.id),
  requestedBy: uuid("requested_by").notNull().references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  dispatchedBy: uuid("dispatched_by").references(() => users.id),
  receivedBy: uuid("received_by").references(() => users.id),
  // Blueprint workflow: REQUESTED → APPROVED → IN_TRANSIT → RECEIVED (also REJECTED)
  status: transferStatusEnum("status").default("REQUESTED"),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  requestedDate: timestamp("requested_date", { withTimezone: true }).defaultNow(),
  approvedDate: timestamp("approved_date", { withTimezone: true }),
  dispatchedDate: timestamp("dispatched_date", { withTimezone: true }),
  receivedDate: timestamp("received_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  transferNumberIdx: index('idx_inventory_transfers_number').on(table.transferNumber),
  fromLocationIdx: index('idx_inventory_transfers_from').on(table.fromLocationId),
  toLocationIdx: index('idx_inventory_transfers_to').on(table.toLocationId),
  statusIdx: index('idx_inventory_transfers_status').on(table.status),
}));

// --- INVENTORY TRANSFER ITEMS (with discrepancy tracking) ---
export const inventoryTransferItems = pgTable("inventory_transfer_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  transferId: uuid("transfer_id").notNull().references(() => inventoryTransfers.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantityRequested: integer("quantity_requested").notNull(),
  quantityDispatched: integer("quantity_dispatched").default(0),
  quantityReceived: integer("quantity_received").default(0),
  // discrepancy = dispatched - received (missing/damaged in transit)
  discrepancyQty: integer("discrepancy_qty").default(0),
  discrepancyReason: text("discrepancy_reason"),
  notes: text("notes"),
}, (table) => ({
  transferIdx: index('idx_inventory_transfer_items_transfer').on(table.transferId),
  productIdx: index('idx_inventory_transfer_items_product').on(table.productId),
}));

// ============================================
// INVENTORY MANAGEMENT SYSTEM: STOCK MOVEMENTS
// Immutable transaction log — never deleted
// ============================================
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  movementType: stockMovementTypeEnum("movement_type").notNull(),
  // quantity is always positive; direction is determined by movementType
  quantity: integer("quantity").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: stockOutReasonEnum("reason"),
  reference: text("reference"), // supplier ref, PO number, transfer ID etc.
  notes: text("notes"),
  // Link to transfer if movement is part of a transfer
  transferId: uuid("transfer_id").references(() => inventoryTransfers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  locationIdx: index('idx_stock_movements_location').on(table.locationId),
  productIdx: index('idx_stock_movements_product').on(table.productId),
  userIdx: index('idx_stock_movements_user').on(table.userId),
  typeIdx: index('idx_stock_movements_type').on(table.movementType),
  dateIdx: index('idx_stock_movements_date').on(table.createdAt),
}));

// ============================================
// INVENTORY AUDIT LOGS (inventory-specific)
// ============================================
export const inventoryAuditLogs = pgTable("inventory_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  locationId: uuid("location_id").references(() => locations.id),
  action: inventoryAuditActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: uuid("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index('idx_inv_audit_logs_user').on(table.userId),
  actionIdx: index('idx_inv_audit_logs_action').on(table.action),
  dateIdx: index('idx_inv_audit_logs_date').on(table.createdAt),
}));

// Type exports for new inventory tables
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type InventoryTransfer = typeof inventoryTransfers.$inferSelect;
export type NewInventoryTransfer = typeof inventoryTransfers.$inferInsert;
export type InventoryTransferItem = typeof inventoryTransferItems.$inferSelect;
export type NewInventoryTransferItem = typeof inventoryTransferItems.$inferInsert;
export type InventoryRecord = typeof inventory.$inferSelect;
export type NewInventoryRecord = typeof inventory.$inferInsert;


export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionNumber: text("transaction_number").notNull().unique(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  cashierId: uuid("cashier_id").notNull().references(() => users.id),
  customerId: uuid("customer_id"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  itemCount: integer("item_count").default(1),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "mobile", "other"] }).notNull(),
  status: text("status", { enum: ["completed", "void", "refunded"] }).default("completed"),
  notes: text("notes"),
  paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0.00"),
});

export const staffInvites = pgTable("staff_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  role: text("role", { enum: ["MANAGER", "CASHIER"] }).notNull(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  accepted: boolean("accepted").default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const locationSettings = pgTable("location_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
  autoPrintReceipt: boolean("auto_print_receipt").default(true),
  acceptedPayments: text("accepted_payments").default("cash,card"),
  cashDrawerStart: numeric("cash_drawer_start", { precision: 10, scale: 2 }).default("200.00"),
  loyaltyProgram: boolean("loyalty_program").default(true),
  onlineOrdering: boolean("online_ordering").default(true),
  deliveryAvailable: boolean("delivery_available").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});


export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  email: text("email"),
  name: text("name"),
  phone: text("phone"),
  loyaltyPoints: integer("loyalty_points").default(0),
  totalSpent: numeric("total_spent", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});


export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- EMPLOYEE SCHEDULES ---
export const employeeSchedules = pgTable('employee_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id).notNull(),
  shiftDate: date('shift_date').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  breakDuration: integer('break_duration').default(30), // minutes
  shiftStatus: shiftStatusEnum('shift_status').default('scheduled'),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userDateIdx: index('idx_employee_schedules_user_date').on(table.userId, table.shiftDate),
  locationDateIdx: index('idx_employee_schedules_location_date').on(table.locationId, table.shiftDate),
}));


export const customerAppointments = pgTable('customer_appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => customers.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id).notNull(),
  employeeId: uuid('employee_id').references(() => users.id),
  serviceType: varchar('service_type', { length: 100 }).notNull(),
  appointmentDate: timestamp('appointment_date', { withTimezone: true }).notNull(),
  duration: integer('duration').notNull(), // minutes
  status: appointmentStatusEnum('status').default('scheduled'),
  notes: text('notes'),
  reminderSent: boolean('reminder_sent').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dateIdx: index('idx_customer_appointments_date').on(table.appointmentDate),
  customerIdx: index('idx_customer_appointments_customer').on(table.customerId),
}));

export const productBundles = pgTable('product_bundles', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  bundlePrice: numeric('bundle_price', { precision: 10, scale: 2 }).notNull(),
  savingsAmount: numeric('savings_amount', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  validFrom: timestamp('valid_from', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  locationId: uuid('location_id').references(() => locations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- BUNDLE ITEMS ---
export const bundleItems = pgTable('bundle_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  bundleId: uuid('bundle_id').references(() => productBundles.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull().default(1),
  displayOrder: integer('display_order').default(0),
});

// --- CUSTOMER FEEDBACK ---
export const customerFeedback = pgTable('customer_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => customers.id),
  locationId: uuid('location_id').references(() => locations.id).notNull(),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  feedbackType: feedbackTypeEnum('feedback_type').notNull(),
  rating: feedbackRatingEnum('rating'),
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  isAnonymous: boolean('is_anonymous').default(false),
  isResolved: boolean('is_resolved').default(false),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  response: text('response'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  locationIdx: index('idx_customer_feedback_location').on(table.locationId),
  ratingIdx: index('idx_customer_feedback_rating').on(table.rating),
}));

// --- AUDIT LOGS ---
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  locationId: uuid('location_id').references(() => locations.id),
  action: auditActionEnum('action').notNull(),
  tableName: varchar('table_name', { length: 100 }),
  recordId: uuid('record_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  sessionId: varchar('session_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index('idx_audit_logs_user').on(table.userId),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  dateIdx: index('idx_audit_logs_date').on(table.createdAt),
}));

// --- NOTIFICATIONS ---
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  locationId: uuid('location_id').references(() => locations.id),
  type: notificationTypeEnum('type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId),
  typeIdx: index('idx_notifications_type').on(table.type),
  readIdx: index('idx_notifications_read').on(table.isRead),
}));

// --- PRODUCT VARIANTS ---
export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentProductId: uuid('parent_product_id').references(() => products.id).notNull(),
  variantName: varchar('variant_name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  barcode: varchar('barcode', { length: 100 }).unique(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }),
  attributes: jsonb('attributes'), // size, color, etc.
  stockQuantity: integer('stock_quantity').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  parentIdx: index('idx_product_variants_parent').on(table.parentProductId),
  skuIdx: index('idx_product_variants_sku').on(table.sku),
}));

// --- PRODUCT REVIEWS ---
export const productReviews = pgTable('product_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  rating: feedbackRatingEnum('rating').notNull(),
  title: varchar('title', { length: 255 }),
  review: text('review'),
  isVerifiedPurchase: boolean('is_verified_purchase').default(false),
  isApproved: boolean('is_approved').default(false),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  helpfulVotes: integer('helpful_votes').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  productIdx: index('idx_product_reviews_product').on(table.productId),
  ratingIdx: index('idx_product_reviews_rating').on(table.rating),
}));

// --- VENDOR CONTRACTS ---
export const vendorContracts = pgTable('vendor_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').references(() => suppliers.id).notNull(),
  contractNumber: varchar('contract_number', { length: 50 }).notNull().unique(),
  contractType: varchar('contract_type', { length: 50 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  terms: text('terms'),
  paymentTerms: varchar('payment_terms', { length: 100 }),
  deliveryTerms: varchar('delivery_terms', { length: 100 }),
  minimumOrderValue: numeric('minimum_order_value', { precision: 10, scale: 2 }),
  discountTiers: jsonb('discount_tiers'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// --- PRICE HISTORY ---
export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id),
  oldPrice: numeric('old_price', { precision: 10, scale: 2 }).notNull(),
  newPrice: numeric('new_price', { precision: 10, scale: 2 }).notNull(),
  effectiveDate: timestamp('effective_date', { withTimezone: true }).notNull(),
  reason: varchar('reason', { length: 255 }),
  changedBy: uuid('changed_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  productIdx: index('idx_price_history_product').on(table.productId),
  dateIdx: index('idx_price_history_date').on(table.effectiveDate),
}));

// --- CUSTOMER SEGMENTS ---
export const customerSegments = pgTable('customer_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  criteria: jsonb('criteria').notNull(), // Rules for segment membership
  isActive: boolean('is_active').default(true),
  autoUpdate: boolean('auto_update').default(true),
  lastUpdated: timestamp('last_updated', { withTimezone: true }),
  customerCount: integer('customer_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- CUSTOMER SEGMENT MEMBERS ---
export const customerSegmentMembers = pgTable('customer_segment_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  segmentId: uuid('segment_id').references(() => customerSegments.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
  addedBy: varchar('added_by', { length: 50 }).default('auto'), // 'auto' or user_id
}, (table) => ({
  segmentIdx: index('idx_customer_segment_members_segment').on(table.segmentId),
  customerIdx: index('idx_customer_segment_members_customer').on(table.customerId),
  uniqueSegmentCustomer: unique('unique_segment_customer').on(table.segmentId, table.customerId),
}));

// --- EXPENSE CATEGORIES ---
// Predeclare the type for expenseCategories.id to break the circular reference
type ExpenseCategoryIdType = ReturnType<typeof uuid>;

// Now define the table using the predeclared type
export const expenseCategories = pgTable('expense_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  parentCategoryId: uuid('parent_category_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- EXPENSES ---
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  locationId: uuid('location_id').references(() => locations.id).notNull(),
  categoryId: uuid('category_id').references(() => expenseCategories.id).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  expenseDate: date('expense_date').notNull(),
  receiptUrl: text('receipt_url'),
  vendorName: varchar('vendor_name', { length: 255 }),
  paymentMethod: varchar('payment_method', { length: 50 }),
  isRecurring: boolean('is_recurring').default(false),
  recurringFrequency: varchar('recurring_frequency', { length: 50 }),
  approvedBy: uuid('approved_by').references(() => users.id),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  locationIdx: index('idx_expenses_location').on(table.locationId),
  categoryIdx: index('idx_expenses_category').on(table.categoryId),
  dateIdx: index('idx_expenses_date').on(table.expenseDate),
}));

// --- EQUIPMENT ---
export const equipment = pgTable('equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  locationId: uuid('location_id').references(() => locations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }),
  serialNumber: varchar('serial_number', { length: 100 }),
  manufacturer: varchar('manufacturer', { length: 100 }),
  purchaseDate: date('purchase_date'),
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }),
  warrantyExpiry: date('warranty_expiry'),
  warrantyStatus: warrantyStatusEnum('warranty_status').default('active'),
  maintenanceSchedule: jsonb('maintenance_schedule'),
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  locationIdx: index('idx_equipment_location').on(table.locationId),
  serialIdx: index('idx_equipment_serial').on(table.serialNumber),
}));

// --- MAINTENANCE RECORDS ---
export const maintenanceRecords = pgTable('maintenance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').references(() => equipment.id).notNull(),
  maintenanceType: maintenanceTypeEnum('maintenance_type').notNull(),
  description: text('description').notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }),
  performedBy: varchar('performed_by', { length: 255 }),
  performedDate: date('performed_date').notNull(),
  nextMaintenanceDate: date('next_maintenance_date'),
  partsUsed: jsonb('parts_used'),
  notes: text('notes'),
  receiptUrl: text('receipt_url'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  equipmentIdx: index('idx_maintenance_records_equipment').on(table.equipmentId),
  dateIdx: index('idx_maintenance_records_date').on(table.performedDate),
}));

// --- COMPETITOR ANALYSIS ---
export const competitorAnalysis = pgTable('competitor_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  competitorName: varchar('competitor_name', { length: 255 }).notNull(),
  location: text('location'),
  productId: uuid('product_id').references(() => products.id),
  competitorPrice: numeric('competitor_price', { precision: 10, scale: 2 }),
  ourPrice: numeric('our_price', { precision: 10, scale: 2 }),
  priceDifference: numeric('price_difference', { precision: 10, scale: 2 }),
  qualityRating: feedbackRatingEnum('quality_rating'),
  serviceRating: feedbackRatingEnum('service_rating'),
  notes: text('notes'),
  analysisDate: date('analysis_date').notNull(),
  analyzedBy: uuid('analyzed_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  productIdx: index('idx_competitor_analysis_product').on(table.productId),
  dateIdx: index('idx_competitor_analysis_date').on(table.analysisDate),
}));

// --- BACKUP RECORDS ---
export const backupRecords = pgTable('backup_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  backupType: varchar('backup_type', { length: 50 }).notNull(), // 'full', 'incremental', 'differential'
  status: backupStatusEnum('status').default('pending'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  backupSize: bigint('backup_size', { mode: 'number' }), // bytes
  backupLocation: text('backup_location'),
  errorMessage: text('error_message'),
  recordsCount: integer('records_count'),
  compressionRatio: numeric('compression_ratio', { precision: 5, scale: 2 }),
  checksumHash: varchar('checksum_hash', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  statusIdx: index('idx_backup_records_status').on(table.status),
  dateIdx: index('idx_backup_records_date').on(table.startTime),
}));

// --- API RATE LIMITS ---
export const apiRateLimits = pgTable('api_rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  ipAddress: varchar('ip_address', { length: 45 }),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  requestCount: integer('request_count').notNull().default(1),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  isBlocked: boolean('is_blocked').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userEndpointIdx: index('idx_api_rate_limits_user_endpoint').on(table.userId, table.endpoint),
  ipEndpointIdx: index('idx_api_rate_limits_ip_endpoint').on(table.ipAddress, table.endpoint),
  windowIdx: index('idx_api_rate_limits_window').on(table.windowStart, table.windowEnd),
}));

// --- PRODUCT KITS ---
export const productKits = pgTable('product_kits', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  kitPrice: numeric('kit_price', { precision: 10, scale: 2 }).notNull(),
  individualPrice: numeric('individual_price', { precision: 10, scale: 2 }).notNull(),
  savingsAmount: numeric('savings_amount', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// --- KIT COMPONENTS ---
export const kitComponents = pgTable('kit_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  kitId: uuid('kit_id').references(() => productKits.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull().default(1),
  isOptional: boolean('is_optional').default(false),
  displayOrder: integer('display_order').default(0),
});

export const cashSessions = pgTable("cash_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id),
  openingAmount: numeric("opening_amount", { precision: 10, scale: 2 }).notNull(),
  closingAmount: numeric("closing_amount", { precision: 10, scale: 2 }),
  expectedAmount: numeric("expected_amount", { precision: 10, scale: 2 }),
  variance: numeric("variance", { precision: 10, scale: 2 }),
  status: text("status", { enum: ["open", "closed"] }).default("open"),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id).notNull(),
  locationId: uuid("location_id").references(() => locations.id).notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  openingCash: numeric("opening_cash", { precision: 10, scale: 2 }),
  closingCash: numeric("closing_cash", { precision: 10, scale: 2 }),
  cashVariance: numeric("cash_variance", { precision: 10, scale: 2 }).default("0.00"),
  totalSales: numeric("total_sales", { precision: 10, scale: 2 }).default("0.00"),
  transactionCount: integer("transaction_count").default(0),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const heldTransactions = pgTable("held_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  locationId: uuid("location_id").references(() => locations.id),
  items: jsonb("items").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  holdReason: text("hold_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Type exports
// Pharmacy-specific tables

export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  patientNumber: text("patient_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth"),
  gender: patientGenderEnum("gender"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  allergies: text("allergies"),
  medicalConditions: text("medical_conditions"),
  currentMedications: text("current_medications"),
  insuranceProvider: text("insurance_provider"),
  insuranceNumber: text("insurance_number"),
  nationalId: text("national_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const doctors = pgTable("doctors", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  licenseNumber: text("license_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  specialization: text("specialization"),
  hospital: text("hospital"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  prescriptionNumber: text("prescription_number").notNull(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  dateIssued: date("date_issued").notNull(),
  status: prescriptionStatusEnum("status").default('pending'),
  notes: text("notes"),
  dispensedBy: uuid("dispensed_by").references(() => users.id),
  dispensedAt: timestamp("dispensed_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const prescriptionItems = pgTable("prescription_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  prescriptionId: uuid("prescription_id").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  instructions: text("instructions"),
  isDispensed: boolean("is_dispensed").default(false),
  dispensedQuantity: integer("dispensed_quantity").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const drugInteractions = pgTable("drug_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  drug1Id: uuid("drug1_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  drug2Id: uuid("drug2_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  interactionType: text("interaction_type").notNull(), // major, moderate, minor
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  mechanism: text("mechanism"),
  recommendation: text("recommendation"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const pharmacyInventory = pgTable("pharmacy_inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  inventoryId: uuid("inventory_id").notNull().references(() => inventory.id, { onDelete: "cascade" }),
  batchNumber: text("batch_number").notNull(),
  expiryDate: date("expiry_date").notNull(),
  manufacturingDate: date("manufacturing_date"),
  supplierBatchNumber: text("supplier_batch_number"),
  quantity: integer("quantity").notNull().default(0),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  sellPrice: numeric("sell_price", { precision: 10, scale: 2 }),
  isQuarantined: boolean("is_quarantined").default(false),
  quarantineReason: text("quarantine_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Type exports for new pharmacy tables
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type PrescriptionItem = typeof prescriptionItems.$inferSelect;
export type NewPrescriptionItem = typeof prescriptionItems.$inferInsert;
export type DrugInteraction = typeof drugInteractions.$inferSelect;
export type NewDrugInteraction = typeof drugInteractions.$inferInsert;
export type PharmacyInventory = typeof pharmacyInventory.$inferSelect;
export type NewPharmacyInventory = typeof pharmacyInventory.$inferInsert;

// Missing tables for analytics, loyalty, marketing, etc.

// --- SALES FORECASTS ---
export const salesForecasts = pgTable("sales_forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id),
  productId: uuid("product_id").references(() => products.id),
  forecastDate: date("forecast_date").notNull(),
  forecastType: text("forecast_type", { enum: ["daily", "weekly", "monthly", "quarterly"] }).notNull(),
  predictedQuantity: integer("predicted_quantity").notNull(),
  predictedRevenue: numeric("predicted_revenue", { precision: 10, scale: 2 }).notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }), // confidence percentage
  model: text("model"), // forecasting model used
  parameters: jsonb("parameters"), // model parameters
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// --- REORDER SUGGESTIONS ---
export const reorderSuggestions = pgTable("reorder_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  currentStock: integer("current_stock").notNull(),
  minStockLevel: integer("min_stock_level").notNull(),
  suggestedQuantity: integer("suggested_quantity").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  reason: text("reason"),
  estimatedCost: numeric("estimated_cost", { precision: 10, scale: 2 }),
  supplierIds: jsonb("supplier_ids"), // array of supplier IDs
  status: text("status", { enum: ["pending", "approved", "ordered", "dismissed"] }).default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- PURCHASE ORDERS ---
export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status", { enum: ["draft", "pending", "approved", "ordered", "received", "cancelled"] }).default("draft"),
  orderDate: date("order_date").notNull(),
  expectedDeliveryDate: date("expected_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- PURCHASE ORDER ITEMS ---
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  quantityReceived: integer("quantity_received").default(0),
  notes: text("notes"),
});

// --- LOYALTY TRANSACTIONS ---
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  type: text("type", { enum: ["earned", "redeemed", "expired", "adjusted"] }).notNull(),
  points: integer("points").notNull(),
  description: text("description"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// --- LOYALTY REWARDS ---
export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  pointsRequired: integer("points_required").notNull(),
  rewardType: text("reward_type", { enum: ["discount", "product", "service", "cashback"] }).notNull(),
  rewardValue: numeric("reward_value", { precision: 10, scale: 2 }),
  productId: uuid("product_id").references(() => products.id),
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// --- MARKETING CAMPAIGNS ---
export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ["email", "sms", "push", "social", "print"] }).notNull(),
  status: text("status", { enum: ["draft", "scheduled", "active", "paused", "completed", "cancelled"] }).default("draft"),
  targetAudience: jsonb("target_audience"), // segment criteria
  content: jsonb("content"), // campaign content
  budget: numeric("budget", { precision: 10, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 10, scale: 2 }).default("0.00"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  revenue: numeric("revenue", { precision: 10, scale: 2 }).default("0.00"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- ECOMMERCE PRODUCTS ---
export const ecommerceProducts = pgTable("ecommerce_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  onlineStatus: text("online_status", { enum: ["active", "inactive", "out_of_stock"] }).default("active"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"),
  weight: numeric("weight", { precision: 8, scale: 3 }),
  dimensions: text("dimensions"),
  shippingClass: text("shipping_class"),
  digitalProduct: boolean("digital_product").default(false),
  downloadUrl: text("download_url"),
  onlinePrice: numeric("online_price", { precision: 10, scale: 2 }),
  specialPrice: numeric("special_price", { precision: 10, scale: 2 }),
  specialPriceFrom: date("special_price_from"),
  specialPriceTo: date("special_price_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- INTEGRATION CONFIGS ---
export const integrationConfigs = pgTable("integration_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  integrationType: text("integration_type", { enum: ["quickbooks", "xero", "shopify", "woocommerce", "mailchimp", "stripe"] }).notNull(),
  isEnabled: boolean("is_enabled").default(false),
  credentials: jsonb("credentials"), // encrypted credentials
  settings: jsonb("settings"), // integration-specific settings
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  nextSyncAt: timestamp("next_sync_at", { withTimezone: true }),
  syncFrequency: text("sync_frequency", { enum: ["manual", "hourly", "daily", "weekly"] }).default("daily"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- SYNC LOGS ---
export const syncLogs = pgTable("sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  integrationConfigId: uuid("integration_config_id").notNull().references(() => integrationConfigs.id, { onDelete: "cascade" }),
  syncType: text("sync_type", { enum: ["full", "incremental", "manual"] }).notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsFailed: integer("records_failed").default(0),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// --- MOBILE DEVICES ---
export const mobileDevices = pgTable("mobile_devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  deviceId: text("device_id").notNull().unique(),
  deviceName: text("device_name"),
  platform: text("platform", { enum: ["ios", "android", "web"] }).notNull(),
  appVersion: text("app_version"),
  osVersion: text("os_version"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- OFFLINE TRANSACTIONS ---
export const offlineTransactions = pgTable("offline_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: text("device_id").notNull().references(() => mobileDevices.deviceId),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id),
  localTransactionId: text("local_transaction_id").notNull(),
  transactionData: jsonb("transaction_data").notNull(),
  status: text("status", { enum: ["pending", "synced", "failed", "conflict"] }).default("pending"),
  syncedTransactionId: uuid("synced_transaction_id").references(() => transactions.id),
  syncAttempts: integer("sync_attempts").default(0),
  lastSyncAttempt: timestamp("last_sync_attempt", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- TRANSACTION PAYMENTS ---
export const transactionPayments = pgTable("transaction_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  paymentMethod: text("payment_method", { enum: ["cash", "card", "mobile", "gift_card", "store_credit"] }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  cardType: text("card_type"), // visa, mastercard, etc.
  last4Digits: text("last_4_digits"),
  authCode: text("auth_code"),
  referenceNumber: text("reference_number"),
  processorResponse: jsonb("processor_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// --- TIPS ---
export const tips = pgTable("tips", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  employeeId: uuid("employee_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  tipType: text("tip_type", { enum: ["cash", "card", "split"] }).notNull(),
  paymentMethod: text("payment_method", { enum: ["cash", "card"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// --- PROMOTIONS ---
export const promotions = pgTable("promotions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ["percentage", "fixed_amount", "buy_x_get_y", "free_shipping"] }).notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minimumPurchase: numeric("minimum_purchase", { precision: 10, scale: 2 }),
  maximumDiscount: numeric("maximum_discount", { precision: 10, scale: 2 }),
  applicableProducts: jsonb("applicable_products"), // product IDs or categories
  customerSegments: jsonb("customer_segments"), // target customer segments
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- STOCK ALERTS ---
export const stockAlerts = pgTable("stock_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  alertType: text("alert_type", { enum: ["low_stock", "out_of_stock", "overstock", "expiry"] }).notNull(),
  threshold: integer("threshold"),
  currentValue: integer("current_value"),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  message: text("message"),
  isActive: boolean("is_active").default(true),
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- STORE LOCATIONS (alias for locations) ---
export const storeLocations = locations;

// Original type exports
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;
export type LocationSettings = typeof locationSettings.$inferSelect;
export type NewLocationSettings = typeof locationSettings.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type CashSession = typeof cashSessions.$inferSelect;
export type NewCashSession = typeof cashSessions.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
export type HeldTransaction = typeof heldTransactions.$inferSelect;
export type NewHeldTransaction = typeof heldTransactions.$inferInsert;
export type InventoryAdjustmentLog = typeof inventoryAdjustmentLogs.$inferSelect;
export type NewInventoryAdjustmentLog = typeof inventoryAdjustmentLogs.$inferInsert;

// New table type exports
export type SalesForecast = typeof salesForecasts.$inferSelect;
export type NewSalesForecast = typeof salesForecasts.$inferInsert;
export type ReorderSuggestion = typeof reorderSuggestions.$inferSelect;
export type NewReorderSuggestion = typeof reorderSuggestions.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type NewLoyaltyTransaction = typeof loyaltyTransactions.$inferInsert;
export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;
export type NewLoyaltyReward = typeof loyaltyRewards.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type EcommerceProduct = typeof ecommerceProducts.$inferSelect;
export type NewEcommerceProduct = typeof ecommerceProducts.$inferInsert;
export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type NewIntegrationConfig = typeof integrationConfigs.$inferInsert;
export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;
export type MobileDevice = typeof mobileDevices.$inferSelect;
export type NewMobileDevice = typeof mobileDevices.$inferInsert;
export type OfflineTransaction = typeof offlineTransactions.$inferSelect;
export type NewOfflineTransaction = typeof offlineTransactions.$inferInsert;
export type TransactionPayment = typeof transactionPayments.$inferSelect;
export type NewTransactionPayment = typeof transactionPayments.$inferInsert;
export type Tip = typeof tips.$inferSelect;
export type NewTip = typeof tips.$inferInsert;
export type Promotion = typeof promotions.$inferSelect;
export type NewPromotion = typeof promotions.$inferInsert;
export type StockAlert = typeof stockAlerts.$inferSelect;
export type NewStockAlert = typeof stockAlerts.$inferInsert;

// ===== UNIT OF MEASURE SYSTEM =====

// UOM category enum
export const uomCategoryEnum = pgEnum('uom_category', ['packaging', 'weight', 'volume', 'count']);

// Units of Measure master table
export const unitsOfMeasure = pgTable("units_of_measure", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).notNull(), // e.g., "PACK", "CARD", "STRIP", "TAB"
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Pack", "Card", "Strip", "Tablet"
  abbreviation: varchar("abbreviation", { length: 10 }).notNull(), // e.g., "pk", "cd", "st", "tab"
  category: uomCategoryEnum("category").notNull(),
  isBaseUnit: boolean("is_base_unit").default(false), // true for the smallest sellable unit
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueCodePerBusiness: unique("unique_code_per_business").on(table.businessId, table.code),
  uniqueNamePerBusiness: unique("unique_name_per_business").on(table.businessId, table.name),
  codeIdx: index('idx_uom_code').on(table.code),
  categoryIdx: index('idx_uom_category').on(table.category),
}));

// Product UOM configurations
export const productUoms = pgTable("product_uoms", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  uomId: uuid("uom_id").notNull().references(() => unitsOfMeasure.id, { onDelete: "cascade" }),
  isBaseUom: boolean("is_base_uom").default(false), // the UOM for inventory tracking
  isSellingUom: boolean("is_selling_uom").default(true), // can be sold in this UOM
  isPurchasingUom: boolean("is_purchasing_uom").default(false), // can be purchased in this UOM
  conversionFactor: numeric("conversion_factor", { precision: 15, scale: 6 }).notNull().default("1.0"), // how many base units = 1 of this UOM
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }), // selling price for this UOM (optional override)
  barcode: varchar("barcode", { length: 100 }), // specific barcode for this UOM
  skuSuffix: varchar("sku_suffix", { length: 20 }), // suffix to add to main SKU (e.g., "-PK" for pack)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueProductUom: unique("unique_product_uom").on(table.productId, table.uomId),
  productIdx: index('idx_product_uoms_product').on(table.productId),
  uomIdx: index('idx_product_uoms_uom').on(table.uomId),
  baseUomIdx: index('idx_product_uoms_base').on(table.productId, table.isBaseUom),
  sellingUomIdx: index('idx_product_uoms_selling').on(table.productId, table.isSellingUom),
}));

// UOM conversion rules
export const uomConversions = pgTable("uom_conversions", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  fromUomId: uuid("from_uom_id").notNull().references(() => unitsOfMeasure.id, { onDelete: "cascade" }),
  toUomId: uuid("to_uom_id").notNull().references(() => unitsOfMeasure.id, { onDelete: "cascade" }),
  conversionFactor: numeric("conversion_factor", { precision: 15, scale: 6 }).notNull(), // from_qty * factor = to_qty
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueConversion: unique("unique_conversion").on(table.businessId, table.fromUomId, table.toUomId),
  fromUomIdx: index('idx_uom_conversions_from').on(table.fromUomId),
  toUomIdx: index('idx_uom_conversions_to').on(table.toUomId),
}));

// Multi-UOM inventory tracking
export const inventoryByUom = pgTable("inventory_by_uom", {
  id: uuid("id").defaultRandom().primaryKey(),
  inventoryId: uuid("inventory_id").notNull().references(() => inventory.id, { onDelete: "cascade" }),
  uomId: uuid("uom_id").notNull().references(() => unitsOfMeasure.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 15, scale: 6 }).notNull().default("0"),
  reservedQuantity: numeric("reserved_quantity", { precision: 15, scale: 6 }).default("0"), // for pending orders
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueInventoryUom: unique("unique_inventory_uom").on(table.inventoryId, table.uomId),
  inventoryIdx: index('idx_inventory_by_uom_inventory').on(table.inventoryId),
  uomIdx: index('idx_inventory_by_uom_uom').on(table.uomId),
}));

// Packaging hierarchy for complex pharmaceutical products
export const productPackagingHierarchy = pgTable("product_packaging_hierarchy", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  parentUomId: uuid("parent_uom_id").notNull().references(() => unitsOfMeasure.id), // e.g., "PACK"
  childUomId: uuid("child_uom_id").notNull().references(() => unitsOfMeasure.id),  // e.g., "CARD"
  quantityPerParent: numeric("quantity_per_parent", { precision: 15, scale: 6 }).notNull(), // how many child units per parent
  levelOrder: integer("level_order").notNull(), // 1=highest (pack), 2=card, 3=strip, 4=tablet
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueHierarchy: unique("unique_hierarchy").on(table.productId, table.parentUomId, table.childUomId),
  productIdx: index('idx_packaging_hierarchy_product').on(table.productId),
  parentIdx: index('idx_packaging_hierarchy_parent').on(table.parentUomId),
  childIdx: index('idx_packaging_hierarchy_child').on(table.childUomId),
  levelIdx: index('idx_packaging_hierarchy_level').on(table.productId, table.levelOrder),
}));

// UOM type exports
export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type NewUnitOfMeasure = typeof unitsOfMeasure.$inferInsert;
export type ProductUom = typeof productUoms.$inferSelect;
export type NewProductUom = typeof productUoms.$inferInsert;
export type UomConversion = typeof uomConversions.$inferSelect;
export type NewUomConversion = typeof uomConversions.$inferInsert;
export type InventoryByUom = typeof inventoryByUom.$inferSelect;
export type NewInventoryByUom = typeof inventoryByUom.$inferInsert;
export type ProductPackagingHierarchy = typeof productPackagingHierarchy.$inferSelect;
export type NewProductPackagingHierarchy = typeof productPackagingHierarchy.$inferInsert;