"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  PackageCheck,
  ArrowLeft,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"
import { TransferStatusBadge } from "@/components/ui/status-badge"

interface TransferItem {
  id: string
  productId: string
  productName: string
  productSku?: string | null
  quantityRequested: number
  quantityDispatched: number
  quantityReceived: number
}

interface TransferDetail {
  id: string
  transferNumber: string
  status: string
  sourceLocationName?: string
  destinationLocationName?: string
  items: TransferItem[]
}

export default function TransferReceivePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [transfer, setTransfer] = useState<TransferDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({})
  const [discrepancyReasons, setDiscrepancyReasons] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/transfers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTransfer(data)
        const qtys: Record<string, number> = {}
        ;(data.items || []).forEach((item: TransferItem) => {
          qtys[item.id] = item.quantityDispatched ?? item.quantityRequested
        })
        setReceivedQtys(qtys)
        setLoading(false)
      })
      .catch(() => {
        toast.error("Failed to load transfer details")
        setLoading(false)
      })
  }, [id])

  const handleQtyChange = (itemId: string, val: number) => {
    setReceivedQtys((prev) => ({ ...prev, [itemId]: Math.max(0, val) }))
  }

  const handleReasonChange = (itemId: string, reason: string) => {
    setDiscrepancyReasons((prev) => ({ ...prev, [itemId]: reason }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transfer) return

    // Verify discrepancies have explanations
    for (const item of transfer.items) {
      const received = receivedQtys[item.id] ?? item.quantityDispatched
      const dispatched = item.quantityDispatched
      if (received < dispatched && !discrepancyReasons[item.id]?.trim()) {
        toast.error(`Please provide a reason for the discrepancy on "${item.productName}"`)
        return
      }
    }

    setSubmitting(true)
    try {
      const itemsPayload = transfer.items.map((item) => ({
        itemId: item.id,
        receivedQuantity: receivedQtys[item.id] ?? item.quantityDispatched,
        discrepancyReason: discrepancyReasons[item.id] || null,
      }))

      const res = await fetch(`/api/transfers/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsPayload }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Failed to confirm receipt")
        return
      }

      toast.success("Transfer received successfully! Destination inventory incremented.")
      router.push("/admin/transfers")
    } catch {
      toast.error("Network error confirming transfer")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
        <RefreshCw className="h-5 w-5 animate-spin text-emerald-700" />
        Loading transfer manifest...
      </div>
    )
  }

  if (!transfer) {
    return (
      <div className="py-16 text-center text-slate-500">
        Transfer record not found.{" "}
        <Link href="/admin/transfers" className="text-emerald-700 underline font-semibold">
          Return to transfers
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Receive Goods: ${transfer.transferNumber}`}
        description="Verify physical carton count upon arrival. Any shortage or damaged goods must be accompanied by a recorded discrepancy reason."
        breadcrumbs={[
          { label: "Operations", href: "/admin/transfers" },
          { label: "Stock Transfers", href: "/admin/transfers" },
          { label: `Receive ${transfer.transferNumber}` },
        ]}
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 text-xs border-slate-300">
            <Link href="/admin/transfers">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Transfers
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Manifest Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-bold text-slate-500 block">
              WAYBILL / CUSTODY RECORD
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{transfer.transferNumber}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Source: <strong className="text-slate-800">{transfer.sourceLocationName || "Source Branch"}</strong> → Destination:{" "}
              <strong className="text-slate-800">{transfer.destinationLocationName || "Your Branch"}</strong>
            </p>
          </div>
          <div>
            <TransferStatusBadge status={transfer.status} />
          </div>
        </div>

        {/* Item Reconciliation Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/70">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Shipment Manifest Items
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Product Name / SKU</th>
                  <th className="py-2.5 px-4 text-center">Dispatched</th>
                  <th className="py-2.5 px-4 text-center">Physical Count (Received)</th>
                  <th className="py-2.5 px-4">Discrepancy / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfer.items.map((item) => {
                  const received = receivedQtys[item.id] ?? item.quantityDispatched
                  const diff = item.quantityDispatched - received
                  const hasShortage = diff > 0

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {item.productSku || "SKU-N/A"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {item.quantityDispatched} units
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Input
                          type="number"
                          min="0"
                          max={item.quantityDispatched}
                          value={received}
                          onChange={(e) =>
                            handleQtyChange(item.id, parseInt(e.target.value) || 0)
                          }
                          className="w-24 h-9 mx-auto text-center font-mono font-bold text-xs"
                        />
                      </td>

                      <td className="py-3 px-4">
                        {hasShortage ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                              <AlertTriangle className="h-3 w-3" /> Shortage: -{diff} units
                            </span>
                            <Input
                              placeholder="Reason (e.g. damaged in transit, box seal broken)..."
                              value={discrepancyReasons[item.id] || ""}
                              onChange={(e) => handleReasonChange(item.id, e.target.value)}
                              className="h-8 text-xs border-amber-300 bg-amber-50/40"
                              required
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Full Delivery Verified
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Confirmation Action */}
        <div className="flex items-center justify-between pt-2">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/admin/transfers">Cancel</Link>
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#14532D] hover:bg-[#0f3e22] text-white font-bold h-11 px-6 text-xs"
          >
            {submitting ? "Committing Inventory..." : "Confirm Receipt & Add to Inventory"}
          </Button>
        </div>
      </form>
    </div>
  )
}
