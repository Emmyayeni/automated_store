'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TouchButton } from '@/components/ui/touch-button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote,
  QrCode,
  User,
  Package,
  Receipt,
  Camera
} from 'lucide-react';
import { useNetworkStatus, hapticFeedback } from '@/lib/pwa-utils';
import { BarcodeScanner, useBarcodeScanner } from '@/components/ui/barcode-scanner';
import { useMobileFeatures } from '@/lib/mobile-utils';
import { offlineStorage } from '@/lib/offline-storage';
import { toast } from 'sonner';
import type { CartItem } from '@/lib/types';
import { formatPrice } from '@/lib/standards/formatting';

interface MobilePOSProps {
  className?: string;
}

export default function MobilePOS({ className }: MobilePOSProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const { isOnline } = useNetworkStatus();
  const { haptic } = useMobileFeatures();
  const { 
    isOpen: isScannerOpen, 
    lastScanned,
    openScanner, 
    closeScanner, 
    handleScan 
  } = useBarcodeScanner();

  useEffect(() => {
    // Initialize offline storage and load cached products
    const initializeData = async () => {
      await offlineStorage.init();
      const cachedProducts = await offlineStorage.getProducts();
      setProducts(cachedProducts);
    };

    initializeData();
  }, []);

  // Handle barcode scan result
  useEffect(() => {
    if (lastScanned) {
      const product = products.find(p => 
        p.barcode === lastScanned || 
        p.sku === lastScanned ||
        p.id === lastScanned
      );
      
      if (product) {
        addToCart(product);
        haptic('success');
        toast.success(`Added ${product.name} to cart`);
      } else {
        haptic('error');
        toast.error(`Product not found: ${lastScanned}`);
      }
    }
  }, [lastScanned, products]);

  const addToCart = (product: any) => {
    hapticFeedback('light');
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, change: number) => {
    hapticFeedback('light');
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === id) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (id: string) => {
    hapticFeedback('medium');
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  };

  const processPayment = async (paymentMethod: 'cash' | 'card') => {
    hapticFeedback('medium');
    
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const totals = calculateTotal();
    const transaction = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      businessId: 'current-business-id',
      locationId: 'current-location-id',
      cashierId: 'current-cashier-id',
      customerId: customer?.id,
      items: cart,
      subtotal: totals.subtotal,
      taxAmount: totals.tax,
      total: totals.total,
      paymentMethod,
      timestamp: Date.now()
    };

    try {
      if (isOnline) {
        // Process online
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction)
        });

        if (response.ok) {
          toast.success('Transaction completed successfully!');
          setCart([]);
        } else {
          throw new Error('Online transaction failed');
        }
      } else {
        // Store offline
        await offlineStorage.saveOfflineTransaction(transaction);
        toast.success('Transaction saved offline and will sync when connected');
        setCart([]);
      }
    } catch (error) {
      // Fallback to offline storage
      await offlineStorage.saveOfflineTransaction(transaction);
      toast.warning('Transaction saved offline due to connection issues');
      setCart([]);
    }
  };

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className={`flex flex-col h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-semibold">POS Terminal</h1>
        </div>
        <div className="flex items-center gap-2">
          <TouchButton
            variant="secondary"
            size="sm"
            onClick={openScanner}
            className="h-9 w-9 p-0"
          >
            <Camera className="h-4 w-4" />
          </TouchButton>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Products Grid */}
        <div className="flex-1 p-4">
          <div className="mb-4 flex gap-2">
            <TouchButton 
              variant="primary" 
              size="sm" 
              className="flex-1"
              onClick={() => hapticFeedback('light')}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan
            </TouchButton>
            <TouchButton 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              onClick={() => hapticFeedback('light')}
            >
              <Package className="h-4 w-4 mr-2" />
              Search
            </TouchButton>
            <TouchButton 
              variant="default" 
              size="sm"
              onClick={() => hapticFeedback('light')}
            >
              <User className="h-4 w-4" />
            </TouchButton>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => (
                <Card 
                  key={product.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow active:scale-95"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-lg font-bold text-blue-600">{formatPrice(product.price)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Sidebar */}
        <div className="w-full lg:w-80 bg-white border-l flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              Cart ({cart.length})
              {cart.length > 0 && (
                <TouchButton
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    hapticFeedback('heavy');
                    setCart([]);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </TouchButton>
              )}
            </CardTitle>
          </CardHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.product.name}</h4>
                    <p className="text-xs text-gray-500">{formatPrice(item.product.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TouchButton
                      variant="default"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </TouchButton>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <TouchButton
                      variant="default"
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </TouchButton>
                  </div>
                  <TouchButton
                    variant="danger"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </TouchButton>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Totals and Payment */}
          <div className="p-4 border-t">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <TouchButton
                variant="success"
                size="lg"
                className="flex-1"
                disabled={cart.length === 0}
                onClick={() => processPayment('cash')}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Cash
              </TouchButton>
              <TouchButton
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={cart.length === 0}
                onClick={() => processPayment('card')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Card
              </TouchButton>
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onScan={handleScan}
        onClose={closeScanner}
      />
    </div>
  );
}