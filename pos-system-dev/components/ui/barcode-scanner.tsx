'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X, Flashlight, FlashlightOff } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported on this device');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Check for flash capability
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      setHasFlash(!!(capabilities as any).torch);

      setIsScanning(true);
      startScanning();
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setIsScanning(false);
    setFlashOn(false);
  };

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return;

    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as any],
      } as any);
      setFlashOn(!flashOn);
    } catch (error) {
      console.error('Error toggling flash:', error);
      toast.error('Failed to toggle flash');
    }
  };

  const startScanning = () => {
    if (!canvasRef.current || !videoRef.current) return;

    scanIntervalRef.current = setInterval(() => {
      scanForBarcode();
    }, 500); // Scan every 500ms
  };

  const scanForBarcode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Simple barcode detection (in production, use a proper library like QuaggaJS or ZXing)
    // This is a placeholder - you would integrate with a barcode scanning library
    simulateBarcodeDetection();
  };

  const simulateBarcodeDetection = () => {
    // Simulate barcode detection for demo purposes
    // In production, replace with actual barcode detection library
    const randomBarcodes = [
      '123456789012',
      '987654321098',
      '456789123456',
      '789123456789',
    ];

    // Randomly "detect" a barcode every ~10 scans for demo
    if (Math.random() < 0.1) {
      const randomBarcode = randomBarcodes[Math.floor(Math.random() * randomBarcodes.length)];
      handleBarcodeDetected(randomBarcode);
    }
  };

  const handleBarcodeDetected = (barcode: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(200); // Haptic feedback
    }
    
    onScan(barcode);
    stopCamera();
    onClose();
    
    toast.success(`Barcode scanned: ${barcode}`);
  };

  const manualInput = () => {
    const barcode = prompt('Enter barcode manually:');
    if (barcode) {
      handleBarcodeDetected(barcode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full w-full">
        {/* Video feed */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
        />
        
        {/* Hidden canvas for barcode processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Scanning frame */}
            <div className="h-48 w-64 border-2 border-white rounded-lg relative">
              <div className="absolute top-0 left-0 h-6 w-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 h-6 w-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
              
              {/* Scanning line animation */}
              {isScanning && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="h-0.5 w-full bg-green-500 animate-pulse absolute top-1/2 transform -translate-y-1/2" />
                </div>
              )}
            </div>
            
            <p className="text-white text-center mt-4 text-sm">
              Position barcode within the frame
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
          
          {hasFlash && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFlash}
              className="text-white hover:bg-white/20"
            >
              {flashOn ? (
                <FlashlightOff className="h-6 w-6" />
              ) : (
                <Flashlight className="h-6 w-6" />
              )}
            </Button>
          )}
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-8 left-4 right-4">
          <Card className="bg-black/50 border-white/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-white">
                <div>
                  <p className="text-sm font-medium">
                    {isScanning ? 'Scanning...' : 'Camera starting...'}
                  </p>
                  <p className="text-xs text-white/70">
                    Align barcode within the frame
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={manualInput}
                  className="border-white/20 text-white hover:bg-white/20"
                >
                  Manual Input
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Hook for barcode scanning
export function useBarcodeScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const openScanner = () => {
    if (!navigator.mediaDevices) {
      toast.error('Camera not supported on this device');
      return;
    }
    setIsOpen(true);
  };

  const closeScanner = () => {
    setIsOpen(false);
  };

  const handleScan = (barcode: string) => {
    setLastScanned(barcode);
    setIsOpen(false);
  };

  return {
    isOpen,
    lastScanned,
    openScanner,
    closeScanner,
    handleScan,
  };
}