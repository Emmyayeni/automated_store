"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShoppingCart, Search, Scan, Gift, CreditCard, Banknote, Smartphone, Plus, Minus, Trash2, Receipt, AlertCircle, Clock, ExternalLink
} from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  barcode: string;
  image: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type Shift = {
  id: string;
  userId: string;
  locationId: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number | null;
  closingCash: number | null;
  status: "open" | "closed";
  notes: string | null;
  userName: string;
  locationName: string;
};

export default function SalesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxRate, setTaxRate] = useState(0.08); // Default to 8% if not found
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);

  // Get locationId from session (adjust this path to match your session structure)
  const locationId = session?.user?.locationId;
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId && locationId) {
      checkCurrentShift();
    }
  }, [userId, locationId]);

  useEffect(() => {
    if (!locationId) return;
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?locationId=${locationId}`);
        const data = await res.json();
        // Ensure price is a number (API may return string)
        setProducts(
          data.map((p: any) => ({
            ...p,
            price: typeof p.price === "string" ? parseFloat(p.price) : p.price,
          }))
        );
      } catch (error) {
        setProducts([]);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [locationId]);

  // Fetch tax rate from store API
  useEffect(() => {
    if (!locationId) return;
    const fetchTax = async () => {
      try {
        const res = await fetch(`/api/store/${locationId}`);
        const data = await res.json();
        // Assume API returns { tax: 0.08 } or similar
        setTaxRate(typeof data.tax === "number" ? data.tax : 0.08);
      } catch (error) {
        setTaxRate(0.08);
      }
    };
    fetchTax();
  }, [locationId]);

  const checkCurrentShift = async () => {
    setShiftLoading(true);
    try {
      const response = await fetch(`/api/shifts?userId=${userId}&locationId=${locationId}&active=true`);
      const activeShifts = await response.json();
      setCurrentShift(activeShifts.length > 0 ? activeShifts[0] : null);
    } catch (error) {
      console.error("Error checking shift:", error);
    } finally {
      setShiftLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (!currentShift) {
      toast({
        title: "No Active Shift",
        description: "Please start your shift before making sales",
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + change;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery)
  );

  // --- Payment & Receipt Logic ---
  const handlePayment = async (paymentMethod: string) => {
    if (!userId || !locationId || !currentShift) {
      toast({
        title: "Error",
        description: "User, location, or active shift not found.",
        variant: "destructive",
      });
      return;
    }
    setProcessing(true);
    try {
      const items = cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
      }));
      const subtotal = getCartTotal();
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: null,
          userId,
          locationId,
          items,
          paymentMethod,
          taxRate,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to process payment");
      }
      const data = await res.json();
      setLastReceipt({
        transactionNumber: data.transactionNumber,
        items: cart,
        subtotal,
        taxAmount,
        totalAmount,
        paymentMethod,
        date: new Date().toLocaleString(),
        cashierName: session?.user?.name || "Cashier",
      });
      setShowReceipt(true);
      setCart([]);
      toast({
        title: "Payment Successful",
        description: `Transaction ${data.transactionNumber} completed.`,
      });
    } catch (error: any) {
      toast({
        title: "Transaction Error",
        description: error?.message || "Failed to process payment.",
        variant: "destructive",
      });
    }
    setProcessing(false);
  };

  const formatDuration = (start: string) => {
    const startTime = new Date(start);
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (shiftLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Sales</h2>
        <div className="flex items-center gap-4">
          {currentShift ? (
            <>
              <Badge variant="default" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Shift Active - {formatDuration(currentShift.openedAt)}
              </Badge>
              {locationId && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => router.push(`/cashier/pos/${locationId}`)}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Open POS System
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/cashier/shift')}
              >
                Manage Shift
              </Button>
            </>
          ) : (
            <Alert className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                No active shift
                <Button 
                  size="sm"
                  onClick={() => router.push('/cashier/shift')}
                >
                  Start Shift
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Search and Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Product Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products or scan barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={!currentShift}
                  />
                </div>
                <Button variant="outline" size="icon" disabled={!currentShift}>
                  <Scan className="h-4 w-4" />
                </Button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading products...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer hover:bg-muted/50 ${!currentShift ? 'opacity-50' : ''}`} 
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{product.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              ${typeof product.price === "number" ? product.price.toFixed(2) : "0.00"}
                            </p>
                            <Badge variant={product.stock < 10 ? "destructive" : "secondary"} className="text-xs">
                              Stock: {product.stock}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-2 text-center text-muted-foreground py-8">
                      No products found.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Shopping Cart */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Cart is empty</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${typeof item.price === "number" ? item.price.toFixed(2) : "0.00"} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              {cart.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${getCartTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({(taxRate * 100).toFixed(0)}%):</span>
                      <span>${(getCartTotal() * taxRate).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>${(getCartTotal() * (1 + taxRate)).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button variant="outline" size="sm" disabled={!currentShift}>
                      <Gift className="h-4 w-4 mr-1" />
                      Discount
                    </Button>
                    <Button variant="outline" size="sm" disabled={!currentShift}>
                      Hold Sale
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full" disabled={processing || !currentShift}>
                          <CreditCard className="h-4 w-4 mr-1" />
                          {processing ? "Processing..." : "Pay"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Process Payment</DialogTitle>
                          <DialogDescription>
                            Total: ${(getCartTotal() * (1 + taxRate)).toFixed(2)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-3">
                          <Button className="h-16 flex-col" onClick={() => handlePayment("cash")} disabled={processing}>
                            <Banknote className="h-6 w-6 mb-1" />
                            Cash
                          </Button>
                          <Button className="h-16 flex-col" onClick={() => handlePayment("card")} disabled={processing}>
                            <CreditCard className="h-6 w-6 mb-1" />
                            Card
                          </Button>
                          <Button className="h-16 flex-col" onClick={() => handlePayment("transfer")} disabled={processing}>
                            <Smartphone className="h-6 w-6 mb-1" />
                            Transfer
                          </Button>
                          <Button className="h-16 flex-col" onClick={() => handlePayment("loyalty")} disabled={processing}>
                            <Gift className="h-6 w-6 mb-1" />
                            Loyalty
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
                      <DialogTrigger asChild>
                        <Button variant="outline" disabled={!lastReceipt}>
                          <Receipt className="h-4 w-4 mr-1" />
                          Receipt
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Receipt</DialogTitle>
                        </DialogHeader>
                        {lastReceipt && (
                          <div>
                            <div className="mb-2 font-semibold">
                              Transaction: {lastReceipt.transactionNumber}
                            </div>
                            <div className="mb-2 text-xs text-muted-foreground">
                              {lastReceipt.date}
                            </div>
                            <div className="mb-2">
                              <ul>
                                {lastReceipt.items.map((item: CartItem) => (
                                  <li key={item.id}>
                                    {item.name} x{item.quantity} @ ${item.price.toFixed(2)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>${lastReceipt.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tax:</span>
                              <span>${lastReceipt.taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>Total:</span>
                              <span>${lastReceipt.totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="mt-2">
                              Payment: <span className="capitalize">{lastReceipt.paymentMethod}</span>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}