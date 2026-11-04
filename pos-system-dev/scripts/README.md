# 🗑️ HARDYPOS Demo Data Cleanup Scripts

This directory contains scripts to safely delete demo data from your HARDYPOS database. Use these scripts when you want to start fresh or clean up test data.

## ⚠️ **IMPORTANT WARNING**

**These scripts will permanently delete data from your database!**
- Make sure you have a backup if you need to restore data
- Test these scripts on a development database first
- Double-check your DATABASE_URL before running

---

## 📁 Available Scripts

### 1. **`clear-demo-data.js`** - Full-Featured Cleanup Script

The most comprehensive script with multiple options and safety features.

**Features:**
- ✅ Multiple deletion modes (all data, business only, users only, etc.)
- ✅ Dry-run mode to preview what will be deleted
- ✅ Interactive confirmation prompts
- ✅ Detailed progress reporting
- ✅ Error handling and rollback

**Usage:**
```bash
# Delete all data with confirmation
node scripts/clear-demo-data.js --all

# Dry run to see what would be deleted
node scripts/clear-demo-data.js --all --dry-run

# Delete only business data (products, inventory, transactions)
node scripts/clear-demo-data.js --business-data

# Delete only user and authentication data
node scripts/clear-demo-data.js --users-only

# Delete only transaction data
node scripts/clear-demo-data.js --transactions

# Delete only pharmacy data
node scripts/clear-demo-data.js --pharmacy

# Skip confirmation (for automation)
node scripts/clear-demo-data.js --all --confirm
```

### 2. **`quick-clear.js`** - Simple & Fast Cleanup

A streamlined script for quick data cleanup with minimal prompts.

**Features:**
- ✅ Simple one-command operation
- ✅ Database connection testing
- ✅ Data summary before deletion
- ✅ Progress tracking
- ✅ Graceful error handling

**Usage:**
```bash
# Clear all demo data (with simple confirmation)
node scripts/quick-clear.js
```

### 3. **`clear-demo-data.sql`** - Pure SQL Version

A SQL script that can be run directly in any PostgreSQL client.

**Features:**
- ✅ No Node.js dependencies required
- ✅ Can be run in psql, pgAdmin, or any SQL client
- ✅ Built-in safety with transaction rollback
- ✅ Shows before/after row counts
- ✅ Detailed comments and instructions

**Usage:**
```bash
# Using psql command line
psql -d your_database -f scripts/clear-demo-data.sql

# Or copy and paste into your SQL client
# (Make sure to read the safety instructions in the file)
```

---

## 🚀 Quick Start

### Method 1: Node.js Script (Recommended)
```bash
# 1. Make sure you have DATABASE_URL set in your .env file
echo "DATABASE_URL=postgresql://user:pass@host:port/database" >> .env

# 2. Run the quick clear script
node scripts/quick-clear.js

# 3. Follow the prompts
```

### Method 2: Advanced Options
```bash
# Preview what will be deleted (safe)
node scripts/clear-demo-data.js --all --dry-run

# If satisfied, run the actual deletion
node scripts/clear-demo-data.js --all
```

### Method 3: SQL Client
```bash
# Run in your SQL client
psql -d your_database -f scripts/clear-demo-data.sql

# Or open scripts/clear-demo-data.sql in pgAdmin and execute
```

---

## 📊 What Gets Deleted

### **All Data Mode** (`--all`)
Deletes everything from all tables:
- 👥 Users, staff, and authentication data
- 🏢 Business and location settings  
- 📦 Products, categories, and inventory
- 🛒 Transactions and sales data
- 👤 Customers and loyalty data
- 💊 Pharmacy data (patients, prescriptions, etc.)
- 📊 Analytics and reporting data
- 🔧 System logs and configurations

### **Business Data Mode** (`--business-data`)
Deletes operational data but keeps system structure:
- 🏢 Businesses and locations
- 📦 Products and inventory
- 🛒 Transactions and sales
- 👤 Customers
- 📊 Operations data

### **Users Only Mode** (`--users-only`)
Deletes only user-related data:
- 👥 Users and staff
- 🔐 Authentication data
- 📅 Schedules and shifts
- 📋 Audit logs

### **Transactions Mode** (`--transactions`)
Deletes only transaction-related data:
- 🛒 Sales transactions
- 💳 Payment records
- 📝 Transaction items
- 💰 Cash sessions

### **Pharmacy Mode** (`--pharmacy`)
Deletes only pharmacy-specific data:
- 👥 Patients and doctors
- 💊 Prescriptions and medications
- ⚕️ Drug interactions
- 📋 Pharmacy inventory

---

## 🛡️ Safety Features

### **Transaction Rollback**
All scripts use database transactions, so if an error occurs partway through, the database remains unchanged.

### **Foreign Key Handling**
Scripts delete tables in the correct order to respect foreign key constraints.

### **Connection Testing**
Scripts test database connectivity before attempting any operations.

### **Dry Run Mode**
Preview exactly what will be deleted without making changes:
```bash
node scripts/clear-demo-data.js --all --dry-run
```

### **Confirmation Prompts**
Interactive confirmation prevents accidental data loss (can be skipped with `--confirm` flag).

---

## 🔧 Environment Setup

### **Required Environment Variables**
```bash
# .env or .env.local file
DATABASE_URL=postgresql://username:password@host:port/database_name

# For Neon Database (example)
DATABASE_URL=postgresql://username:password@ep-cool-lab-123456.us-east-1.aws.neon.tech/neondb

# For local PostgreSQL (example)  
DATABASE_URL=postgresql://postgres:password@localhost:5432/hardypos_dev
```

### **Dependencies**
The Node.js scripts require:
- `@neondatabase/serverless` - For database connection
- `drizzle-orm` - For ORM operations
- `dotenv` - For environment variables

These should already be installed if you're running the HARDYPOS application.

---

## 🚨 Troubleshooting

### **"DATABASE_URL not found"**
```bash
# Make sure you have the environment variable set
echo $DATABASE_URL

# Or check your .env file
cat .env | grep DATABASE_URL
```

### **"Connection failed"**
- Verify your database is running
- Check your DATABASE_URL format
- Ensure network connectivity
- Verify credentials

### **"Permission denied"**
- Make sure your database user has DELETE permissions
- Check if any tables are locked
- Verify you have access to all schemas

### **"Foreign key constraint error"**
This shouldn't happen with these scripts since they delete in the correct order, but if it does:
- Check if any custom foreign keys were added
- Try the SQL version which handles constraints explicitly

---

## 📝 Best Practices

### **Before Running**
1. ✅ **Backup your database** if you need to restore data
2. ✅ **Test on development database** first
3. ✅ **Verify DATABASE_URL** points to correct database
4. ✅ **Close all application connections** to avoid locks

### **During Execution**
1. ✅ **Don't interrupt the process** - let it complete
2. ✅ **Monitor for errors** - check console output
3. ✅ **Keep terminal open** until completion

### **After Running**
1. ✅ **Verify data is deleted** - check key tables
2. ✅ **Restart your application** - clear any cached data
3. ✅ **Seed fresh data** if needed

---

## 🔄 After Cleanup

Once you've cleared the demo data, you can:

### **Start Fresh**
```bash
# Your application will create new data as you use it
npm run dev
```

### **Seed Demo Data** (if available)
```bash
# If you have a seeding script
node scripts/seed-demo-data.js
```

### **Manual Setup**
1. Create a new business through the onboarding flow
2. Add users, products, and inventory through the UI
3. Process some test transactions

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your environment setup
3. Try the dry-run mode first to identify issues
4. Check database logs for detailed error messages

Remember: **These scripts are designed to be safe and reliable, but always test in a development environment first!** 🛡️