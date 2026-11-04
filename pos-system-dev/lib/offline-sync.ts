'use client';

import { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/lib/pwa-utils';
import { offlineStorage } from '@/lib/offline-storage';
import { toast } from 'sonner';

class OfflineSyncService {
  private isRunning = false;
  private syncInterval: NodeJS.Timeout | null = null;

  async startAutoSync() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting offline sync service...');
    
    // Initial sync
    await this.syncNow();
    
    // Schedule periodic sync every 30 seconds when online
    this.syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        await this.syncNow();
      }
    }, 30000);
  }

  stopAutoSync() {
    this.isRunning = false;
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('Stopped offline sync service');
  }

  async syncNow() {
    if (!navigator.onLine) {
      console.log('Offline - skipping sync');
      return;
    }

    try {
      await this.syncTransactions();
      await this.syncInventory();
      await this.syncProducts();
      await this.syncCustomers();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private async syncTransactions() {
    const pendingTransactions = await offlineStorage.getPendingTransactions();
    
    if (pendingTransactions.length === 0) return;

    console.log(`Syncing ${pendingTransactions.length} pending transactions...`);
    let synced = 0;
    let failed = 0;

    for (const transaction of pendingTransactions) {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...transaction,
            id: undefined, // Let server generate new ID
            localId: transaction.id, // Keep reference to local ID
          }),
        });

        if (response.ok) {
          await offlineStorage.markTransactionSynced(transaction.id);
          synced++;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error(`Failed to sync transaction ${transaction.id}:`, error);
        await offlineStorage.markTransactionFailed(transaction.id);
        failed++;
      }
    }

    if (synced > 0) {
      toast.success(`Synced ${synced} offline transaction(s)`);
    }
    if (failed > 0) {
      toast.error(`Failed to sync ${failed} transaction(s)`);
    }
  }

  private async syncInventory() {
    try {
      const response = await fetch('/api/inventory');
      if (response.ok) {
        const inventory = await response.json();
        // Assuming we have a current location ID
        const locationId = 'current-location-id'; // This should come from session/context
        await offlineStorage.cacheInventory(locationId, inventory);
      }
    } catch (error) {
      console.error('Failed to sync inventory:', error);
    }
  }

  private async syncProducts() {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const products = await response.json();
        await offlineStorage.cacheProducts(products);
      }
    } catch (error) {
      console.error('Failed to sync products:', error);
    }
  }

  private async syncCustomers() {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const customers = await response.json();
        await offlineStorage.cacheCustomers(customers);
      }
    } catch (error) {
      console.error('Failed to sync customers:', error);
    }
  }
}

export const offlineSyncService = new OfflineSyncService();

// React hook for sync status
export function useOfflineSync() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    // Start sync service when component mounts
    const startSync = async () => {
      await offlineSyncService.startAutoSync();
      setIsRunning(true);
    };

    startSync();

    // Stop sync service when component unmounts
    return () => {
      offlineSyncService.stopAutoSync();
      setIsRunning(false);
    };
  }, []);

  useEffect(() => {
    // Update pending count when online status changes
    const updatePendingCount = async () => {
      const pending = await offlineStorage.getPendingTransactions();
      setPendingCount(pending.length);
    };

    updatePendingCount();
    
    // Sync when coming back online
    if (isOnline && isRunning) {
      offlineSyncService.syncNow().then(() => {
        setLastSync(new Date());
        updatePendingCount();
      });
    }
  }, [isOnline, isRunning]);

  const manualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    try {
      await offlineSyncService.syncNow();
      setLastSync(new Date());
      const pending = await offlineStorage.getPendingTransactions();
      setPendingCount(pending.length);
      toast.success('Manual sync completed');
    } catch (error) {
      toast.error('Manual sync failed');
    }
  };

  return {
    isRunning,
    lastSync,
    pendingCount,
    isOnline,
    manualSync,
  };
}