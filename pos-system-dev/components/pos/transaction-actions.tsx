"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RotateCcw, X, Pause, Play } from "lucide-react"
import type { CartItem } from "@/lib/types"
import { formatPrice, formatDisplayDateTime } from "@/lib/standards/formatting"
import { ApiError } from "@/lib/standards/error-handling"

interface TransactionActionsProps {
  cartItems: CartItem[]
  onHoldTransaction: (reason: string) => void
  onRetrieveTransaction: (transactionId: string) => Promise<any>
  userId: string
}

export default function TransactionActions({
  cartItems,
  onHoldTransaction,
  onRetrieveTransaction,
  userId,
}: TransactionActionsProps) {
  const [holdReason, setHoldReason] = useState("")
  const [heldTransactions, setHeldTransactions] = useState<any[]>([])
  const [showHeldTransactions, setShowHeldTransactions] = useState(false)

  const fetchHeldTransactions = async () => {
    try {
      const response = await fetch(`/api/held-transactions?userId=${userId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || 'Failed to fetch held transactions',
          response.status,
          errorData.code || 'FETCH_FAILED'
        )
      }
      const data = await response.json()
      // Ensure data is an array and handle both success response format and direct array
      const transactions = data.success ? data.data : data
      setHeldTransactions(Array.isArray(transactions) ? transactions : [])
      setShowHeldTransactions(true)
    } catch (error) {
      console.error("Error fetching held transactions:", error)
      // Set to empty array on error to prevent map error
      setHeldTransactions([])
      setShowHeldTransactions(true)
    }
  }

  const handleRetrieveTransaction = async (heldTransactionId: string) => {
    try {
      await onRetrieveTransaction(heldTransactionId)
      setShowHeldTransactions(false)
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : "Failed to retrieve transaction"
      
      console.error("Error retrieving transaction:", error)
      // You might want to show a toast notification here
      alert(errorMessage)
    }
  }

  return (
    <div className="flex gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={cartItems.length === 0}>
            <Pause className="h-4 w-4 mr-1" />
            Hold
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hold Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="hold-reason">Reason for holding (optional)</Label>
              <Textarea
                id="hold-reason"
                placeholder="Customer needs to get more items..."
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                onHoldTransaction(holdReason)
                setHoldReason("")
              }}
              className="w-full"
            >
              Hold Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHeldTransactions} onOpenChange={setShowHeldTransactions}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" onClick={fetchHeldTransactions}>
            <Play className="h-4 w-4 mr-1" />
            Retrieve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Held Transactions</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {!Array.isArray(heldTransactions) || heldTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No held transactions</p>
            ) : (
              heldTransactions.map((transaction) => (
                <div key={transaction.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{formatPrice(transaction.totalAmount || transaction.total_amount || '0')}</p>
                      <p className="text-sm text-gray-500">{formatDisplayDateTime(transaction.createdAt || transaction.created_at)}</p>
                      {transaction.holdReason && <p className="text-xs text-gray-600">{transaction.holdReason}</p>}
                    </div>
                    <Button size="sm" onClick={() => handleRetrieveTransaction(transaction.id)}>
                      Retrieve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" disabled={cartItems.length === 0}>
        <RotateCcw className="h-4 w-4 mr-1" />
        Refund
      </Button>

      <Button variant="outline" size="sm" disabled={cartItems.length === 0}>
        <X className="h-4 w-4 mr-1" />
        Void
      </Button>
    </div>
  )
}