"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Layers,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Store,
  RefreshCw,
  ChevronRight,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/ui/stat-card"
import { PageHeader } from "@/components/ui/page-header"
import { MovementTypeBadge, StockStatusBadge } from "@/components/ui/status-badge"

export default function ManagerDashboard() {
  const { data: session } = useSession()
  const user = session?.user as any
  const locationId = user?.locationId || ""
  const branchName = user?.branchName || "Assigned Branch"

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>({
    totalProducts: 0,
    totalStockUnits: 0,
    totalValuation: 0,
    lowStockCount: 0,
  })
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([])
  const [lowStockItems, setLowStockItems] = useState<any[]>([])
  const [recentMovements, setRecentMovements] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const queryParam = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ""
      const [sumRes, trRes, lowRes, movRes] = await Promise.all([
        fetch(`/api/reports/inventory-summary${queryParam}`),
        fetch(`/api/transfers${queryParam}`),
        fetch(`/api/low-stock${queryParam}`),
        fetch(`/api/stock-movements${queryParam ? queryParam + "&limit=5" : "?limit=5"}`),
      ])

      if (sumRes.ok) setSummary(await sumRes.json())
      if (trRes.ok) {
        const trJson = await trRes.json()
        setPendingTransfers(
          (trJson || []).filter((t: any) => t.status === "REQUESTED" || t.status === "APPROVED")
        )
      }
      if (lowRes.ok) setLowStockItems(await lowRes.json())
      if (movRes.ok) setRecentMovements(await movRes.json())
    } catch (err) {
      console.error("Error loading manager dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [locationId])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${branchName} — Inventory Dashboard`}
        description="Branch-level stock balance tracking, transfer authorization, and replenishment monitoring."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs">
              <Link href="/admin/transfers">
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
                Review Transfers ({pendingTransfers.length})
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Branch Stock Units"
          value={summary.totalStockUnits?.toLocaleString() || "0"}
          subtitle="Available in this branch"
          icon={Layers}
          iconColor="text-emerald-700"
        />

        <StatCard
          title="Branch Inventory Value"
          value={
            summary.totalValuation
              ? `$${Number(summary.totalValuation).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "$0.00"
          }
          subtitle="Local holding valuation"
          icon={TrendingUp}
          iconColor="text-blue-600"
        />

        <StatCard
          title="Low Stock Alerts"
          value={summary.lowStockCount || lowStockItems.length || 0}
          subtitle="At or below branch reorder pt"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          badge={
            (summary.lowStockCount || lowStockItems.length || 0) > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Replenish
              </span>
            ) : undefined
          }
        />

        <StatCard
          title="Pending Transfers"
          value={pendingTransfers.length}
          subtitle="Awaiting authorization"
          icon={ArrowLeftRight}
          iconColor="text-purple-600"
          badge={
            pendingTransfers.length > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                Pending
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Two-Column Layout: Low Stock Items + Pending Transfers */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Low Stock Watchlist */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Low Stock Watchlist</h3>
              <p className="text-xs text-slate-500">Items requiring stock-in or transfer request</p>
            </div>
            <Link
              href="/admin/low-stock"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                All branch items are adequately stocked above reorder levels.
              </div>
            ) : (
              lowStockItems.slice(0, 4).map((item) => (
                <div
                  key={item.inventoryId || item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.productName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {item.productSku || "SKU-N/A"} · Reorder Pt: {item.reorderLevel} units
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-amber-700">{item.quantity} left</span>
                    <StockStatusBadge status={item.stockStatus || "LOW_STOCK"} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transfer Action Center */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Transfer Approvals</h3>
              <p className="text-xs text-slate-500">Incoming & outgoing requests</p>
            </div>
            <Link
              href="/admin/transfers"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
            >
              Open Transfers <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {pendingTransfers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No transfer requests currently pending approval.
              </div>
            ) : (
              pendingTransfers.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-800">{t.transferNumber}</span>
                    <p className="text-[11px] text-slate-500">
                      {t.sourceLocationName} → {t.destinationLocationName}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs font-medium">
                    <Link href={`/admin/transfers`}>Manage</Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
