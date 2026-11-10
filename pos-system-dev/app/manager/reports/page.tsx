"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Package,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"

export default function ManagerReportsPage() {
  const { data: session, status } = useSession()
  const sessionUser = (session as any)?.user
  const [locationId, setLocationId] = useState<string>(sessionUser?.locationId || "")
  const [branchName, setBranchName] = useState<string>(
    sessionUser?.store?.name || sessionUser?.branchName || "Assigned Supermarket Branch"
  )

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Resolve locationId if not yet populated
  useEffect(() => {
    if (sessionUser?.locationId) {
      setLocationId(sessionUser.locationId)
    } else {
      fetch("/api/locations")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLocationId(data[0].id)
            setBranchName(data[0].name)
          }
        })
        .catch(() => {})
    }
  }, [sessionUser])

  const fetchReportData = useCallback(async () => {
    if (!locationId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        locationId,
      })
      const response = await fetch(`/api/reports/sales?${params.toString()}`)
      const data = await response.json()
      if (data && !data.error) {
        setReportData(data)
      } else {
        setReportData(null)
      }
    } catch {
      toast.error("Failed to fetch branch sales report")
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, locationId])

  useEffect(() => {
    if (locationId) {
      fetchReportData()
    }
  }, [fetchReportData, locationId])

  const setPresetRange = (days: number) => {
    const end = new Date()
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setEndDate(end.toISOString().split("T")[0])
    setStartDate(start.toISOString().split("T")[0])
  }

  const exportToCSV = () => {
    if (!reportData) return

    const csvData = [
      ["Date", "Transactions", "Total Sales", "Tax", "Average Sale"],
      ...(reportData.dailySales || []).map((day: any) => [
        day.date,
        day.transactionCount,
        day.totalSales,
        day.totalTax,
        day.averageSale,
      ]),
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `branch-sales-${branchName.replace(/\s+/g, "-").toLowerCase()}-${startDate}-to-${endDate}.csv`
    a.click()
    toast.success("Sales CSV exported successfully!")
  }

  const totalRev = Number.parseFloat(reportData?.summary?.total_revenue || 0)
  const totalTxns = Number(reportData?.summary?.total_transactions || 0)
  const avgTicket = Number.parseFloat(reportData?.summary?.average_transaction || 0)
  const totalTax = Number.parseFloat(reportData?.summary?.total_tax || 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${branchName} — Sales & Revenue Report`}
        description="Daily sales auditing, cashier transaction volumes, top-moving SKUs, and payment tender reconciliation."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReportData}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={exportToCSV}
              disabled={!reportData || loading}
              className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs shadow-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Date Filter Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-[11px] font-semibold text-slate-600">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-[11px] font-semibold text-slate-600">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <Button
                size="sm"
                onClick={fetchReportData}
                disabled={loading}
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white mt-auto"
              >
                Apply Range
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Quick Filters:</span>
              <button
                type="button"
                onClick={() => setPresetRange(0)}
                className="px-2 py-1 text-[11px] rounded font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setPresetRange(7)}
                className="px-2 py-1 text-[11px] rounded font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setPresetRange(30)}
                className="px-2 py-1 text-[11px] rounded font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Last 30 Days
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={`$${totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="All completed transactions"
          icon={DollarSign}
          iconColor="text-emerald-700"
        />
        <StatCard
          title="Total Completed Orders"
          value={totalTxns}
          subtitle="Cash register checkouts"
          icon={ShoppingCart}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Average Basket Size"
          value={`$${avgTicket.toFixed(2)}`}
          subtitle="Average revenue per ticket"
          icon={TrendingUp}
          iconColor="text-purple-600"
        />
        <StatCard
          title="Tax Collected"
          value={`$${totalTax.toFixed(2)}`}
          subtitle="Recorded sales tax liability"
          icon={BarChart3}
          iconColor="text-amber-600"
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#14532D] border-t-transparent" />
            <p className="text-xs text-slate-500">Calculating branch transaction metrics...</p>
          </div>
        </div>
      ) : reportData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Sales Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#14532D]" />
                    Daily Sales Timeline
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-slate-100">
                    {(reportData.dailySales || []).length} Business Days
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {(reportData.dailySales || []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No sales recorded in selected timeframe.
                    </div>
                  ) : (
                    (reportData.dailySales || []).map((day: any) => (
                      <div
                        key={day.date}
                        className="p-3.5 hover:bg-slate-50/80 flex items-center justify-between transition-colors text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {new Date(day.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {day.transactionCount} register transactions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 font-mono text-sm">
                            ${Number(day.totalSales || 0).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Avg: ${Number(day.averageSale || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Selling Products */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-[#14532D]" />
                    Top Performing Products
                  </span>
                  <span className="text-xs text-slate-400 font-normal">By volume sold</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                  {(reportData.topProducts || []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No product sales recorded in selected timeframe.
                    </div>
                  ) : (
                    (reportData.topProducts || []).map((prod: any, idx: number) => (
                      <div
                        key={prod.sku || idx}
                        className="p-3 hover:bg-slate-50/80 flex items-center justify-between transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{prod.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">SKU: {prod.sku || "N/A"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 font-mono">
                            ${Number(prod.totalRevenue || 0).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {prod.totalQuantity} units sold
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Distribution */}
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#14532D]" />
                  Payment Tenders
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Cash vs electronic settlement totals.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {(reportData.paymentMethods || []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No tender data recorded.</p>
                ) : (
                  (reportData.paymentMethods || []).map((method: any) => {
                    const isCash = method.method?.toLowerCase() === "cash"
                    const isCard = method.method?.toLowerCase() === "card"
                    const percent = totalRev > 0 ? ((Number(method.totalAmount) / totalRev) * 100).toFixed(1) : "0"

                    return (
                      <div key={method.method} className="p-3 border border-slate-200 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isCash ? (
                              <Banknote className="h-4 w-4 text-emerald-600" />
                            ) : isCard ? (
                              <CreditCard className="h-4 w-4 text-blue-600" />
                            ) : (
                              <QrCode className="h-4 w-4 text-purple-600" />
                            )}
                            <span className="text-xs font-semibold capitalize text-slate-800">
                              {method.method}
                            </span>
                          </div>
                          <span className="text-xs font-bold font-mono text-slate-900">
                            ${Number(method.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{method.transactionCount} transactions</span>
                          <span className="font-semibold text-slate-700">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#14532D] h-full rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Shift Audit Quick Link */}
            <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-[#14532D] text-white flex items-center justify-center">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Valuation & Stock Movement</h4>
                    <p className="text-[11px] text-emerald-800">Audit stock-ins, transfers, and warehouse valuation</p>
                  </div>
                </div>
                <Button asChild size="sm" className="w-full h-8 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs mt-2">
                  <a href="/admin/reports">
                    View Inventory Valuation Report
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="border-slate-200 p-8 text-center text-xs text-slate-500">
          No data available for the selected dates.
        </Card>
      )}
    </div>
  )
}
