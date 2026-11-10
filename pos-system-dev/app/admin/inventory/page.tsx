"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Layers,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  Filter,
  Package,
  Building2,
  SlidersHorizontal,
  History,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { StockStatusBadge } from "@/components/ui/status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface InventoryItem {
  id: string
  locationId: string
  locationName: string
  productId: string
  productName: string
  productSku: string
  quantity: number
  reorderLevel: number
  stockStatus: string
  updatedAt: string
}

interface Summary {
  totalProducts: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [branchFilter, setBranchFilter] = useState("ALL")
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])

  // Stock Adjustment Modal State
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [adjustMode, setAdjustMode] = useState<"NEW_TOTAL" | "DELTA">("NEW_TOTAL")
  const [newTotalValue, setNewTotalValue] = useState<string>("")
  const [deltaValue, setDeltaValue] = useState<string>("")
  const [adjustReason, setAdjustReason] = useState<string>("recount")
  const [adjustNotes, setAdjustNotes] = useState<string>("")
  const [submittingAdjust, setSubmittingAdjust] = useState(false)

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (branchFilter !== "ALL") params.append("locationId", branchFilter)
      if (statusFilter !== "ALL") params.append("status", statusFilter)

      const res = await fetch(`/api/inventory?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const itemsList = Array.isArray(data) ? data : data.items || []
        setItems(itemsList)
        setSummary(data.summary || null)
        if (data.branches && data.branches.length > 0) setBranches(data.branches)
      }
    } catch (err) {
      console.error("Failed to load inventory:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [branchFilter, statusFilter])

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase()
    return (
      item.productName.toLowerCase().includes(q) ||
      item.productSku.toLowerCase().includes(q) ||
      item.locationName.toLowerCase().includes(q)
    )
  })

  // Open Adjust Modal
  const openAdjustModal = (item: InventoryItem) => {
    setSelectedItem(item)
    setAdjustMode("NEW_TOTAL")
    setNewTotalValue(item.quantity.toString())
    setDeltaValue("0")
    setAdjustReason("recount")
    setAdjustNotes("")
    setAdjustOpen(true)
  }

  // Calculate projected quantity
  const projectedQuantity = () => {
    if (!selectedItem) return 0
    if (adjustMode === "NEW_TOTAL") {
      const val = parseInt(newTotalValue)
      return isNaN(val) ? selectedItem.quantity : val
    } else {
      const delta = parseInt(deltaValue)
      return isNaN(delta) ? selectedItem.quantity : Math.max(0, selectedItem.quantity + delta)
    }
  }

  // Calculate actual delta to submit
  const computedDelta = () => {
    if (!selectedItem) return 0
    if (adjustMode === "NEW_TOTAL") {
      const val = parseInt(newTotalValue)
      return isNaN(val) ? 0 : val - selectedItem.quantity
    } else {
      const delta = parseInt(deltaValue)
      return isNaN(delta) ? 0 : delta
    }
  }

  // Submit Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    const delta = computedDelta()
    if (delta === 0) {
      toast.info("No change detected in stock quantity")
      setAdjustOpen(false)
      return
    }

    setSubmittingAdjust(true)
    try {
      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedItem.locationId,
          productId: selectedItem.productId,
          adjustmentQuantity: delta,
          adjustmentType: adjustReason,
          reason: adjustReason.replace("_", " ").toUpperCase(),
          notes: adjustNotes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || data.details || "Failed to adjust inventory")
      }

      toast.success(
        `Adjusted "${selectedItem.productName}": ${delta > 0 ? `+${delta}` : delta} units (${selectedItem.quantity} → ${selectedItem.quantity + delta})`
      )
      setAdjustOpen(false)
      fetchInventory()
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust inventory")
    } finally {
      setSubmittingAdjust(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ───────────────── HEADER ───────────────── */}
      <PageHeader
        title="Multi-Branch Inventory Balances"
        description="Centralized physical stock levels, reorder points, and automated status calculations."
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Stock Balances" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/stock-movements">
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs border-slate-300">
                <History className="h-3.5 w-3.5 mr-1.5" />
                Audit Ledger
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInventory}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs">
              <Link href="/admin/stock-in">
                <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
                Record Stock-In
              </Link>
            </Button>
          </div>
        }
      />

      {/* ───────────────── SUMMARY CARDS ───────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Stock Units"
            value={summary.totalUnits.toLocaleString()}
            subtitle="Available in selected view"
            icon={Layers}
            iconColor="text-emerald-700"
          />
          <StatCard
            title="Catalog SKUs"
            value={summary.totalProducts}
            subtitle="Active registered products"
            icon={Package}
            iconColor="text-blue-600"
          />
          <StatCard
            title="Low Stock Warning"
            value={summary.lowStockCount}
            subtitle="At or below reorder threshold"
            icon={AlertTriangle}
            iconColor="text-amber-500"
          />
          <StatCard
            title="Out of Stock"
            value={summary.outOfStockCount}
            subtitle="Needs immediate reorder"
            icon={AlertTriangle}
            iconColor="text-rose-600"
          />
        </div>
      )}

      {/* ───────────────── FILTER TOOLBAR ───────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, product name, or branch..."
            className="pl-9 h-9 text-xs border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
          />
        </div>

        {/* Branch & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            {["ALL", "NORMAL", "LOW_STOCK", "OUT_OF_STOCK"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                  statusFilter === st
                    ? "bg-[#14532D] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st === "ALL" ? "All" : st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───────────────── DATA TABLE / CARD LIST ───────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-right">Stock</th>
                <th className="py-3 px-4 text-right">Threshold</th>
                <th className="py-3 px-4">Gauge</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-700" />
                    Loading branch inventory...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching inventory items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const pct = Math.min(100, Math.round((item.quantity / Math.max(1, item.reorderLevel * 2)) * 100))
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {item.productSku}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.productName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {item.locationName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {item.quantity.toLocaleString()} units
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {item.reorderLevel} units
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full ${
                              item.stockStatus === "OUT_OF_STOCK"
                                ? "bg-rose-500"
                                : item.stockStatus === "LOW_STOCK"
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StockStatusBadge status={item.stockStatus} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAdjustModal(item)}
                            className="h-7 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <SlidersHorizontal className="h-3 w-3 mr-1 text-slate-400" />
                            Adjust
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">
                            <Link href={`/admin/stock-in?productId=${item.productId}&locationId=${item.locationId}`}>
                              + Restock
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List (prevents horizontal overflow on phones) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-emerald-700" />
              Loading items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching inventory items.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400">{item.productSku}</span>
                    <h4 className="text-xs font-bold text-slate-900">{item.productName}</h4>
                    <p className="text-[11px] text-slate-500">{item.locationName}</p>
                  </div>
                  <StockStatusBadge status={item.stockStatus} />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500">
                    Stock: <strong className="text-slate-900">{item.quantity}</strong> / Reorder: {item.reorderLevel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAdjustModal(item)}
                      className="h-6 px-2 text-[10px]"
                    >
                      Adjust
                    </Button>
                    <Button asChild size="sm" className="h-6 px-2 text-[10px] bg-[#14532D] text-white">
                      <Link href={`/admin/stock-in?productId=${item.productId}&locationId=${item.locationId}`}>
                        + Restock
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ───────────────── STOCK ADJUSTMENT MODAL ───────────────── */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
              Stock Adjustment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record inventory corrections, physical recounts, shrinkage, or damaged product losses.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-1">
              {/* Product Info Box */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{selectedItem.productName}</span>
                  <span className="font-mono text-slate-500">SKU: {selectedItem.productSku}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/70">
                  <span>Branch: <strong>{selectedItem.locationName}</strong></span>
                  <span>Current Physical Stock: <strong className="text-emerald-800 font-mono">{selectedItem.quantity} units</strong></span>
                </div>
              </div>

              {/* Adjustment Mode Toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Adjustment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustMode("NEW_TOTAL")}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      adjustMode === "NEW_TOTAL"
                        ? "bg-[#14532D] text-white border-[#14532D] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Set New Exact Total
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode("DELTA")}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      adjustMode === "DELTA"
                        ? "bg-[#14532D] text-white border-[#14532D] shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Add / Deduct Units (Delta)
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              {adjustMode === "NEW_TOTAL" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">New Physical Count *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newTotalValue}
                    onChange={(e) => setNewTotalValue(e.target.value)}
                    required
                    className="h-9 text-xs font-mono font-bold border-slate-200"
                    placeholder="e.g. 45"
                  />
                  <p className="text-[11px] text-slate-500">
                    Calculated Adjustment Delta:{" "}
                    <strong className={computedDelta() >= 0 ? "text-emerald-700" : "text-rose-600"}>
                      {computedDelta() > 0 ? `+${computedDelta()}` : computedDelta()} units
                    </strong>
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Adjustment Delta (+ or -) *</Label>
                  <Input
                    type="number"
                    value={deltaValue}
                    onChange={(e) => setDeltaValue(e.target.value)}
                    required
                    className="h-9 text-xs font-mono font-bold border-slate-200"
                    placeholder="e.g. -5 for damaged or +10 for found"
                  />
                  <p className="text-[11px] text-slate-500">
                    New Projected Total:{" "}
                    <strong className="text-slate-900 font-mono">{projectedQuantity()} units</strong>
                  </p>
                </div>
              )}

              {/* Adjustment Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Reason / Classification *</Label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs text-slate-800 bg-white"
                >
                  <option value="recount">Physical Audit / Shelf Recount</option>
                  <option value="damage">Damaged Product / Broken Packaging</option>
                  <option value="expired">Expired Date / Past Best-Before</option>
                  <option value="theft">Shrinkage / Inventory Discrepancy</option>
                  <option value="waste">Spillage / Spoilage / Waste</option>
                  <option value="manual">Other Manual Adjustment</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Audit Notes / Justification</Label>
                <Textarea
                  placeholder="e.g. Broken jar during shelf replenishment, or annual inventory recount variance..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  rows={2}
                  className="text-xs border-slate-200 resize-none"
                />
              </div>

              {/* Transition Summary Box */}
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs flex items-center justify-between">
                <span className="text-emerald-900 font-medium">Stock Transition:</span>
                <span className="font-mono font-bold text-emerald-900">
                  {selectedItem.quantity} → {projectedQuantity()} units (
                  {computedDelta() > 0 ? `+${computedDelta()}` : computedDelta()})
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustOpen(false)}
                  className="text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingAdjust || computedDelta() === 0}
                  className="bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-semibold"
                >
                  {submittingAdjust ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Adjusting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Confirm Adjustment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
