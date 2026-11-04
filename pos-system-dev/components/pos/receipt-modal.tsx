"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer, Mail, Download } from "lucide-react"
import type { Transaction, User } from "@/lib/types"
import { useSession } from "next-auth/react"
import { formatPrice, formatDisplayDateTime } from "@/lib/standards/formatting"
import { ApiError } from "@/lib/standards/error-handling"
import { CommonValidators } from "@/lib/standards/validation"
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages"

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  locationId?: string
  businessId?: string
}

export default function ReceiptModal({
  isOpen,
  onClose,
  transaction,
  locationId,
  businessId,
}: ReceiptModalProps) {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [storeName, setStoreName] = useState<string>("")
  const [businessAddress, setBusinessAddress] = useState<string>("")
  const [businessPhone, setBusinessPhone] = useState<string>("")
  const { data: session } = useSession()

  useEffect(() => {
    async function fetchDetails() {
      if (locationId) {
        try {
          const res = await fetch(`/api/locations/${locationId}`)
          if (res.ok) {
            const data = await res.json()
            setStoreName(data.name?.trim() ? data.name : "")
            setBusinessAddress(data.address?.trim() ? data.address : "")
            setBusinessPhone(data.phone?.trim() ? data.phone : "")
          } else {
            const errorData = await res.json().catch(() => ({}))
            console.error("Failed to fetch location details:", errorData.error || "Unknown error")
            setStoreName("")
            setBusinessAddress("")
            setBusinessPhone("")
          }
        } catch (error) {
          console.error("Error fetching location details:", error)
          setStoreName("")
          setBusinessAddress("")
          setBusinessPhone("")
        }
      }
    }
    fetchDetails()
  }, [locationId, businessId])

  if (!transaction) return null

  // Fallbacks if API returns empty or whitespace values
  const displayStoreName = storeName?.trim() ? storeName : "Store"
  const displayBusinessAddress = businessAddress?.trim() ? businessAddress : "123 Main Street, City, State 12345"
  const displayBusinessPhone = businessPhone?.trim() ? businessPhone : "(555) 123-4567"

  const handlePrint = () => {
    const printContent = document.getElementById("receipt-content")
    if (printContent) {
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt</title>
              <style>
                body { font-family: monospace; font-size: 12px; margin: 20px; }
                .receipt { max-width: 300px; margin: 0 auto; }
                .center { text-align: center; }
                .line { border-bottom: 1px dashed #000; margin: 10px 0; }
                .total { font-weight: bold; font-size: 14px; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleEmailReceipt = async () => {
    const emailValidator = CommonValidators.email(true)
    const validation = emailValidator.validate(email)
    
    if (!validation.isValid) {
      alert(validation.error || VALIDATION_MESSAGES.INVALID_EMAIL)
      return
    }

    setSending(true)
    try {
      // TODO: Implement actual email sending API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert("Receipt sent successfully!")
      setEmail("")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send receipt"
      alert(errorMessage)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt - {transaction.transactionNumber}</DialogTitle>
        </DialogHeader>

        <div id="receipt-content" className="receipt font-mono text-sm">
          <div className="center mb-4">
            <h2 className="font-bold">{displayStoreName}</h2>
            <p>{displayBusinessAddress}</p>
            <p>{displayBusinessPhone}</p>
          </div>

          <div className="line"></div>

          <div className="mb-2">
            <p>Transaction: {transaction.transactionNumber}</p>
            <p>Date: {transaction.createdAt ? formatDisplayDateTime(transaction.createdAt) : ""}</p>
            <p>
              Cashier: {transaction.user?.name?.trim() ? transaction.user.name : "Unknown"}
            </p>
          </div>

          <div className="line"></div>

          <div className="mb-4">
            {transaction.items?.map((item, index) => (
              <div key={index} className="flex justify-between mb-1">
                <div>
                  <p>{item.product?.name}</p>
                  <p className="text-xs text-gray-600">
                    {item.quantity} x {formatPrice(item.unitPrice)}
                  </p>
                </div>
                <p>{formatPrice(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <div className="line"></div>

          <div className="mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatPrice(transaction.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatPrice(transaction.taxAmount)}</span>
            </div>
            <div className="flex justify-between total">
              <span>Total:</span>
              <span>{formatPrice(transaction.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="capitalize">{transaction.paymentMethod}</span>
            </div>
          </div>

          <div className="line"></div>

          <div className="center text-xs mt-4">
            <p>Thank you for your business!</p>
            <p>Returns accepted within 30 days with receipt.</p>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Save PDF
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Receipt</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="customer@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={handleEmailReceipt} disabled={!email || sending}>
                <Mail className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}