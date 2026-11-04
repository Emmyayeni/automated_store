"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Minus, Plus, Trash2, DollarSign, Loader2, Package } from "lucide-react"
import type { CartItem, Product } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { formatPrice, formatPriceNumeric } from "@/lib/standards/formatting"
import { ApiError, ValidationError, handleApiError } from "@/lib/standards/error-handling"
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages"
import TransactionActions from "./transaction-actions"
import ReceiptModal from "./receipt-modal"
import CashDrawerModal from "./cash-drawer-modal"
import SplitPaymentModal from "../payments/split-payment-modal"
import { parsePrice } from "@/lib/price-utils"

// Enhanced CartItem type with UOM support
interface CartItemWithUOM extends CartItem {
  uomId?: string; // Made optional since base CartItem may not have UOM
  uomCode?: string;
  uomName?: string;
  uomAbbreviation?: string;
  conversionFactor?: number;
  pricePerUnit?: number;
}

interface TransactionWithLocation {
  id: string;
  locationId: string;
  total: number;
  transactionNumber: string;
  userId: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  discountAmount: number;
  status: "completed" | "refunded" | "voided";
  createdAt: Date;
}

interface CartProps {
  items: CartItemWithUOM[]
  onUpdateQuantity: (productId: string, quantity: number, uomId?: string) => void
  onRemoveItem: (productId: string, uomId?: string) => void
  onCheckout: (paymentMethod: string) => Promise<any>
  onHoldTransaction: (reason: string) => void
  userId: string
  taxRate?: number
}

export default function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onHoldTransaction,
  userId,
  taxRate,
}: CartProps) {
  const { toast } = useToast()
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<TransactionWithLocation | null>(null)
  const [showCashDrawer, setShowCashDrawer] = useState(false)
  const [showSplitPayment, setShowSplitPayment] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const [heldTransactions, setHeldTransactions] = useState<any[]>([])
  const [selectedHeldTransaction, setSelectedHeldTransaction] = useState<any>(null)

  // Function to retrieve held transactions with standardized error handling
  const retrieveHeldTransaction = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/held-transactions/${transactionId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || 'Failed to retrieve transaction',
          response.status,
          errorData.code || 'RETRIEVE_FAILED'
        );
      }
      const transaction = await response.json();
      toast({
        title: "Transaction retrieved",
        description: `Transaction #${transaction.id} was loaded successfully`,
      });
      return transaction;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : "Failed to retrieve the transaction";
      
      console.error("Error retrieving transaction:", error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  }

  const effectiveTaxRate = taxRate ?? 0
  const { subtotal, taxAmount, total } = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      // Use UOM-specific price if available, otherwise use base product price
      const unitPrice = item.pricePerUnit || parsePrice(item.product.price)
      return sum + unitPrice * item.quantity;
    }, 0)
    const taxAmount = subtotal * effectiveTaxRate
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }, [items, effectiveTaxRate])

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast({
        title: "Cannot checkout",
        description: "Cart is empty. Please add items before checkout.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingOut(true)
    try {
      const transaction = await onCheckout(paymentMethod)
      setLastTransaction(transaction)
      setShowReceipt(true)
      toast({
        title: "Checkout successful",
        description: `Transaction #${transaction.transactionNumber} completed`,
      })
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : "An unexpected error occurred during checkout";
      
      console.error("Checkout failed:", error)
      toast({
        title: "Checkout failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCheckingOut(false)
    }
  }

  const handleSplitPayment = async (payments: Array<{method: string; amount: number}>, tipAmount: number = 0) => {
    if (items.length === 0) {
      toast({
        title: "Cannot process payment",
        description: "Cart is empty. Please add items before processing payment.",
        variant: "destructive",
      });
      return;
    }

    if (!payments || payments.length === 0) {
      toast({
        title: "Invalid payment",
        description: VALIDATION_MESSAGES.REQUIRED("Payment method"),
        variant: "destructive",
      });
      return;
    }

    setIsCheckingOut(true)
    try {
      const primaryPayment = payments[0]?.method || 'cash'
      const transaction = await onCheckout(primaryPayment)
      setLastTransaction(transaction)
      setShowReceipt(true)
      setShowSplitPayment(false)
      toast({
        title: "Split payment successful",
        description: `Transaction #${transaction.transactionNumber} completed with ${payments.length} payment method(s)`,
      })
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : "An unexpected error occurred during split payment";
      
      console.error("Split payment failed:", error)
      toast({
        title: "Split payment failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Current Sale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-2 max-h-96 overflow-y-auto" aria-label="Shopping cart items">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items in cart</p>
          ) : (
            items.map((item) => {
              const unitPrice = item.pricePerUnit || parsePrice(item.product.price)
              const itemKey = `${item.product.id}-${item.uomId || 'default'}`
              
              return (
                <div key={itemKey} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product.name}</h4>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>{formatPrice(unitPrice)} each</p>
                      {item.uomName && (
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>{item.uomName}</span>
                          {item.conversionFactor && item.conversionFactor !== 1 && (
                            <span className="text-xs">({item.conversionFactor}x)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.product.id, Math.max(0, item.quantity - 1), item.uomId)}
                      aria-label={`Decrease quantity of ${item.product.name}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.product.id, Number.parseInt(e.target.value) || 0, item.uomId)}
                      className="w-16 text-center"
                      min="0"
                      aria-label={`Quantity for ${item.product.name}`}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1, item.uomId)}
                      aria-label={`Increase quantity of ${item.product.name}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => onRemoveItem(item.product.id, item.uomId)}
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({(effectiveTaxRate * 100).toFixed(1)}%):</span>
            <span>{formatPrice(taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
        {/* Payment Method */}
        <div className="space-y-2">
          <label htmlFor="payment-method" className="text-sm font-medium">Payment Method:</label>
          <select
            id="payment-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 border rounded"
            aria-label="Select payment method"
          >
            <option value="cash">Cash</option>
            <option value="card">Credit/Debit Card</option>
            <option value="mobile">Mobile Payment</option>
          </select>
        </div>

        <Button 
          variant="outline" 
          onClick={() => setShowCashDrawer(true)} 
          className="w-full mb-2"
          aria-label="Open cash drawer"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Cash Drawer
        </Button>

        <TransactionActions
          cartItems={items}
          onHoldTransaction={onHoldTransaction}
          onRetrieveTransaction={(transactionId) => retrieveHeldTransaction(transactionId)}
          userId={userId}
        />

        {/* Checkout Button */}
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowSplitPayment(true)} 
            variant="outline" 
            className="flex-1"
            aria-label="Split payment across multiple methods"
          >
            Split Payment
          </Button>
          <Button 
            onClick={handleCheckout} 
            disabled={items.length === 0 || isCheckingOut} 
            className="flex-1" 
            size="lg"
            aria-label="Complete sale"
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Complete Sale - {formatPrice(total)}</>
            )}
          </Button>
        </div>
      </CardContent>
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        transaction={lastTransaction}
        locationId={lastTransaction?.locationId}
      />

      <CashDrawerModal isOpen={showCashDrawer} onClose={() => setShowCashDrawer(false)} userId={userId} />
      <SplitPaymentModal 
        isOpen={showSplitPayment} 
        onClose={() => setShowSplitPayment(false)} 
        totalAmount={total} 
        onProcessPayment={handleSplitPayment} 
      />
    </Card>
  )
}