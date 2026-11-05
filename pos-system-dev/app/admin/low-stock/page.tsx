"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  AlertTriangle,
  PackageX,
  RefreshCw,
  Building2,
  ArrowDownToLine,
  ArrowLeftRight,
  Package,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { StockStatusBadge } from "@/components/ui/status-badge"

interface LowStockItem {
  id: string
  locationId: string
  productId: string
  quantity: number
  reorderLevel: number
  stockStatus: string
  productName: string
  productSku?: string | null
  locationName: string
}

export default function LowStockPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [items, setItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL")

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const params = selectedBranch !== "ALL" ? `?locationId=${selectedBranch}` : ""
      const res = await fetch(`/api/low-stock${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error("Failed to load low-stock items:", err)
    } finally {
      setLoading(false)
    }
  }

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
        console.error("Error loading branches in low-stock:", e)
      }
    }
    loadBranches()
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [selectedBranch])

  const outOfStock = items.filter((i) => i.stockStatus === "OUT_OF_STOCK")
  const lowStock = items.filter((i) => i.stockStatus === "LOW_STOCK")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low-Stock & Reorder Alerts"
        description="Automated inventory monitoring alerts when physical stock levels fall to or below the branch reorder threshold."
        breadcrumbs={[
          { label: "Operations", href: "/admin/transfers" },
          { label: "Low Stock Alerts" },
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
              onClick={fetchAlerts}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Reorder Alerts"
          value={items.length}
          subtitle="Require procurement or transfer"
          icon={AlertTriangle}
          iconColor="text-amber-600"
        />

        <StatCard
          title="Out of Stock (Zero Balance)"
          value={outOfStock.length}
          subtitle="Immediate stockout risk"
          icon={PackageX}
          iconColor="text-rose-600"
          badge={
            outOfStock.length > 0 ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Critical
              </span>
            ) : undefined
          }
        />

        <StatCard
          title="Low Stock Buffer"
          value={lowStock.length}
          subtitle="Nearing depletion threshold"
          icon={AlertTriangle}
          iconColor="text-amber-600"
        />
      </div>

      {/* Alerts Table & Mobile List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Branch Location</th>
                <th className="py-3 px-4 text-right">Available Balance</th>
                <th className="py-3 px-4 text-right">Reorder Threshold</th>
                <th className="py-3 px-4">Severity Status</th>
                <th className="py-3 px-4 text-right">Replenishment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-700" />
                    Scanning branch inventory...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="font-bold text-slate-900">All Shelves Sufficiently Stocked</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No products are currently at or below their branch reorder level.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {item.productSku || "SKU-N/A"}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.productName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {item.locationName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                      {item.quantity} units
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {item.reorderLevel} units
                    </td>
                    <td className="py-3 px-4">
                      <StockStatusBadge status={item.stockStatus} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          size="sm"
                          className="h-7 text-xs bg-[#14532D] hover:bg-[#0f3e22] text-white"
                        >
                          <Link
                            href={`/admin/stock-in?productId=${item.productId}&locationId=${item.locationId}`}
                          >
                            <ArrowDownToLine className="h-3 w-3 mr-1" />
                            Stock-In
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-slate-300"
                        >
                          <Link href={`/admin/transfers`}>
                            <ArrowLeftRight className="h-3 w-3 mr-1" />
                            Transfer
                          </Link>
                        </Button>
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
            <div className="py-8 text-center text-slate-400 text-xs">Scanning inventory...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
              All products sufficiently stocked.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400">{item.productSku}</span>
                    <h4 className="text-xs font-bold text-slate-900">{item.productName}</h4>
                    <p className="text-[11px] text-slate-500">{item.locationName}</p>
                  </div>
                  <StockStatusBadge status={item.stockStatus} />
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-rose-700 font-bold">
                    Balance: {item.quantity} / Min: {item.reorderLevel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button asChild size="sm" className="h-6 px-2 text-[10px] bg-[#14532D] text-white">
                      <Link
                        href={`/admin/stock-in?productId=${item.productId}&locationId=${item.locationId}`}
                      >
                        + Stock-In
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
