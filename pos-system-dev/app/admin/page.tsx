"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Layers,
  Building2,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Clock,
  CheckCircle2,
  Store,
  ChevronRight,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { PageHeader } from "@/components/ui/page-header"
import { MovementTypeBadge, StockStatusBadge } from "@/components/ui/status-badge"

interface SummaryData {
  totalProducts: number
  totalStockUnits: number
  totalValuation: number
  lowStockCount: number
  outOfStockCount: number
  byBranch?: Array<{
    branchId: string
    branchName: string
    units: number
    lowStock: number
  }>
}

interface RecentMovement {
  id: string
  movementType: string
  quantity: number
  productName: string
  productSku?: string
  locationName: string
  referenceNumber?: string
  reason?: string
  notes?: string
  createdAt: string
  performedByName?: string
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryData>({
    totalProducts: 0,
    totalStockUnits: 0,
    totalValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  })
  const [pendingTransfersCount, setPendingTransfersCount] = useState<number>(0)
  const [branchesCount, setBranchesCount] = useState<number>(3)
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL")
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch summary metrics
      const sumUrl =
        selectedBranchId !== "ALL"
          ? `/api/reports/inventory-summary?locationId=${selectedBranchId}`
          : `/api/reports/inventory-summary`
      const sumRes = await fetch(sumUrl)
      if (sumRes.ok) {
        const sumJson = await sumRes.json()
        setSummary(sumJson)
      }

      // 2. Fetch pending transfers
      const trRes = await fetch(`/api/transfers`)
      if (trRes.ok) {
        const trJson = await trRes.json()
        const pending = (trJson || []).filter(
          (t: any) => t.status === "REQUESTED" || t.status === "APPROVED" || t.status === "IN_TRANSIT"
        )
        setPendingTransfersCount(pending.length)
      }

      // 3. Fetch branches
      let locRes = await fetch(`/api/admin/locations`)
      if (!locRes.ok) {
        locRes = await fetch(`/api/locations`)
      }
      if (locRes.ok) {
        const locJson = await locRes.json()
        const branchList = locJson?.data || locJson || []
        setBranches(branchList)
        setBranchesCount(branchList.length || 3)
      }

      // 4. Fetch recent movements
      const movUrl =
        selectedBranchId !== "ALL"
          ? `/api/stock-movements?locationId=${selectedBranchId}&limit=6`
          : `/api/stock-movements?limit=6`
      const movRes = await fetch(movUrl)
      if (movRes.ok) {
        const movJson = await movRes.json()
        setRecentMovements(movJson || [])
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedBranchId])

  return (
    <div className="space-y-6">
      {/* ───────────────── PAGE HEADER ───────────────── */}
      <PageHeader
        title="Supermarket Inventory Overview"
        description="Real-time multi-branch stock levels, valuation, transfer tracking, and transaction ledgers."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
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
              onClick={loadData}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              asChild
              size="sm"
              className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white font-medium text-xs px-3.5"
            >
              <Link href="/admin/stock-in" className="flex items-center gap-1.5">
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span>Receive Stock</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* ───────────────── 5 KEY METRIC STAT CARDS ───────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Valuation"
          value={
            summary.totalValuation
              ? `$${Number(summary.totalValuation).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "$0.00"
          }
          subtitle="Consolidated asset value"
          icon={TrendingUp}
          iconColor="text-emerald-700"
        />

        <StatCard
          title="Stock In Hand"
          value={summary.totalStockUnits?.toLocaleString() || "0"}
          subtitle="Physical units across branches"
          icon={Layers}
          iconColor="text-blue-600"
        />

        <StatCard
          title="Active SKUs"
          value={summary.totalProducts || 0}
          subtitle="Catalog product lines"
          icon={Package}
          iconColor="text-indigo-600"
        />

        <StatCard
          title="Pending Transfers"
          value={pendingTransfersCount}
          subtitle="Awaiting action / In-Transit"
          icon={ArrowLeftRight}
          iconColor="text-purple-600"
          badge={
            pendingTransfersCount > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Active
              </span>
            ) : undefined
          }
        />

        <StatCard
          title="Low Stock Alerts"
          value={summary.lowStockCount || 0}
          subtitle="At or below reorder pt"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          badge={
            (summary.lowStockCount || 0) > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Action Req.
              </span>
            ) : undefined
          }
        />
      </div>

      {/* ───────────────── QUICK ACTION BAR ───────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/admin/stock-in"
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-600/50 hover:shadow-xs transition-all flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
            <ArrowDownToLine className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">Record Stock-In</div>
            <div className="text-[11px] text-slate-500 truncate">Receive supplier shipment</div>
          </div>
        </Link>

        <Link
          href="/admin/stock-out"
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-rose-600/50 hover:shadow-xs transition-all flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-center shrink-0">
            <ArrowUpFromLine className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">Record Stock-Out</div>
            <div className="text-[11px] text-slate-500 truncate">Damaged, expired, recount</div>
          </div>
        </Link>

        <Link
          href="/admin/transfers"
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-purple-600/50 hover:shadow-xs transition-all flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">Inter-Branch Transfer</div>
            <div className="text-[11px] text-slate-500 truncate">Request or approve dispatch</div>
          </div>
        </Link>

        <Link
          href="/admin/reports"
          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-600/50 hover:shadow-xs transition-all flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center shrink-0">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">Inventory Ledger</div>
            <div className="text-[11px] text-slate-500 truncate">Audit reports & CSV exports</div>
          </div>
        </Link>
      </div>

      {/* ───────────────── RECENT STOCK MOVEMENTS LEDGER ───────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Stock Movements</h2>
            <p className="text-xs text-slate-500">Live immutable transaction audit ledger</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs text-emerald-800 hover:text-emerald-950">
            <Link href="/admin/reports">
              View All Movements <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">Branch</th>
                <th className="py-2.5 px-4">Quantity</th>
                <th className="py-2.5 px-4 hidden sm:table-cell">Reference</th>
                <th className="py-2.5 px-4 hidden md:table-cell">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No recent stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                recentMovements.map((m) => (
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
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {m.productName}
                      {m.productSku && (
                        <span className="block font-mono text-[10px] text-slate-400 font-normal">
                          {m.productSku}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{m.locationName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
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
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] hidden sm:table-cell">
                      {m.referenceNumber || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs hidden md:table-cell">
                      {m.reason ? `${m.reason}: ` : ""}
                      {m.notes || "Standard operation"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
