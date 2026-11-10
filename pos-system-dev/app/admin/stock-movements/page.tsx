"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { MovementBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Building2,
  FileSpreadsheet,
  Package,
  Layers,
  History,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { toast } from "sonner"

interface MovementItem {
  id: string
  productName: string
  productSku?: string
  quantity: number
  balanceBefore: number
  balanceAfter: number
  reason?: string
  reference?: string
  notes?: string
  createdAt: string
  locationName: string
  movementType: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "TRANSFER_IN" | "TRANSFER_OUT"
}

interface Branch {
  id: string
  name: string
  branchCode?: string
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<MovementItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [selectedType, setSelectedType] = useState("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchData = async () => {
    try {
      setLoading(true)
      const [movRes, branchRes] = await Promise.all([
        fetch(`/api/stock-movements?limit=100${selectedBranch !== "all" ? `&locationId=${selectedBranch}` : ""}`),
        fetch("/api/locations"),
      ])

      if (movRes.ok) {
        const movData = await movRes.json()
        setMovements(Array.isArray(movData) ? movData : [])
      }

      if (branchRes.ok) {
        const branchData = await branchRes.json()
        setBranches(Array.isArray(branchData) ? branchData : branchData.data || [])
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load stock movements")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedBranch])

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Type filter
      if (selectedType !== "ALL" && m.movementType !== selectedType) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = m.productName?.toLowerCase().includes(q)
        const matchSku = m.productSku?.toLowerCase().includes(q)
        const matchRef = m.reference?.toLowerCase().includes(q)
        const matchNotes = m.notes?.toLowerCase().includes(q)
        const matchLoc = m.locationName?.toLowerCase().includes(q)
        if (!matchName && !matchSku && !matchRef && !matchNotes && !matchLoc) {
          return false
        }
      }

      return true
    })
  }, [movements, selectedType, searchQuery])

  // KPIs
  const totalStockIn = useMemo(() => {
    return movements
      .filter((m) => m.movementType === "STOCK_IN" || m.movementType === "TRANSFER_IN")
      .reduce((sum, m) => sum + (m.quantity || 0), 0)
  }, [movements])

  const totalStockOut = useMemo(() => {
    return movements
      .filter((m) => m.movementType === "STOCK_OUT" || m.movementType === "TRANSFER_OUT")
      .reduce((sum, m) => sum + (m.quantity || 0), 0)
  }, [movements])

  const totalTransfers = useMemo(() => {
    return movements.filter(
      (m) => m.movementType === "TRANSFER_IN" || m.movementType === "TRANSFER_OUT"
    ).length
  }, [movements])

  // CSV Export
  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      toast.error("No movement records to export")
      return
    }

    const headers = [
      "Date",
      "Branch",
      "Product Name",
      "SKU",
      "Movement Type",
      "Quantity",
      "Balance Before",
      "Balance After",
      "Reason",
      "Reference",
      "Notes",
    ]

    const csvRows = filteredMovements.map((m) => [
      new Date(m.createdAt).toLocaleString(),
      `"${m.locationName || ""}"`,
      `"${m.productName || ""}"`,
      `"${m.productSku || ""}"`,
      m.movementType,
      m.quantity,
      m.balanceBefore,
      m.balanceAfter,
      `"${m.reason || ""}"`,
      `"${m.reference || ""}"`,
      `"${m.notes || ""}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `stock_movements_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Stock movement log exported to CSV")
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements & Audit Ledger"
        description="Complete chronological trace of all inventory transactions, receiving, dispatch, and branch transfers."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Stock Movements" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredMovements.length === 0}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </Button>
            <Link href="/admin/stock-in">
              <Button size="sm" className="bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs">
                <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
                Stock-In
              </Button>
            </Link>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Units Received (In)"
          value={`+${totalStockIn.toLocaleString()}`}
          description="Received via stock-in & transfers"
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Units Issued (Out)"
          value={`-${totalStockOut.toLocaleString()}`}
          description="Dispatched via sales & deductions"
          icon={<TrendingDown className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Inter-Branch Movements"
          value={totalTransfers}
          description="Transfers across locations"
          icon={<ArrowLeftRight className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Audit Ledger Events"
          value={movements.length}
          description="Total recorded movements"
          icon={<History className="h-5 w-5 text-slate-600" />}
        />
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search SKU, product, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
              />
            </div>

            {/* Branch & Type Selectors */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-44">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="h-9 text-xs border-slate-200">
                    <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Movement Type Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                {["ALL", "STOCK_IN", "STOCK_OUT", "TRANSFER_IN", "TRANSFER_OUT"].map((type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                    className={`h-8 px-2.5 text-[11px] font-semibold transition-all ${
                      selectedType === type
                        ? "bg-[#14532D] text-white hover:bg-[#14532D]/90"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {type === "ALL" ? "All Events" : type.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Movement Records</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Showing {filteredMovements.length} audit entries
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mb-2" />
              <span>Loading movement ledger...</span>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <History className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">No stock movements found</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {searchQuery || selectedType !== "ALL" || selectedBranch !== "all"
                  ? "No transactions match your active filters. Try clearing your search."
                  : "All stock-in, stock-out, and transfers will be logged here automatically."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Timestamp</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Branch</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Product / SKU</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3 text-center">Movement Type</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3 text-right">Quantity</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3 text-center">Balance Transition</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Reason / Ref</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((m) => {
                    const isPositive = m.movementType === "STOCK_IN" || m.movementType === "TRANSFER_IN"
                    return (
                      <TableRow key={m.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        <TableCell className="text-xs text-slate-600 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                            <span className="text-slate-400 text-[11px]">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-slate-800 font-medium py-3.5">
                          <Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50">
                            {m.locationName || "Central Warehouse"}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <div>
                            <span className="font-semibold text-xs text-slate-900 block leading-tight">
                              {m.productName}
                            </span>
                            {m.productSku && (
                              <span className="text-[10px] text-slate-500 font-mono block leading-tight">
                                SKU: {m.productSku}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center py-3.5">
                          <MovementBadge type={m.movementType} />
                        </TableCell>

                        <TableCell className="text-right py-3.5 font-mono text-xs">
                          <span
                            className={`font-bold ${
                              isPositive ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </TableCell>

                        <TableCell className="text-center py-3.5">
                          <div className="inline-flex items-center gap-1.5 text-xs font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                            <span className="text-slate-500">{m.balanceBefore}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-slate-900">{m.balanceAfter}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs py-3.5">
                          <div>
                            {m.reason && (
                              <span className="font-medium text-slate-800 block text-[11px]">
                                {m.reason.replace("_", " ")}
                              </span>
                            )}
                            {m.reference ? (
                              <span className="text-[10px] text-emerald-800 font-mono bg-emerald-50 px-1 rounded">
                                Ref: {m.reference}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">No ref</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-slate-500 max-w-xs truncate py-3.5">
                          {m.notes || <span className="text-slate-400 italic">—</span>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
