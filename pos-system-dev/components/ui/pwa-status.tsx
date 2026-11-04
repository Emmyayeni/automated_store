'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Wifi, WifiOff, Download, Share2 } from 'lucide-react';
import { initInstallPrompt, showInstallPrompt, isPWA, useNetworkStatus, hapticFeedback } from '@/lib/pwa-utils';
import { toast } from 'sonner';

export default function PWAStatus() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPwaMode, setIsPwaMode] = useState(false);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    setIsPwaMode(isPWA());
    initInstallPrompt();

    const handleBeforeInstallPrompt = () => {
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      setIsInstallable(false);
      setIsPwaMode(true);
      toast.success('OmniStock installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    hapticFeedback('medium');
    const accepted = await showInstallPrompt();
    if (accepted) {
      toast.success('Installation started...');
    }
  };

  const handleShare = async () => {
    hapticFeedback('light');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OmniStock',
          text: 'Complete point of sale system for your business',
          url: window.location.origin,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.origin);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isPwaMode) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-800">PWA Mode Active</span>
                <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
                  {isOnline ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Offline
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-green-600 mt-1">
                {isOnline ? 'All features available' : 'Limited offline functionality'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isInstallable) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Install OmniStock</p>
              <p className="text-xs text-blue-600 mt-1">
                Add to home screen for better experience
              </p>
            </div>
            <Button size="sm" onClick={handleInstall} className="bg-blue-600 hover:bg-blue-700">
              Install
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}