// PWA utility functions for offline functionality
export const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

export const isPWA = () => {
  return typeof window !== 'undefined' && 
         (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true);
};

export const isInstallable = () => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
};

// Install PWA prompt
let deferredPrompt: any = null;

export const initInstallPrompt = () => {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
};

export const showInstallPrompt = async () => {
  if (!deferredPrompt) return false;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  return outcome === 'accepted';
};

// Haptic feedback for mobile devices
export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window === 'undefined' || !(window as any).navigator?.vibrate) return;
  
  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30]
  };
  
  (window as any).navigator.vibrate(patterns[type]);
};

// Network status monitoring
export const useNetworkStatus = () => {
  if (typeof window === 'undefined') return { isOnline: true };
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline };
};

// Service Worker registration
export const registerSW = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('SW registered: ', registration);
    return registration;
  } catch (error) {
    console.log('SW registration failed: ', error);
    return null;
  }
};

// Background sync for offline transactions
export const scheduleBackgroundSync = (tag: string, data?: any) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  
  navigator.serviceWorker.ready.then((registration) => {
    if ('sync' in registration) {
      return (registration as any).sync.register(tag);
    }
  });
};

// Push notifications
export const subscribeToPush = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  
  const registration = await navigator.serviceWorker.ready;
  if (!('pushManager' in registration)) return;
  
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    });
    
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
};

import { useState, useEffect } from 'react';

// PWA Install Hook
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }

    return outcome === 'accepted';
  };

  return {
    isInstallable,
    isInstalled,
    install,
  };
}