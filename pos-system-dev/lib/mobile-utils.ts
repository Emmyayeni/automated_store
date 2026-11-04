'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Enhanced mobile utilities
export class MobileUtils {
  // Haptic feedback patterns
  static hapticPatterns = {
    light: [50],
    medium: [100],
    heavy: [200],
    success: [50, 50, 100],
    error: [100, 50, 100, 50, 100],
    notification: [50, 100, 50],
    button: [25],
    longPress: [50, 100],
  };

  // Enhanced haptic feedback
  static haptic(pattern: keyof typeof MobileUtils.hapticPatterns) {
    if ('vibrate' in navigator) {
      navigator.vibrate(MobileUtils.hapticPatterns[pattern]);
    }
  }

  // Device orientation detection
  static getOrientation(): 'portrait' | 'landscape' {
    if (screen.orientation) {
      return screen.orientation.angle === 0 || screen.orientation.angle === 180 
        ? 'portrait' 
        : 'landscape';
    }
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  // Battery status
  static async getBatteryInfo(): Promise<{
    level: number;
    charging: boolean;
    chargingTime?: number;
    dischargingTime?: number;
  } | null> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        };
      } catch (error) {
        console.error('Battery API not available:', error);
      }
    }
    return null;
  }

  // Device memory info
  static getMemoryInfo(): {
    deviceMemory?: number;
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
  } {
    const info: any = {};
    
    if ('deviceMemory' in navigator) {
      info.deviceMemory = (navigator as any).deviceMemory;
    }
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      info.usedJSHeapSize = memory.usedJSHeapSize;
      info.totalJSHeapSize = memory.totalJSHeapSize;
    }
    
    return info;
  }

  // Connection info
  static getConnectionInfo(): {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return {};
  }

  // Wake lock to prevent screen dimming during POS operations
  static async requestWakeLock(): Promise<WakeLockSentinel | null> {
    if ('wakeLock' in navigator) {
      try {
        return await (navigator as any).wakeLock.request('screen');
      } catch (error) {
        console.error('Wake lock failed:', error);
      }
    }
    return null;
  }

  // Full screen mode
  static async requestFullscreen(element?: Element): Promise<boolean> {
    const target = element || document.documentElement;
    
    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
        return true;
      } else if ((target as any).webkitRequestFullscreen) {
        await (target as any).webkitRequestFullscreen();
        return true;
      } else if ((target as any).msRequestFullscreen) {
        await (target as any).msRequestFullscreen();
        return true;
      }
    } catch (error) {
      console.error('Fullscreen request failed:', error);
    }
    
    return false;
  }

  static exitFullscreen(): boolean {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        return true;
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
        return true;
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
        return true;
      }
    } catch (error) {
      console.error('Exit fullscreen failed:', error);
    }
    
    return false;
  }

  // Geolocation for store location verification
  static async getCurrentPosition(): Promise<GeolocationPosition | null> {
    if (!navigator.geolocation) {
      return null;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }
}

// Push notifications service
export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('Service worker not registered');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        // Remove subscription from server
        await this.removeSubscriptionFromServer(subscription);
      }
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  // Show local notification
  showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.registration) {
      // Fallback to basic notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, options);
      }
      return Promise.resolve();
    }

    return this.registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    } as NotificationOptions & { vibrate?: number[] });
  }
}

// React hooks for mobile features
export function useMobileFeatures() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [battery, setBattery] = useState<any>(null);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Update orientation
    const updateOrientation = () => {
      setOrientation(MobileUtils.getOrientation());
    };

    // Update battery info
    const updateBattery = async () => {
      const batteryInfo = await MobileUtils.getBatteryInfo();
      setBattery(batteryInfo);
    };

    // Update fullscreen status
    const updateFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    // Event listeners
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);
    document.addEventListener('fullscreenchange', updateFullscreen);

    // Initial updates
    updateOrientation();
    updateBattery();
    updateFullscreen();

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      window.removeEventListener('resize', updateOrientation);
      document.removeEventListener('fullscreenchange', updateFullscreen);
      
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [wakeLock]);

  const requestWakeLock = async () => {
    const lock = await MobileUtils.requestWakeLock();
    setWakeLock(lock);
    return lock;
  };

  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release();
      setWakeLock(null);
    }
  };

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      MobileUtils.exitFullscreen();
    } else {
      await MobileUtils.requestFullscreen();
    }
  };

  return {
    orientation,
    battery,
    wakeLock,
    isFullscreen,
    requestWakeLock,
    releaseWakeLock,
    toggleFullscreen,
    haptic: MobileUtils.haptic,
    getConnectionInfo: MobileUtils.getConnectionInfo,
    getCurrentPosition: MobileUtils.getCurrentPosition,
  };
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const pushService = PushNotificationService.getInstance();

  useEffect(() => {
    // Initialize push notifications
    const initialize = async () => {
      const initialized = await pushService.initialize();
      if (initialized) {
        setPermission(Notification.permission);
        
        // Check if already subscribed
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);
        }
      }
    };

    initialize();
  }, []);

  const requestPermission = async () => {
    const perm = await pushService.requestPermission();
    setPermission(perm);
    return perm;
  };

  const subscribe = async (vapidKey: string) => {
    if (permission !== 'granted') {
      const perm = await requestPermission();
      if (perm !== 'granted') {
        toast.error('Notifications permission denied');
        return false;
      }
    }

    const sub = await pushService.subscribe(vapidKey);
    if (sub) {
      setSubscription(sub);
      setIsSubscribed(true);
      toast.success('Push notifications enabled');
      return true;
    } else {
      toast.error('Failed to enable push notifications');
      return false;
    }
  };

  const unsubscribe = async () => {
    const success = await pushService.unsubscribe();
    if (success) {
      setSubscription(null);
      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } else {
      toast.error('Failed to disable push notifications');
    }
    return success;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    MobileUtils.haptic('notification');
    return pushService.showNotification(title, options);
  };

  return {
    permission,
    isSubscribed,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  };
}