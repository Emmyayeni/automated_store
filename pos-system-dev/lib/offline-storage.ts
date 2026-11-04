// Offline storage utilities for POS system
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface POSDatabase extends DBSchema {
  transactions: {
    key: string;
    value: {
      id: string;
      localId: string;
      businessId: string;
      locationId: string;
      cashierId: string;
      customerId?: string;
      items: any[];
      subtotal: number;
      taxAmount: number;
      total: number;
      paymentMethod: string;
      status: 'pending' | 'synced' | 'failed';
      timestamp: number;
      syncAttempts: number;
    };
    indexes: { 'by-status': 'status'; 'by-timestamp': 'timestamp' };
  };
  inventory: {
    key: string;
    value: {
      locationId: string;
      productId: string;
      quantity: number;
      minStockLevel: number;
      lastUpdated: number;
    };
    indexes: { 'by-location': 'locationId'; 'by-product': 'productId' };
  };
  products: {
    key: string;
    value: {
      id: string;
      name: string;
      price: number;
      barcode?: string;
      sku?: string;
      category?: string;
      imageUrl?: string;
      isActive: boolean;
      lastUpdated: number;
    };
    indexes: { 'by-barcode': 'barcode'; 'by-sku': 'sku' };
  };
  customers: {
    key: string;
    value: {
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      loyaltyPoints: number;
      totalSpent: number;
      lastUpdated: number;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: any;
      lastUpdated: number;
    };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<POSDatabase> | null = null;
  private dbName = 'hardypos-offline';
  private version = 1;

  async init() {
    if (typeof window === 'undefined') return;
    
    try {
      this.db = await openDB<POSDatabase>(this.dbName, this.version, {
        upgrade(db) {
          // Transactions store
          const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionStore.createIndex('by-status', 'status');
          transactionStore.createIndex('by-timestamp', 'timestamp');

          // Inventory store
          const inventoryStore = db.createObjectStore('inventory', { keyPath: ['locationId', 'productId'] });
          inventoryStore.createIndex('by-location', 'locationId');
          inventoryStore.createIndex('by-product', 'productId');

          // Products store
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('by-barcode', 'barcode');
          productsStore.createIndex('by-sku', 'sku');

          // Customers store
          db.createObjectStore('customers', { keyPath: 'id' });

          // Settings store
          db.createObjectStore('settings', { keyPath: 'key' });
        },
      });
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  // Transaction methods
  async saveOfflineTransaction(transaction: any) {
    if (!this.db) await this.init();
    if (!this.db) return;

    const offlineTransaction = {
      ...transaction,
      localId: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending' as const,
      timestamp: Date.now(),
      syncAttempts: 0
    };

    await this.db.add('transactions', offlineTransaction);
    return offlineTransaction;
  }

  async getPendingTransactions() {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return await this.db.getAllFromIndex('transactions', 'by-status', IDBKeyRange.only('pending'));
  }

  async markTransactionSynced(id: string) {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = await this.db.get('transactions', id);
    if (transaction) {
      transaction.status = 'synced';
      await this.db.put('transactions', transaction);
    }
  }

  async markTransactionFailed(id: string) {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = await this.db.get('transactions', id);
    if (transaction) {
      transaction.status = 'failed';
      transaction.syncAttempts += 1;
      await this.db.put('transactions', transaction);
    }
  }

  // Inventory methods
  async cacheInventory(locationId: string, inventory: any[]) {
    if (!this.db) await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('inventory', 'readwrite');
    
    for (const item of inventory) {
      await tx.store.put({
        locationId,
        productId: item.productId,
        quantity: item.quantity,
        minStockLevel: item.minStockLevel,
        lastUpdated: Date.now()
      });
    }
    
    await tx.done;
  }

  async getInventoryByLocation(locationId: string) {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return await this.db.getAllFromIndex('inventory', 'by-location', IDBKeyRange.only(locationId));
  }

  async updateInventoryItem(locationId: string, productId: string, quantity: number) {
    if (!this.db) await this.init();
    if (!this.db) return;

    const key = [locationId, productId];
    const item = await this.db.get('inventory', key as any);
    
    if (item) {
      item.quantity = quantity;
      item.lastUpdated = Date.now();
      await this.db.put('inventory', item);
    }
  }

  // Product methods
  async cacheProducts(products: any[]) {
    if (!this.db) await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('products', 'readwrite');
    
    for (const product of products) {
      await tx.store.put({
        ...product,
        lastUpdated: Date.now()
      });
    }
    
    await tx.done;
  }

  async getProducts() {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return await this.db.getAll('products');
  }

  async getProductByBarcode(barcode: string) {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return await this.db.getFromIndex('products', 'by-barcode', IDBKeyRange.only(barcode));
  }

  async getProductBySku(sku: string) {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return await this.db.getFromIndex('products', 'by-sku', IDBKeyRange.only(sku));
  }

  // Customer methods
  async cacheCustomers(customers: any[]) {
    if (!this.db) await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('customers', 'readwrite');
    
    for (const customer of customers) {
      await tx.store.put({
        ...customer,
        lastUpdated: Date.now()
      });
    }
    
    await tx.done;
  }

  async getCustomers() {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return await this.db.getAll('customers');
  }

  async getCustomer(id: string) {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return await this.db.get('customers', id);
  }

  // Settings methods
  async setSetting(key: string, value: any) {
    if (!this.db) await this.init();
    if (!this.db) return;

    await this.db.put('settings', {
      key,
      value,
      lastUpdated: Date.now()
    });
  }

  async getSetting(key: string) {
    if (!this.db) await this.init();
    if (!this.db) return null;

    const setting = await this.db.get('settings', key);
    return setting?.value || null;
  }

  // Utility methods
  async clearAll() {
    if (!this.db) await this.init();
    if (!this.db) return;

    const tx = this.db.transaction(['transactions', 'inventory', 'products', 'customers', 'settings'], 'readwrite');
    
    await tx.objectStore('transactions').clear();
    await tx.objectStore('inventory').clear();
    await tx.objectStore('products').clear();
    await tx.objectStore('customers').clear();
    await tx.objectStore('settings').clear();
    
    await tx.done;
  }

  async getStorageStats() {
    if (!this.db) await this.init();
    if (!this.db) return {};

    return {
      transactions: await this.db.count('transactions'),
      inventory: await this.db.count('inventory'),
      products: await this.db.count('products'),
      customers: await this.db.count('customers'),
      settings: await this.db.count('settings')
    };
  }
}

export const offlineStorage = new OfflineStorage();