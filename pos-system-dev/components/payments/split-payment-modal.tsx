"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2 } from "lucide-react"
import { formatPrice } from "@/lib/standards/formatting"

interface SplitPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  totalAmount: number
  onProcessPayment: (payments: any[], tipAmount?: number) => void
}

export default function SplitPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onProcessPayment,
}: SplitPaymentModalProps) {
  // Ensure totalAmount is always a number
  const safeTotalAmount = typeof totalAmount === "number" && !isNaN(totalAmount) ? totalAmount : 0

  const [payments, setPayments] = useState([{ method: "cash", amount: safeTotalAmount }])
  const [tipAmount, setTipAmount] = useState(0)
  const [processing, setProcessing] = useState(false)

  // Reset payments when modal opens or totalAmount changes
  useEffect(() => {
    if (isOpen) {
      setPayments([{ method: "cash", amount: safeTotalAmount }])
      setTipAmount(0)
    }
  }, [isOpen, safeTotalAmount])

  const addPayment = () => {
    setPayments([...payments, { method: "cash", amount: 0 }])
  }

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index))
  }

  const updatePayment = (index: number, field: string, value: any) => {
    const updated = payments.map((payment, i) =>
      i === index ? { ...payment, [field]: value } : payment
    )
    setPayments(updated)
  }

  const totalPayments = payments.reduce(
    (sum, payment) => sum + (typeof payment.amount === "number" && !isNaN(payment.amount) ? payment.amount : 0),
    0
  )
  const grandTotal = safeTotalAmount + (typeof tipAmount === "number" && !isNaN(tipAmount) ? tipAmount : 0)
  const remaining = grandTotal - totalPayments

  const handleProcessPayment = async () => {
    if (Math.abs(remaining) > 0.01) return

    setProcessing(true)
    try {
      await onProcessPayment(payments, tipAmount > 0 ? tipAmount : undefined)
      onClose()
    } catch (error) {
      console.error("Payment processing failed:", error)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(safeTotalAmount)}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tip:</span>
                    <span>{formatPrice(tipAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tip Amount */}
          <div>
            <Label htmlFor="tip">Tip Amount (optional)</Label>
            <Input
              id="tip"
              type="number"
              step="0.01"
              value={tipAmount}
              onChange={(e) => setTipAmount(Number.parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Payment Methods</Label>
              <Button size="sm" variant="outline" onClick={addPayment}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {payments.map((payment, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Method</Label>
                      <select
                        value={payment.method}
                        onChange={(e) => updatePayment(index, "method", e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="gift_card">Gift Card</option>
                        <option value="mobile">Mobile Payment</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={payment.amount}
                        onChange={(e) =>
                          updatePayment(index, "amount", Number.parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    {payments.length > 1 && (
                      <Button size="sm" variant="destructive" onClick={() => removePayment(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Payments:</span>
                  <span>{formatPrice(totalPayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining:</span>
                  <span
                    className={
                      remaining > 0.01
                        ? "text-red-600"
                        : remaining < -0.01
                        ? "text-orange-600"
                        : "text-green-600"
                    }
                  >
                    {formatPrice(remaining)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process Button */}
          <Button
            onClick={handleProcessPayment}
            disabled={Math.abs(remaining) > 0.01 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? "Processing..." : `Process Payment - ${formatPrice(grandTotal)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}