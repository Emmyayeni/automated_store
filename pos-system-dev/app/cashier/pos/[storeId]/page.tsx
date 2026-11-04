"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import ProductSearch from "@/components/pos/product-search";
import Cart from "@/components/pos/cart";
import type { Product, CartItem } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import SplitPaymentModal from "@/components/payments/split-payment-modal";
import BarcodeScanner from "@/components/hardware/barcode-scanner";
import QuickProductRegistration from "@/components/products/quick-product-registration";
import { usePermissions } from "@/hooks/use-permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  businessId?: string;
};

const defaultLogo = "/placeholder.svg";

export default function StorePOSPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const { data: session } = useSession();
  const { canRegisterProducts } = usePermissions();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [taxRate, setTaxRate] = useState<number>();
  const [storeName, setStoreName] = useState<string>("");
  const [businessLogo, setBusinessLogo] = useState<string>(defaultLogo);
  const [showQuickRegistration, setShowQuickRegistration] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [isValidStore, setIsValidStore] = useState<boolean>(false);

  // Check if user has access to this store
  const userLocationId = session?.user?.locationId;

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id ?? "",
        email: session.user.email ?? "",
        firstName: session.user.firstName ?? "",
        lastName: session.user.lastName ?? "",
        role: session.user.role ?? "",
        businessId: session.user.businessId ?? "",
      });
    }
  }, [session]);

  // Validate store access and fetch store details
  useEffect(() => {
    if (!storeId || !userLocationId) return;

    // Check if user has access to this store
    if (userLocationId !== storeId) {
      setStoreError("You don't have access to this store's POS system.");
      setIsValidStore(false);
      return;
    }

    // Fetch store details
    fetch(`/api/store/${storeId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Store not found");
        }
        return response.json();
      })
      .then((data) => {
        if (data.success && data.data) {
          setStoreName(data.data.name || "Store");
          setBusinessLogo(data.data.logoUrl || defaultLogo);
          if (data.data.taxRate) {
            setTaxRate(parseFloat(data.data.taxRate));
          }
          setIsValidStore(true);
          setStoreError(null);
        } else {
          throw new Error("Invalid store data");
        }
      })
      .catch((error) => {
        console.error("Store fetch error:", error);
        setStoreError("Failed to load store information.");
        setIsValidStore(false);
        setStoreName("Unknown Store");
        setBusinessLogo(defaultLogo);
      });
  }, [storeId, userLocationId]);

  const handleProductSelect = (product: Product) => {
    const existingItem = cartItems.find(
      (item) => item.product.id === product.id && !item.uomId // Default UOM (no specific UOM)
    );

    if (existingItem) {
      setCartItems((items) =>
        items.map((item) =>
          item.product.id === product.id && !item.uomId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCartItems((items) => [...items, { 
        product, 
        quantity: 1,
        uomId: undefined, // Default to base unit
        uomCode: undefined,
        uomName: undefined,
        uomAbbreviation: undefined,
        conversionFactor: 1,
        pricePerUnit: product.price
      }]);
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number, uomId?: string) => {
    if (quantity === 0) {
      handleRemoveItem(productId, uomId);
      return;
    }

    setCartItems((items) =>
      items.map((item) =>
        item.product.id === productId && item.uomId === uomId
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string, uomId?: string) => {
    setCartItems((items) =>
      items.filter((item) => 
        !(item.product.id === productId && item.uomId === uomId)
      )
    );
  };

  const handleCheckout = async (
    paymentMethod: string,
    splitPayments?: any[],
    tipAmount?: number
  ) => {
    try {
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const taxAmount = subtotal * (taxRate ?? 0);
      const totalAmount = subtotal + taxAmount + (tipAmount || 0);

      const transactionData = {
        customerId: null,
        userId: user?.id,
        locationId: storeId,
        items: cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        paymentMethod,
        splitPayments,
        subtotal,
        taxAmount,
        totalAmount,
        tipAmount,
      };

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        const transaction = await response.json();
        toast({
          title: "Sale Completed",
          description: `Transaction ${transaction.transactionNumber} completed successfully.`,
        });
        setCartItems([]);
        return transaction;
      } else {
        throw new Error("Failed to complete transaction");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete the sale. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleHoldTransaction = async (reason: string) => {
    try {
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const taxAmount = subtotal * (taxRate ?? 0);
      const totalAmount = subtotal + taxAmount;

      const response = await fetch("/api/held-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          locationId: storeId,
          customerId: null,
          items: cartItems,
          subtotal,
          taxAmount,
          totalAmount,
          holdReason: reason,
        }),
      });

      if (response.ok) {
        toast({
          title: "Transaction Held",
          description: "Transaction has been held successfully.",
        });
        setCartItems([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to hold transaction.",
        variant: "destructive",
      });
    }
  };

  const handleProductScanned = (product: Product) => {
    setScannedProduct(product);
    handleProductSelect(product);
    toast({
      title: "Product Added",
      description: `${product.name} added to cart.`,
    });
  };

  const handleProductNotFound = (barcode: string) => {
    if (canRegisterProducts()) {
      setShowQuickRegistration(true);
      toast({
        title: "Product Not Found",
        description: `Barcode ${barcode} not found. Register as new product?`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Product Not Found",
        description: `Barcode ${barcode} not found in inventory. Contact your manager to add this product.`,
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-lg font-semibold text-gray-500">Loading...</div>
      </div>
    );
  }

  if (storeError || !isValidStore) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/cashier">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cashier
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">POS System</h1>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {storeError || "Unable to access POS system for this store."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* POS Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50 w-full">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-2 w-full">
            <div className="flex items-center gap-4">
              <Link href="/cashier">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Cashier
                </Button>
              </Link>
              
              <div className="flex items-center">
                <Image
                  src={businessLogo}
                  alt="logo"
                  width={48}
                  height={48}
                  className="inline-block p-0 m-0 rounded-full border border-gray-200 shadow"
                  priority
                />
                <span className="ml-3 text-2xl font-bold text-black">
                  {storeName} - POS
                </span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Store ID: {storeId}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)] px-2 md:px-8 pt-6">
        <div className="lg:col-span-2 flex flex-col mb-6 lg:mb-0">
          {showQuickRegistration && canRegisterProducts() && (
            <div className="mb-4">
              <QuickProductRegistration
                locationId={storeId}
                onProductRegistered={(product) => {
                  setShowQuickRegistration(false);
                  handleProductSelect(product);
                  toast({
                    title: "Product Registered & Added",
                    description: `${product.name} has been registered and added to cart.`,
                  });
                }}
              />
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow p-4 md:p-6 flex-1 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-primary">
              Product Search
            </h2>
            
            <BarcodeScanner
              onProductScanned={handleProductScanned}
              locationId={storeId}
              enableRegistration={canRegisterProducts()}
              onProductNotFound={handleProductNotFound}
            />
            
            {scannedProduct && (
              <div className="my-4 flex items-center gap-4 border rounded p-4 bg-gray-50">
                <Image
                  src={scannedProduct.imageUrl || "/placeholder.svg"}
                  alt={scannedProduct.name}
                  width={64}
                  height={64}
                  className="rounded"
                />
                <div>
                  <div className="font-semibold">{scannedProduct.name}</div>
                  <div className="text-sm text-gray-500">
                    {scannedProduct.category ? String(scannedProduct.category) : "N/A"}
                  </div>
                  <div className="text-lg font-bold text-blue-700">
                    ${scannedProduct.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Stock: {typeof scannedProduct.stock === "number" ? scannedProduct.stock : "N/A"}
                  </div>
                </div>
              </div>
            )}
            
            <ProductSearch
              onProductSelect={handleProductSelect}
              locationId={storeId}
            />
          </div>
        </div>
        
        <div className="lg:col-span-1 flex flex-col">
          <Cart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            onHoldTransaction={handleHoldTransaction}
            userId={user.id}
            taxRate={taxRate}
          />
        </div>
      </div>

      <SplitPaymentModal
        isOpen={showSplitPayment}
        onClose={() => setShowSplitPayment(false)}
        totalAmount={cartItems.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        )}
        onProcessPayment={(payments, tipAmount) => {
          handleCheckout("split", payments, tipAmount);
          setShowSplitPayment(false);
        }}
      />
    </div>
  );
}