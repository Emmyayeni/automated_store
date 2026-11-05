"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import {
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  Building2,
  Clock,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/ui/page-header"
import { TransferStatusBadge } from "@/components/ui/status-badge"

interface Transfer {
  id: string
  transferNumber: string
  status: string
  sourceLocationName: string
  sourceLocationId: string
  destinationLocationName: string
  destinationLocationId: string
  requestedDate: string
  approvedDate?: string | null
  dispatchedDate?: string | null
  receivedDate?: string | null
  notes?: string | null
  itemsCount?: number
}

interface ProductOption {
  id: string
  name: string
  sku: string
}

interface LocationOption {
  id: string
  name: string
}

export default function TransfersPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userRole = (user?.role || "").toUpperCase()
  const isManagerOrAdmin = userRole === "ADMIN" || userRole === "BRANCH_MANAGER" || userRole === "MANAGER"

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [search, setSearch] = useState("")

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Options for creation
  const [branches, setBranches] = useState<LocationOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])

  // Form state for creating transfer
  const [sourceId, setSourceId] = useState("")
  const [destId, setDestId] = useState("")
  const [transferItems, setTransferItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: "", quantity: 1 },
  ])
  const [transferNotes, setTransferNotes] = useState("")

  const fetchTransfers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/transfers")
      if (res.ok) {
        const data = await res.json()
        setTransfers(data || [])
      }
    } catch (err) {
      console.error("Failed to load transfers:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransfers()

    // Fetch branches & products for transfer dialog
    async function loadFormOptions() {
      try {
        let bRes = await fetch("/api/admin/locations")
        if (!bRes.ok) bRes = await fetch("/api/locations")
        if (bRes.ok) {
          const b = await bRes.json()
          setBranches(Array.isArray(b) ? b : b.data || [])
        }

        let pRes = await fetch("/api/admin/products")
        if (!pRes.ok) pRes = await fetch("/api/products")
        if (pRes.ok) {
          const p = await pRes.json()
          setProducts(Array.isArray(p) ? p : p.data || [])
        }
      } catch (e) {
        console.error("Error loading transfer form options:", e)
      }
    }
    loadFormOptions()
  }, [])

  // Action handlers
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/transfers/${id}/approve`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Approval failed")
        return
      }
      toast.success("Transfer approved successfully")
      fetchTransfers()
    } catch {
      toast.error("Failed to approve transfer")
    }
  }

  const handleDispatch = async (id: string) => {
    try {
      const res = await fetch(`/api/transfers/${id}/dispatch`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Dispatch failed")
        return
      }
      toast.success("Stock dispatched! Deducted from source branch inventory.")
      fetchTransfers()
    } catch {
      toast.error("Failed to dispatch transfer")
    }
  }

  const handleRejectConfirm = async () => {
    if (!selectedTransferId) return
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }
    try {
      const res = await fetch(`/api/transfers/${selectedTransferId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Rejection failed")
        return
      }
      toast.success("Transfer rejected")
      setRejectOpen(false)
      setRejectionReason("")
      setSelectedTransferId(null)
      fetchTransfers()
    } catch {
      toast.error("Failed to reject transfer")
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceId || !destId) {
      toast.error("Please select both source and destination branches")
      return
    }
    if (sourceId === destId) {
      toast.error("Source and destination branch cannot be identical")
      return
    }
    const validItems = transferItems.filter((i) => i.productId && i.quantity > 0)
    if (validItems.length === 0) {
      toast.error("Add at least one product with quantity > 0")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLocationId: sourceId,
          destinationLocationId: destId,
          items: validItems,
          notes: transferNotes,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Failed to create transfer request")
        return
      }

      toast.success(`Transfer ${json.transferNumber || "request"} created successfully`)
      setCreateOpen(false)
      setSourceId("")
      setDestId("")
      setTransferItems([{ productId: "", quantity: 1 }])
      setTransferNotes("")
      fetchTransfers()
    } catch {
      toast.error("Network error creating transfer")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTransfers = transfers.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false
    const q = search.toLowerCase()
    return (
      t.transferNumber.toLowerCase().includes(q) ||
      t.sourceLocationName.toLowerCase().includes(q) ||
      t.destinationLocationName.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inter-Branch Stock Transfers"
        description="4-State chain of custody: Request → Manager Approval → In-Transit (Source Deducted) → Destination Confirmed (Stock Added)."
        breadcrumbs={[
          { label: "Operations", href: "/admin/transfers" },
          { label: "Stock Transfers" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransfers}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              size="sm"
              className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Transfer Request
            </Button>
          </div>
        }
      />

      {/* ───────────────── STATUS TABS & SEARCH ───────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: "All Transfers" },
            { id: "REQUESTED", label: "Requested" },
            { id: "APPROVED", label: "Approved" },
            { id: "IN_TRANSIT", label: "In-Transit" },
            { id: "RECEIVED", label: "Completed" },
            { id: "REJECTED", label: "Rejected" },
          ].map((tab) => {
            const count =
              tab.id === "ALL"
                ? transfers.length
                : transfers.filter((t) => t.status === tab.id).length
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-[#14532D] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id
                      ? "bg-emerald-800 text-emerald-100"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search transfer # or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-300"
          />
        </div>
      </div>

      {/* ───────────────── TRANSFERS LIST (DESKTOP + MOBILE) ───────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Transfer Number</th>
                <th className="py-3 px-4">Source Branch (From)</th>
                <th className="py-3 px-4">Destination (To)</th>
                <th className="py-3 px-4">Requested Date</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-700" />
                    Loading transfers...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No transfers found in this status.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {t.transferNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {t.sourceLocationName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-emerald-700" />
                        {t.destinationLocationName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(t.requestedDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <TransferStatusBadge status={t.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Step 1: Manager Approve / Reject */}
                        {t.status === "REQUESTED" && isManagerOrAdmin && (
                          <>
                            <Button
                              onClick={() => handleApprove(t.id)}
                              size="sm"
                              className="h-7 px-2.5 text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedTransferId(t.id)
                                setRejectOpen(true)
                              }}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {/* Step 2: Dispatch from Source */}
                        {t.status === "APPROVED" && (
                          <Button
                            onClick={() => handleDispatch(t.id)}
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-purple-700 hover:bg-purple-800 text-white font-semibold flex items-center gap-1"
                          >
                            <Truck className="h-3 w-3" />
                            Dispatch Stock
                          </Button>
                        )}

                        {/* Step 3: Receive at Destination */}
                        {t.status === "IN_TRANSIT" && (
                          <Button
                            asChild
                            size="sm"
                            className="h-7 px-2.5 text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1"
                          >
                            <Link href={`/admin/transfers/${t.id}/receive`}>
                              <PackageCheck className="h-3 w-3" />
                              Receive & Verify
                            </Link>
                          </Button>
                        )}

                        {t.status === "RECEIVED" && (
                          <span className="text-[11px] text-emerald-800 font-medium">
                            ✓ Reconciled
                          </span>
                        )}

                        {t.status === "REJECTED" && (
                          <span className="text-[11px] text-rose-600 font-medium">Declined</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading transfers...</div>
          ) : filteredTransfers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No transfers found.</div>
          ) : (
            filteredTransfers.map((t) => (
              <div key={t.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {t.transferNumber}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {t.sourceLocationName} → {t.destinationLocationName}
                    </p>
                  </div>
                  <TransferStatusBadge status={t.status} />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {new Date(t.requestedDate).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {t.status === "REQUESTED" && isManagerOrAdmin && (
                      <Button
                        onClick={() => handleApprove(t.id)}
                        size="sm"
                        className="h-7 text-[10px] bg-emerald-700 text-white"
                      >
                        Approve
                      </Button>
                    )}
                    {t.status === "APPROVED" && (
                      <Button
                        onClick={() => handleDispatch(t.id)}
                        size="sm"
                        className="h-7 text-[10px] bg-purple-700 text-white"
                      >
                        Dispatch
                      </Button>
                    )}
                    {t.status === "IN_TRANSIT" && (
                      <Button
                        asChild
                        size="sm"
                        className="h-7 text-[10px] bg-emerald-700 text-white"
                      >
                        <Link href={`/admin/transfers/${t.id}/receive`}>Receive</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ───────────────── CREATE TRANSFER DIALOG ───────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Create Inter-Branch Transfer Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Request stock relocation from a source branch to a destination branch.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Source Branch (From)</Label>
                <select
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                >
                  <option value="">Select source branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Destination Branch (To)</Label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                >
                  <option value="">Select destination branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Item Rows */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Items to Transfer</Label>
                <button
                  type="button"
                  onClick={() =>
                    setTransferItems([...transferItems, { productId: "", quantity: 1 }])
                  }
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </button>
              </div>

              {transferItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      const updated = [...transferItems]
                      updated[idx].productId = e.target.value
                      setTransferItems(updated)
                    }}
                    className="flex-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>

                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...transferItems]
                      updated[idx].quantity = parseInt(e.target.value) || 1
                      setTransferItems(updated)
                    }}
                    className="w-24 h-9 text-xs font-mono font-bold"
                  />

                  {transferItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = transferItems.filter((_, i) => i !== idx)
                        setTransferItems(updated)
                      }}
                      className="h-9 w-9 p-0 text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-bold text-slate-700">Transfer Purpose / Notes</Label>
              <Textarea
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                rows={2}
                placeholder="Reason for transfer (e.g. stockout mitigation, promotional batch)..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                size="sm"
                className="bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold"
              >
                {submitting ? "Submitting Request..." : "Submit Transfer Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────── REJECT TRANSFER DIALOG ───────────────── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700">
              Reject Transfer Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              State the reason why this transfer request cannot be fulfilled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-bold text-slate-700">Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. Insufficient shelf safety buffer at source branch, pending supplier restock..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRejectConfirm}
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
