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
  Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { StockStatusBadge } from "@/components/ui/status-badge"

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

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (branchFilter !== "ALL") params.append("locationId", branchFilter)
      if (statusFilter !== "ALL") params.append("status", statusFilter)

      const res = await fetch(`/api/inventory?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setSummary(data.summary || null)
        if (data.branches) setBranches(data.branches)
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
            subtitle="At or below reorder level"
            icon={AlertTriangle}
            iconColor="text-amber-600"
            badge={
              summary.lowStockCount > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Warning
                </span>
              ) : undefined
            }
          />
          <StatCard
            title="Out of Stock"
            value={summary.outOfStockCount}
            subtitle="Zero balance at branch"
            icon={AlertTriangle}
            iconColor="text-rose-600"
            badge={
              summary.outOfStockCount > 0 ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Critical
                </span>
              ) : undefined
            }
          />
        </div>
      )}

      {/* ───────────────── SEARCH & FILTER TOOLBAR ───────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by SKU, product name, or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 shadow-2xs focus:outline-hidden"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 shadow-2xs focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="NORMAL">In Stock (Normal)</option>
            <option value="LOW_STOCK">Low Stock Alert</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* ───────────────── DATA PRESENTATION (DESKTOP TABLE + MOBILE CARDS) ───────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Branch Location</th>
                <th className="py-3 px-4 text-right">Available Qty</th>
                <th className="py-3 px-4 text-right">Reorder Pt</th>
                <th className="py-3 px-4">Stock Level Gauge</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
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
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold text-emerald-800">
                          <Link href={`/admin/stock-in?productId=${item.productId}&locationId=${item.locationId}`}>
                            + Restock
                          </Link>
                        </Button>
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

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">
                    Stock: <strong className="text-slate-900">{item.quantity}</strong> / Reorder: {item.reorderLevel}
                  </span>
                  <Button asChild size="sm" variant="outline" className="h-6 px-2 text-[10px]">
                    <Link href={`/admin/stock-in?productId=${item.productId}&locationId=${item.locationId}`}>
                      + Restock
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
