"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Calculator } from "lucide-react"
import { formatPrice, formatDisplayDateTime } from "@/lib/standards/formatting"

interface CashDrawerModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export default function CashDrawerModal({ isOpen, onClose, userId }: CashDrawerModalProps) {
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [openingAmount, setOpeningAmount] = useState("")
  const [closingAmount, setClosingAmount] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchCurrentSession()
    }
  }, [isOpen, userId])

  const fetchCurrentSession = async () => {
    try {
      const response = await fetch(`/api/cash-sessions?userId=${userId}&status=open`)
      const sessions = await response.json()
      if (sessions.length > 0) {
        setCurrentSession(sessions[0])
      }
    } catch (error) {
      console.error("Error fetching cash session:", error)
    }
  }

  const handleOpenDrawer = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/cash-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          openingAmount: Number.parseFloat(openingAmount) || 0,
        }),
      })

      if (response.ok) {
        const session = await response.json()
        setCurrentSession(session)
        setOpeningAmount("")
      }
    } catch (error) {
      console.error("Error opening cash drawer:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseDrawer = async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      // Calculate expected amount from today's cash transactions
      const expectedAmount = Number.parseFloat(currentSession.opening_amount) + 0 // Add cash sales

      const response = await fetch(`/api/cash-sessions/${currentSession.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingAmount: Number.parseFloat(closingAmount),
          expectedAmount,
        }),
      })

      if (response.ok) {
        setCurrentSession(null)
        setClosingAmount("")
        onClose()
      }
    } catch (error) {
      console.error("Error closing cash drawer:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash Drawer Management
          </DialogTitle>
        </DialogHeader>

        {!currentSession ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Open Cash Drawer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="opening-amount">Opening Amount</Label>
                <Input
                  id="opening-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
              </div>
              <Button onClick={handleOpenDrawer} disabled={loading} className="w-full">
                {loading ? "Opening..." : "Open Drawer"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Close Cash Drawer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Opened:</p>
                  <p>{formatDisplayDateTime(currentSession.opened_at)}</p>
                </div>
                <div>
                  <p className="font-medium">Opening Amount:</p>
                  <p>{formatPrice(currentSession.opening_amount)}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="closing-amount">Actual Cash Count</Label>
                <Input
                  id="closing-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCloseDrawer} disabled={loading || !closingAmount} className="flex-1">
                  {loading ? "Closing..." : "Close Drawer"}
                </Button>
                <Button variant="outline" onClick={() => setClosingAmount("100.00")}>
                  <Calculator className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
