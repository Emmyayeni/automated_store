# HARDYPOS - Point of Sale Management System

A comprehensive, enterprise-grade Point of Sale system built with Next.js, TypeScript, and PostgreSQL.

## Features

### 🏪 Core POS Features
- **Sales & Transactions** - Complete checkout process with multiple payment methods
- **Product Management** - Comprehensive product catalog with SKUs and barcodes
- **Inventory Management** - Real-time stock tracking and low stock alerts
- **Customer Management** - Customer database with loyalty program
- **Multi-location Support** - Manage multiple store locations

### 📊 Advanced Features
- **Analytics & Reporting** - Sales forecasting and business intelligence
- **Employee Management** - Time tracking and role-based permissions
- **Hardware Integration** - Barcode scanners, receipt printers, cash drawers
- **Third-party Integrations** - QuickBooks, Stripe, e-commerce platforms
- **Mobile Support** - Tablet and mobile POS capabilities

### 🏥 Industry Support
- **Retail** - General merchandise and specialty retail
- **Restaurant** - Food service and hospitality
- **Grocery** - Fresh produce and packaged goods
- **Pharmacy** - Pharmaceutical and healthcare products
- **And more** - Customizable for any retail business

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pos-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Access the application**
   - Visit `http://localhost:3000/onboarding` to set up your business
   - Or `http://localhost:3000/login` if already configured

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **UI**: Tailwind CSS, Radix UI, Shadcn/ui
- **Authentication**: NextAuth.js
- **ORM**: Drizzle ORM

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── onboarding/        # Business setup wizard
│   ├── pos/               # Point of sale interface
│   └── ...                # Other pages
├── components/            # Reusable components
│   ├── pos/              # POS-specific components
│   ├── ui/               # UI components
│   └── ...               # Feature components
├── lib/                  # Utilities and configurations
├── scripts/              # Database scripts and utilities
└── public/               # Static assets
```

## Database

The system uses PostgreSQL with comprehensive schema including:
- User management and authentication
- Product catalog and inventory
- Transaction processing
- Customer relationship management
- Analytics and reporting
- Multi-location support

## Printing & Hardware Notes

### Receipt Printing Strategy
This project ships with multiple printing pathways:

- `escpos` (and its transport packages) for thermal receipt printers (USB / Serial / Network)
- Optional legacy `printer` native module (system spooler access) which is NOT installed in serverless builds
- Future: network raw socket / IPP integration (see `lib/printing.ts`)

### Why the legacy `printer` module is optional
`printer@0.4.x` depends on very old build tooling (`grunt@~0.4`) which causes peer dependency conflicts on modern Node.js (and often fails on platforms like Vercel's serverless/edge). To avoid deployment failures:

1. The dependency has been removed from mandatory `dependencies`.
2. Printing calls are funneled through a safe dynamic loader (`lib/printing.ts`).
3. If the native module is missing, the system returns a structured warning rather than crashing.

### Local Development (Full Native Support)
If you need system spooler printing locally (Windows/macOS/Linux):
```bash
pnpm add printer @types/printer -w --no-strict-peer-dependencies
```
If build fails, ensure you have:
- Node.js LTS (consider downgrading if Node 22+ causes gyp issues)
- Python 3.x available to node-gyp
- Build tools (Windows Build Tools / Xcode Command Line Tools / make & gcc)

### Recommended Migration
Prefer the ESC/POS pathway (`escpos*` packages) or adopt a more modern library like `node-thermal-printer` for cross‑platform reliability.

### File of Interest
`lib/printing.ts` centralizes logic and should be extended instead of importing native modules directly in routes/components.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

---

**HARDYPOS** - Empowering businesses with advanced point of sale technology.
