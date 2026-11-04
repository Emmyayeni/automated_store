'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow,
  Camera,
  Bell,
  Download,
  RotateCcw as Sync,
  Database,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useNetworkStatus, usePWAInstall, hapticFeedback } from '@/lib/pwa-utils';
import { useMobileFeatures, usePushNotifications } from '@/lib/mobile-utils';
import { useOfflineSync } from '@/lib/offline-sync';
import { offlineStorage } from '@/lib/offline-storage';
import { formatTime } from '@/lib/standards/formatting';
import { toast } from 'sonner';

export function PWAStatusDashboard() {
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0 });
  const { isOnline } = useNetworkStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const { 
    orientation, 
    battery, 
    isFullscreen, 
    toggleFullscreen,
    getConnectionInfo 
  } = useMobileFeatures();
  const {
    permission: notificationPermission,
    isSubscribed: isPushSubscribed,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    showNotification
  } = usePushNotifications();
  const {
    isRunning: isSyncRunning,
    lastSync,
    pendingCount,
    manualSync
  } = useOfflineSync();

  useEffect(() => {
    // Get storage usage
    const updateStorageUsage = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          setStorageUsage({
            used: estimate.usage || 0,
            quota: estimate.quota || 0
          });
        } catch (error) {
          console.error('Storage estimate failed:', error);
        }
      }
    };

    updateStorageUsage();
    const interval = setInterval(updateStorageUsage, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const testNotification = () => {
    showNotification('Test Notification', {
      body: 'PWA notifications are working!',
      tag: 'test',
      requireInteraction: false,
    });
  };

  const connectionInfo = getConnectionInfo();

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">PWA Status Dashboard</h1>
        <p className="text-muted-foreground">Monitor your Progressive Web App features</p>
      </div>

      {/* Installation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Installation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Installation Status</span>
            <Badge variant={isInstalled ? "default" : "secondary"}>
              {isInstalled ? 'Installed' : 'Browser'}
            </Badge>
          </div>
          {isInstallable && !isInstalled && (
            <Button onClick={install} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Orientation:</span>
              <div className="font-medium capitalize">{orientation}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Display:</span>
              <div className="font-medium">{isFullscreen ? 'Fullscreen' : 'Normal'}</div>
            </div>
          </div>
          <Button variant="outline" onClick={toggleFullscreen} className="w-full">
            {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          </Button>
        </CardContent>
      </Card>

      {/* Connectivity Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            Network Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Connection</span>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          {connectionInfo.effectiveType && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <div className="font-medium">{connectionInfo.effectiveType}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Speed:</span>
                <div className="font-medium">{connectionInfo.downlink}mb/s</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Battery Status */}
      {battery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {battery.level < 0.2 ? <BatteryLow className="h-5 w-5" /> : <Battery className="h-5 w-5" />}
              Battery Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Level</span>
              <Badge variant={battery.level < 0.2 ? "destructive" : "default"}>
                {Math.round(battery.level * 100)}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  battery.level < 0.2 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${battery.level * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Charging</span>
              <span className="font-medium">{battery.charging ? 'Yes' : 'No'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Storage Used</span>
            <Badge variant="outline">
              {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.quota)}
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 bg-blue-500 rounded-full transition-all"
              style={{ 
                width: `${storageUsage.quota > 0 ? (storageUsage.used / storageUsage.quota) * 100 : 0}%` 
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span>Sync Status</span>
            <Badge variant={isSyncRunning ? "default" : "secondary"}>
              {isSyncRunning ? 'Running' : 'Stopped'}
            </Badge>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center justify-between">
              <span>Pending Transactions</span>
              <Badge variant="destructive">{pendingCount}</Badge>
            </div>
          )}
          {lastSync && (
            <div className="flex items-center justify-between text-sm">
              <span>Last Sync</span>
              <span className="font-medium">{formatTime(lastSync)}</span>
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={manualSync} 
            disabled={!isOnline}
            className="w-full"
          >
            <Sync className="h-4 w-4 mr-2" />
            Manual Sync
          </Button>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Permission</span>
            <Badge variant={
              notificationPermission === 'granted' ? 'default' : 
              notificationPermission === 'denied' ? 'destructive' : 'secondary'
            }>
              {notificationPermission}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Subscription</span>
            <Badge variant={isPushSubscribed ? "default" : "secondary"}>
              {isPushSubscribed ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {!isPushSubscribed ? (
              <Button 
                onClick={() => subscribePush('your-vapid-key-here')} 
                disabled={notificationPermission === 'denied'}
                className="col-span-2"
              >
                Enable Notifications
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={testNotification}>
                  Test
                </Button>
                <Button variant="destructive" onClick={unsubscribePush}>
                  Disable
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            PWA Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Service Worker</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>App Manifest</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Offline Storage</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Background Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-500" />
              <span>Camera Access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Touch Optimized</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}