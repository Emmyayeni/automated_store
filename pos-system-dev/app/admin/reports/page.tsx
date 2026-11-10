"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  BarChart3,
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Download,
  RefreshCw,
  Building2,
  TrendingUp,
  Search,
  Filter,
  FileSpreadsheet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { MovementTypeBadge } from "@/components/ui/status-badge"

interface Summary {
  totalProducts: number
  totalStockUnits: number
  totalValuation: number
  lowStockCount: number
  outOfStockCount: number
}

interface Movement {
  id: string
  productName: string
  productSku?: string
  quantity: number
  previousQuantity?: number
  newQuantity?: number
  movementType: string
  reason?: string | null
  referenceNumber?: string | null
  locationName: string
  createdAt: string
  performedByName?: string
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [summary, setSummary] = useState<Summary | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [selectedBranch, setSelectedBranch] = useState("ALL")
  const [selectedType, setSelectedType] = useState("ALL")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const loadReportData = useCallback(async () => {
    setLoading(true)
    try {
      const bParam = selectedBranch !== "ALL" ? `?locationId=${selectedBranch}` : ""
      const [sumRes, movRes] = await Promise.all([
        fetch(`/api/reports/inventory-summary${bParam}`),
        fetch(`/api/stock-movements${bParam ? bParam + "&limit=50" : "?limit=50"}`),
      ])

      if (sumRes.ok) setSummary(await sumRes.json())
      if (movRes.ok) setMovements(await movRes.json())
    } catch (err) {
      console.error("Failed to load report data:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    async function loadBranches() {
      try {
        let r = await fetch("/api/admin/locations")
        if (!r.ok) r = await fetch("/api/locations")
        if (r.ok) {
          const locs = await r.json()
          setBranches(Array.isArray(locs) ? locs : locs.data || [])
        }
      } catch (e) {
        console.error("Error loading branches in reports:", e)
      }
    }
    loadBranches()
  }, [])

  useEffect(() => {
    loadReportData()
  }, [loadReportData])

  const exportCSV = () => {
    const headers = [
      "Date",
      "Movement Type",
      "Product Name",
      "SKU",
      "Branch",
      "Quantity",
      "Previous Balance",
      "New Balance",
      "Reference",
      "Reason",
    ]
    const rows = movements.map((m) => [
      new Date(m.createdAt).toISOString(),
      m.movementType,
      `"${m.productName.replace(/"/g, '""')}"`,
      m.productSku || "",
      `"${m.locationName}"`,
      m.quantity,
      m.previousQuantity ?? "",
      m.newQuantity ?? "",
      m.referenceNumber || "",
      `"${m.reason || ""}"`,
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      `stockflow-inventory-report-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredMovements = movements.filter((m) => {
    if (selectedType !== "ALL" && m.movementType !== selectedType) return false
    const q = search.toLowerCase()
    return (
      m.productName.toLowerCase().includes(q) ||
      (m.productSku || "").toLowerCase().includes(q) ||
      m.locationName.toLowerCase().includes(q) ||
      (m.referenceNumber || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Audit Reports & Valuation"
        description="Comprehensive movement ledger, cross-branch balance audits, and CSV reporting exports."
        breadcrumbs={[
          { label: "Management", href: "/admin/reports" },
          { label: "Reports & Valuation" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 shadow-2xs focus:outline-hidden"
            >
              <option value="ALL">All Supermarket Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadReportData}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              onClick={exportCSV}
              size="sm"
              className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV Ledger
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Consolidated Valuation"
            value={
              summary.totalValuation
                ? `₦${Number(summary.totalValuation).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "₦0.00"
            }
            subtitle="Current asset holding"
            icon={TrendingUp}
            iconColor="text-emerald-700"
          />

          <StatCard
            title="Total Stock Units"
            value={summary.totalStockUnits?.toLocaleString() || "0"}
            subtitle="Physical inventory on hand"
            icon={Package}
            iconColor="text-blue-600"
          />

          <StatCard
            title="Catalog SKUs"
            value={summary.totalProducts || 0}
            subtitle="Registered active products"
            icon={FileSpreadsheet}
            iconColor="text-indigo-600"
          />

          <StatCard
            title="Low Stock Items"
            value={summary.lowStockCount || 0}
            subtitle="Under safety stock buffer"
            icon={AlertTriangle}
            iconColor="text-amber-600"
          />
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by product, SKU, branch, or reference #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 shadow-2xs focus:outline-hidden"
          >
            <option value="ALL">All Movement Types</option>
            <option value="STOCK_IN">Stock-In (Receipts)</option>
            <option value="STOCK_OUT">Stock-Out (Deductions & Sales)</option>
            <option value="TRANSFER">Inter-Branch Transfers</option>
          </select>
        </div>
      </div>

      {/* Movements Audit Table (Desktop & Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-right">Balance Post-Tx</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Reason / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-700" />
                    Compiling report ledger...
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No movement records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {new Date(m.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <MovementTypeBadge type={m.movementType} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{m.productName}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {m.productSku || "SKU-N/A"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{m.locationName}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          m.movementType === "STOCK_IN"
                            ? "text-emerald-700"
                            : m.movementType === "STOCK_OUT"
                            ? "text-rose-600"
                            : "text-purple-700"
                        }
                      >
                        {m.movementType === "STOCK_IN"
                          ? `+${m.quantity}`
                          : m.movementType === "STOCK_OUT"
                          ? `-${m.quantity}`
                          : m.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {m.newQuantity !== undefined ? `${m.newQuantity} units` : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {m.referenceNumber || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                      {m.reason ? `${m.reason}: ` : ""}
                      {m.performedByName ? `(by ${m.performedByName})` : ""}
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
            <div className="py-8 text-center text-slate-400 text-xs">Compiling ledger...</div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No records found.</div>
          ) : (
            filteredMovements.map((m) => (
              <div key={m.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{m.productName}</h4>
                    <p className="text-[11px] text-slate-500">
                      {m.locationName} · {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <MovementTypeBadge type={m.movementType} />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="font-mono text-slate-500">
                    Ref: {m.referenceNumber || "Direct"}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      m.movementType === "STOCK_IN" ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {m.movementType === "STOCK_IN" ? `+${m.quantity}` : `-${m.quantity}`} units
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
