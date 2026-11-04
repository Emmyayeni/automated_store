# HARDYPOS Complete System Documentation

## 🏗️ System Architecture Overview

**HARDYPOS** is a comprehensive, multi-tenant Point of Sale (POS) system built with Next.js 15, React 19, and TypeScript. It serves retail businesses and pharmacies with advanced inventory management, customer relations, staff management, and analytics capabilities.

### 🎯 Core Features
- **Multi-tenant Architecture**: Supports multiple businesses with isolated data
- **Role-based Access Control**: ADMIN, MANAGER, CASHIER with granular permissions
- **PWA Support**: Full offline capabilities and mobile app experience
- **Pharmacy Integration**: Specialized features for pharmaceutical businesses
- **Real-time Analytics**: Business intelligence and reporting
- **Inventory Management**: Stock tracking, transfers, and automated alerts
- **Customer Management**: Loyalty programs, segmentation, and feedback

---

## 📁 Project Structure

```
pos-system/
├── app/                          # Next.js 13+ App Router
│   ├── (auth)/                  # Authentication pages
│   │   ├── login/              # Login page
│   │   └── onboarding/         # Business setup wizard
│   ├── admin/                   # Admin dashboard and management
│   ├── manager/                 # Manager interface
│   ├── cashier/                 # Cashier POS interface
│   ├── pos/                     # Main POS interface
│   ├── api/                     # API routes (REST endpoints)
│   │   ├── admin/              # Admin-only endpoints
│   │   ├── analytics/          # Analytics and reporting
│   │   ├── business/           # Business management
│   │   ├── customers/          # Customer management
│   │   ├── inventory/          # Inventory operations
│   │   ├── pharmacy/           # Pharmacy-specific features
│   │   ├── products/           # Product management
│   │   ├── staff/              # Staff management
│   │   ├── store/              # Store/location management
│   │   └── transactions/       # Sales transactions
│   └── globals.css             # Global styles
├── components/                  # Reusable UI components
│   ├── admin/                  # Admin interface components
│   ├── analytics/              # Analytics dashboards
│   ├── customers/              # Customer management UI
│   ├── inventory/              # Inventory management UI
│   ├── pharmacy/               # Pharmacy-specific UI
│   ├── pos/                    # POS interface components
│   ├── ui/                     # Base UI components (shadcn/ui)
│   └── marketing/              # Landing page components
├── lib/                        # Core business logic and utilities
│   ├── standards/              # ✨ Standardization framework
│   │   ├── api-responses.ts    # Unified API response formats
│   │   ├── error-handling.ts   # Comprehensive error management
│   │   ├── formatting.ts       # Date/currency formatting
│   │   ├── validation.ts       # Form validation utilities
│   │   └── auth-patterns.ts    # Authentication helpers
│   ├── types/                  # TypeScript type definitions
│   │   ├── auth.ts            # Authentication types
│   │   ├── api.ts             # API request/response types
│   │   └── business.ts        # Business domain types
│   ├── constants/              # Application constants
│   ├── auth.ts                 # NextAuth configuration
│   ├── db.ts                   # Database connection
│   ├── schema.ts               # Database schema (Drizzle ORM)
│   └── roles.ts                # Role-based access control
├── scripts/                    # Utility scripts
├── public/                     # Static assets (PWA icons, manifest)
└── docs/                       # Documentation and API specs
```

---

## 🗄️ Database Schema

### Core Tables

#### **Businesses** (Multi-tenant Root)
```sql
businesses
├── id (UUID, PK)
├── name (Business name)
├── logoUrl (Company logo)
├── industry (Business category)
├── address, phone, email, website
├── taxRate (Default tax rate)
├── currency (Business currency)
├── timezone (Business timezone)
└── timestamps (created_at, updated_at)
```

#### **Users** (Authentication & Access)
```sql
users
├── id (UUID, PK)
├── email (unique login)
├── name (consolidated from firstName/lastName)
├── passwordHash (bcrypt encrypted)
├── role (ADMIN | MANAGER | CASHIER)
├── businessId (FK → businesses.id)
├── locationId (FK → locations.id)
├── isActive (account status)
└── timestamps
```

#### **Locations** (Stores/Branches)
```sql
locations
├── id (UUID, PK)
├── businessId (FK → businesses.id)
├── name (Store name)
├── address, phone, email
├── timezone, currency, taxRate (overrides)
├── status (active | inactive | under_construction)
├── managerId (FK → users.id)
├── openHours (JSON schedule)
└── timestamps
```

#### **Products** (Unified Product Model)
```sql
products
├── id (UUID, PK)
├── businessId (FK → businesses.id)
├── name, description, imageUrl
├── price (decimal)
├── category, barcode, sku
├── isActive (status)
│
├── -- Pharmacy Fields --
├── drugType (prescription | otc | controlled)
├── drugForm (tablet | capsule | syrup | etc.)
├── strength, genericName, brandName
├── manufacturer, batchNumber
├── expiryDate, manufacturingDate
├── drugLicenseNumber
├── storageConditions
├── activeIngredient, dosageInstructions
├── sideEffects, contraindications
├── requiresPrescription, isControlledSubstance
├── controlledSubstanceSchedule
│
├── -- Equipment Fields --
├── modelNumber, serialNumber
├── warrantyPeriod, equipmentType
├── powerRequirements, dimensions, weight
├── maintenanceSchedule
├── calibrationRequired, needsMaintenance
│
├── -- Inventory Fields --
├── costPrice, stockLevel, reorderLevel
├── location (storage location)
├── certificationNumber, specialHandling
└── timestamps
```

#### **Inventory** (Stock Management)
```sql
inventory
├── id (UUID, PK)
├── locationId (FK → locations.id)
├── productId (FK → products.id)
├── quantity (current stock)
├── minStockLevel, maxStockLevel
├── costPrice, sellPrice
└── updatedAt
```

#### **Transactions** (Sales Records)
```sql
transactions
├── id (UUID, PK)
├── transactionNumber (unique identifier)
├── locationId (FK → locations.id)
├── customerId (FK → customers.id, optional)
├── cashierId (FK → users.id)
├── subtotal, taxAmount, discountAmount
├── total (final amount)
├── paymentMethod (cash | card | mobile | other)
├── status (completed | refunded | voided)
├── notes
└── timestamps
```

### Extended Tables

#### **Pharmacy System**
- **patients**: Patient records with medical information
- **doctors**: Licensed healthcare providers
- **prescriptions**: Prescription tracking and validation
- **prescription_items**: Individual prescribed medications
- **drug_interactions**: Drug compatibility database
- **pharmacy_inventory**: Batch tracking for medications

#### **Customer Management**
- **customers**: Customer profiles and contact information
- **customer_segments**: Dynamic customer grouping
- **customer_feedback**: Review and feedback system
- **customer_appointments**: Scheduling system

#### **Staff & Operations**
- **shifts**: Employee work periods
- **employee_schedules**: Staff scheduling
- **cash_sessions**: Cash drawer management
- **staff_invites**: Employee onboarding

#### **Analytics & Reporting**
- **audit_logs**: System activity tracking
- **sales_forecasts**: Predictive analytics
- **competitor_analysis**: Market intelligence
- **backup_records**: Data backup tracking

---

## 🔐 Authentication & Authorization Flow

### Authentication Process

```mermaid
sequenceDiagram
    participant U as User
    participant L as Login Page
    participant A as NextAuth
    participant D as Database
    participant S as Session

    U->>L: Enter credentials
    L->>A: authenticate()
    A->>D: Verify user & password
    D-->>A: User data + business info
    A->>S: Create JWT session
    S-->>U: Redirect to role dashboard
```

### Role-Based Access Control

```typescript
// Role definitions with uppercase normalization
const ROLES = {
  ADMIN: "ADMIN",     // System administrator
  MANAGER: "MANAGER", // Store manager
  CASHIER: "CASHIER"  // Sales associate
} as const;

// Permission matrix
const ROLE_PERMISSIONS = {
  ADMIN: [
    "view_sales", "manage_inventory", "manage_staff",
    "manage_business", "view_analytics", "manage_locations",
    "access_admin_panel", "export_data"
  ],
  MANAGER: [
    "view_sales", "manage_inventory", "manage_staff",
    "view_analytics", "manage_customers", "manage_shifts",
    "process_returns", "void_transactions"
  ],
  CASHIER: [
    "view_sales", "view_inventory", "process_transactions",
    "scan_products", "alert_low_stock"
  ]
};
```

### Session Management

```typescript
// Standardized session validation
export async function validateSession(): Promise<AuthValidationResult> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { isValid: false, error: "No active session" };
  }
  
  // Validate role and business association
  if (!isValidRole(session.user.role)) {
    return { isValid: false, error: "Invalid user role" };
  }
  
  if (!session.user.isActive) {
    return { isValid: false, error: "User account inactive" };
  }
  
  return {
    isValid: true,
    user: normalizeUserData(session.user)
  };
}
```

---

## 🛣️ API Architecture

### Standardized API Response Format

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Success response
{
  "success": true,
  "data": { /* result data */ }
}

// Error response
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}

// Paginated response
{
  "success": true,
  "data": [/* items */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### API Route Structure

#### **Core Business APIs**
- `GET/POST/PATCH/DELETE /api/business` - Business management
- `GET/POST/PUT/DELETE /api/store` - Location management
- `GET/POST /api/team` - Staff management
- `GET/POST /api/staff/schedule` - Employee scheduling

#### **Product & Inventory APIs**
- `GET/POST/PUT/DELETE /api/products` - Product management
- `GET/POST /api/products/register-barcode` - Barcode registration
- `GET /api/products/generate-sku` - SKU generation
- `GET/POST /api/inventory/batch-tracking` - Inventory tracking
- `GET /api/stock-alerts` - Low stock notifications

#### **Transaction APIs**
- `GET/POST /api/transactions` - Sales transactions
- `POST /api/transactions/[id]/void` - Void transactions
- `POST /api/transactions/[id]/refund` - Process refunds
- `GET/POST /api/shifts` - Shift management

#### **Customer APIs**
- `GET/POST/PUT /api/customers` - Customer management
- `GET/POST/PUT /api/customers/segments` - Customer segmentation
- `GET/POST/PUT /api/customers/feedback` - Feedback system

#### **Pharmacy APIs**
- `GET/POST/PUT /api/pharmacy/patients` - Patient management
- `GET/POST/PUT /api/pharmacy/doctors` - Doctor registration
- `GET/POST/PUT /api/pharmacy/prescriptions` - Prescription handling
- `GET/POST/PUT /api/pharmacy/drug-interactions` - Drug compatibility
- `GET/POST/PUT /api/pharmacy/quarantine` - Medication quarantine

#### **Analytics APIs**
- `GET /api/analytics/advanced` - Business analytics
- `GET /api/analytics/financial` - Financial reporting
- `GET /api/admin/analytics/shifts` - Shift analytics
- `GET /api/admin/reports` - Administrative reports

#### **Admin APIs**
- `GET /api/admin/stats` - Business statistics
- `GET /api/admin/inventory/all` - Cross-location inventory
- `GET /api/admin/recent-orders` - Recent transactions
- `GET /api/admin/shifts` - Shift management
- `DELETE /api/admin/clear-data` - Data management

---

## 🖥️ User Interface Flow

### Landing & Onboarding

```mermaid
flowchart TD
    A[Landing Page] --> B{User Authenticated?}
    B -->|No| C[Login Page]
    B -->|Yes| D{Has Business?}
    C --> E[Authentication]
    E --> D
    D -->|No| F[Onboarding Wizard]
    D -->|Yes| G{User Role?}
    F --> H[Business Setup]
    H --> I[Location Setup]
    I --> J[Initial Products]
    J --> G
    G -->|ADMIN| K[Admin Dashboard]
    G -->|MANAGER| L[Manager Dashboard]
    G -->|CASHIER| M[POS Interface]
```

### Role-Based Dashboards

#### **Admin Dashboard** (`/admin`)
- **Business Overview**: Cross-location analytics
- **Location Management**: Manage all stores/branches
- **Staff Management**: Employee administration
- **System Settings**: Business configuration
- **Reports**: Comprehensive business reporting

#### **Manager Dashboard** (`/manager`)
- **Location Analytics**: Store-specific metrics
- **Inventory Management**: Stock control and ordering
- **Staff Scheduling**: Employee shifts and time tracking
- **Customer Management**: Customer relations and feedback
- **Sales Reports**: Location performance analysis

#### **Cashier Interface** (`/pos`, `/cashier`)
- **POS System**: Product scanning and sales processing
- **Cart Management**: Transaction building and modification
- **Payment Processing**: Multiple payment methods
- **Customer Lookup**: Quick customer identification
- **Shift Management**: Clock in/out and cash drawer

### POS System Flow

```mermaid
flowchart TD
    A[POS Interface] --> B[Scan/Search Product]
    B --> C{Product Found?}
    C -->|No| D{User Role?}
    D -->|MANAGER| E[Register New Product]
    D -->|CASHIER| F[Contact Manager Error]
    C -->|Yes| G[Add to Cart]
    G --> H[Modify Quantity/Price]
    H --> I[Apply Discounts]
    I --> J[Select Customer]
    J --> K[Choose Payment Method]
    K --> L[Process Transaction]
    L --> M[Print Receipt]
    M --> N[Update Inventory]
    E --> G
```

---

## 🏪 Business Logic & Operations

### Inventory Management

#### **Stock Tracking**
```typescript
// Automatic inventory adjustment on sale
export async function processTransaction(transaction: Transaction) {
  // 1. Validate stock availability
  for (const item of transaction.items) {
    const stock = await getInventoryLevel(item.productId, transaction.locationId);
    if (stock < item.quantity) {
      throw new BusinessLogicError(`Insufficient stock for ${item.productName}`);
    }
  }
  
  // 2. Process payment
  const paymentResult = await processPayment(transaction);
  
  // 3. Update inventory
  await Promise.all(transaction.items.map(item => 
    adjustInventory(item.productId, transaction.locationId, -item.quantity, 'sale')
  ));
  
  // 4. Create transaction record
  return await createTransactionRecord(transaction);
}
```

#### **FEFO Management** (First Expired, First Out)
- Automatic batch tracking for perishable items
- Expiry date monitoring and alerts
- Quarantine system for expired medications
- Automated reordering based on expiry predictions

### Multi-Location Management

#### **Inventory Transfers**
```typescript
// Inter-location stock transfers
export async function createInventoryTransfer(request: TransferRequest) {
  // 1. Validate permissions and stock availability
  // 2. Create transfer request (pending approval)
  // 3. Manager approval workflow
  // 4. Update inventory on both locations
  // 5. Generate transfer documentation
}
```

#### **Centralized Configuration**
- Business-wide settings cascade to locations
- Location-specific overrides for tax rates, currency, timezone
- Unified reporting across all locations

### Customer Management

#### **Dynamic Segmentation**
```typescript
// Automatic customer segmentation
const segmentCriteria = {
  highValue: {
    totalSpent: { $gte: 1000 },
    transactionCount: { $gte: 10 }
  },
  frequent: {
    daysSinceLastPurchase: { $lte: 30 },
    transactionCount: { $gte: 5 }
  }
};

// Real-time segment updates
export async function updateCustomerSegments(businessId: string) {
  for (const [segmentName, criteria] of Object.entries(segmentCriteria)) {
    const customers = await db.select()
      .from(customers)
      .where(buildCriteriaQuery(criteria));
    
    await updateSegmentMembers(segmentName, customers);
  }
}
```

### Pharmacy Operations

#### **Prescription Validation**
```typescript
export async function validatePrescription(prescription: Prescription) {
  // 1. Verify doctor license
  const doctor = await verifyDoctorLicense(prescription.doctorId);
  
  // 2. Check drug interactions
  const interactions = await checkDrugInteractions(prescription.medications);
  
  // 3. Validate controlled substances
  const controlledCheck = await validateControlledSubstances(prescription.medications);
  
  // 4. Patient history review
  const patientHistory = await getPatientMedicationHistory(prescription.patientId);
  
  return {
    isValid: doctor.verified && !interactions.hasConflicts && controlledCheck.authorized,
    warnings: [...interactions.warnings, ...controlledCheck.warnings],
    recommendations: generateRecommendations(patientHistory, prescription)
  };
}
```

---

## 📊 Analytics & Reporting

### Real-time Analytics

#### **Business Dashboards**
- **Revenue Tracking**: Real-time sales monitoring
- **Inventory Alerts**: Low stock and expiry warnings
- **Staff Performance**: Productivity metrics
- **Customer Insights**: Buying patterns and preferences

#### **Key Performance Indicators (KPIs)**
```typescript
interface BusinessKPIs {
  revenue: {
    today: number;
    week: number;
    month: number;
    growth: number;
  };
  inventory: {
    lowStock: number;
    expiringSoon: number;
    totalValue: number;
  };
  customers: {
    newToday: number;
    returning: number;
    satisfaction: number;
  };
  staff: {
    activeShifts: number;
    productivity: number;
    costs: number;
  };
}
```

### Advanced Analytics

#### **Predictive Features**
- **Sales Forecasting**: ML-based demand prediction
- **Inventory Optimization**: Automated reorder suggestions
- **Customer Lifetime Value**: Revenue prediction per customer
- **Seasonal Analysis**: Trend identification and planning

#### **Financial Reporting**
- **Profit & Loss Statements**: Automated P&L generation
- **Cash Flow Analysis**: Real-time cash position
- **Tax Reporting**: Compliant financial documentation
- **Cost Analysis**: Detailed expense breakdown

---

## 📱 Mobile & PWA Features

### Progressive Web App

#### **Installation**
- Service worker for offline functionality
- App manifest for native-like installation
- Push notifications for alerts
- Background sync for offline transactions

#### **Offline Capabilities**
```typescript
// Offline transaction storage
export class OfflineTransactionManager {
  async storeOfflineTransaction(transaction: Transaction) {
    // Store in IndexedDB
    await this.database.transactions.add({
      ...transaction,
      offline: true,
      timestamp: Date.now()
    });
  }
  
  async syncWhenOnline() {
    const offlineTransactions = await this.getOfflineTransactions();
    
    for (const transaction of offlineTransactions) {
      try {
        await this.syncTransaction(transaction);
        await this.markAsSynced(transaction.id);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}
```

### Mobile Optimization

#### **Touch-Friendly Interface**
- Large buttons and touch targets
- Gesture navigation
- Mobile-optimized layouts
- Barcode scanning via camera

#### **Hardware Integration**
- Receipt printer connectivity
- Cash drawer integration
- Barcode scanner support
- Payment terminal connection

---

## 🔧 Development & Deployment

### Technology Stack

#### **Frontend**
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React hooks + Context API
- **Forms**: React Hook Form with Zod validation

#### **Backend**
- **API**: Next.js API Routes (RESTful)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js with credentials provider
- **File Storage**: Local/cloud storage for images

#### **Infrastructure**
- **Hosting**: Vercel (recommended) or self-hosted
- **Database**: Neon, Supabase, or PostgreSQL
- **CDN**: Vercel Edge Network
- **Monitoring**: Built-in error tracking

### Code Quality & Standards

#### **Standardization Framework**
- **Consistent API Responses**: Unified response formats
- **Error Handling**: Comprehensive error management
- **Validation**: Centralized validation utilities
- **Formatting**: Consistent date/currency formatting
- **Authentication**: Standardized auth patterns

#### **Testing Strategy**
- **Unit Tests**: Component and utility testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Critical user flow validation
- **Performance Tests**: Load and stress testing

### Deployment Options

#### **Vercel (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel

# Configure environment variables in dashboard
# Deploy production version
vercel --prod
```

#### **Self-Hosted**
```bash
# Build for production
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

#### **Environment Configuration**
```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/database"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"

# Business Configuration
DEFAULT_CURRENCY="SLL"
DEFAULT_TIMEZONE="Africa/Freetown"
DEFAULT_TAX_RATE="0.15"
```

---

## 🏥 Specialized Features

### Pharmacy Management

#### **Regulatory Compliance**
- Drug license verification
- Controlled substance tracking
- Prescription audit trails
- Regulatory reporting

#### **Clinical Features**
- Drug interaction checking
- Patient medication history
- Dosage calculation assistance
- Clinical decision support

### Medical Equipment

#### **Asset Management**
- Equipment registration and tracking
- Maintenance scheduling and alerts
- Calibration management
- Warranty tracking

#### **Compliance Monitoring**
- Certification tracking
- Safety inspections
- Performance monitoring
- Regulatory compliance

---

## 🛡️ Security & Compliance

### Data Security

#### **Authentication Security**
- Password hashing with bcrypt
- JWT token management
- Session timeout handling
- Multi-factor authentication support

#### **Data Protection**
- Role-based data access
- Business data isolation
- Encrypted sensitive data
- GDPR compliance features

### Audit & Compliance

#### **Activity Logging**
```typescript
export async function logUserActivity(activity: AuditActivity) {
  await db.insert(auditLogs).values({
    userId: activity.userId,
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId,
    changes: JSON.stringify(activity.changes),
    ipAddress: activity.ipAddress,
    userAgent: activity.userAgent,
    timestamp: new Date()
  });
}
```

#### **Compliance Features**
- Complete audit trails
- Data retention policies
- Export capabilities
- Regulatory reporting

---

## 🚀 Getting Started

### Initial Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd pos-system
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env.local
# Edit .env.local with your database and auth settings
```

3. **Database Setup**
```bash
npm run db:migrate
npm run db:seed
```

4. **Development Server**
```bash
npm run dev
# Visit http://localhost:3000/onboarding
```

### First Business Setup

1. **Onboarding Wizard**: Complete business registration
2. **Location Setup**: Configure your first store/location
3. **User Creation**: Set up admin and staff accounts
4. **Product Import**: Add your initial inventory
5. **Configuration**: Set tax rates, currency, and preferences

### Production Deployment

1. **Environment Preparation**: Configure production environment variables
2. **Database Migration**: Run migrations on production database
3. **Application Deployment**: Deploy to hosting platform
4. **SSL Configuration**: Ensure HTTPS for security
5. **Monitoring Setup**: Configure error tracking and analytics

---

## 📚 Additional Resources

### Documentation
- **API Documentation**: Comprehensive endpoint documentation
- **Component Library**: UI component usage guide
- **Database Schema**: Complete ERD and table specifications
- **Deployment Guide**: Step-by-step production setup

### Support
- **Technical Support**: Development assistance and troubleshooting
- **User Training**: Staff training materials and guides
- **Best Practices**: Operational recommendations
- **Community**: Developer community and forums

---

## 🔮 Future Enhancements

### Planned Features
- **AI-Powered Analytics**: Machine learning insights
- **Voice Commerce**: Voice-activated transactions
- **Blockchain Integration**: Supply chain transparency
- **IoT Integration**: Smart inventory sensors
- **Advanced CRM**: Customer relationship automation
- **Multi-Currency Support**: International business support

### Roadmap
- **Q1 2024**: AI analytics and reporting
- **Q2 2024**: Advanced pharmacy features
- **Q3 2024**: IoT and hardware integration
- **Q4 2024**: International expansion features

---

*This documentation provides a comprehensive overview of the HARDYPOS system architecture, features, and operational flow. For specific implementation details, refer to the individual component documentation and API specifications.*