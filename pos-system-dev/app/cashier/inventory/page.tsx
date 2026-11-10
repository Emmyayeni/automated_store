"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Search,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  Layers,
  Store,
  Tag,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { StockStatusBadge } from "@/components/ui/status-badge"

interface InventoryItem {
  id: string
  name: string
  sku: string
  barcode?: string
  category: string
  price: number
  stock: number
  reorderLevel: number
}

const safeParsePrice = (val: any): number => {
  if (typeof val === "number") return isNaN(val) ? 0 : val
  if (!val) return 0
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]+/g, "")
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export default function CashierInventoryPage() {
  const { data: session } = useSession()
  const locationId = session?.user?.locationId
  const storeName = (session?.user as any)?.store?.name || (session?.user as any)?.branchName || "Main Supermarket Branch"

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const url = locationId ? `/api/products?locationId=${locationId}` : `/api/products`
      let res = await fetch(url)
      if (!res.ok) {
        res = await fetch("/api/admin/products")
      }
      const data = await res.json()
      const rawList = Array.isArray(data) ? data : data.data || []

      setItems(
        rawList.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || p.barcode || "SKU-" + p.id.slice(0, 5),
          barcode: p.barcode || p.sku || "",
          category: p.category || "General",
          price: safeParsePrice(p.price ?? p.rawPrice),
          stock: typeof p.stock === "number" ? p.stock : (p.inventory?.[0]?.quantity ?? 25),
          reorderLevel: p.minStockLevel || p.reorderLevel || 10,
        }))
      )
    } catch (err) {
      console.error("Error fetching cashier inventory:", err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [locationId])

  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.category) set.add(i.category)
    })
    return ["ALL", ...Array.from(set)]
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.barcode && item.barcode.includes(searchQuery))
      const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [items, searchQuery, selectedCategory])

  const totalStockUnits = useMemo(() => {
    return items.reduce((acc, i) => acc + (i.stock || 0), 0)
  }, [items])

  const lowStockCount = useMemo(() => {
    return items.filter((i) => i.stock > 0 && i.stock <= i.reorderLevel).length
  }, [items])

  const outOfStockCount = useMemo(() => {
    return items.filter((i) => i.stock <= 0).length
  }, [items])

  return (
    <div className="space-y-6">
      {/* ───────────────── PAGE HEADER ───────────────── */}
      <PageHeader
        title="Branch Inventory & Price Lookup"
        description="Verify live supermarket stock balances, retail pricing, and shelf availability before checkout."
        actions={
          <div className="flex items-center gap-2">
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
              <Link href="/cashier">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to Register
              </Link>
            </Button>
          </div>
        }
      />

      {/* ───────────────── KPI STAT CARDS ───────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Catalog SKUs"
          value={items.length}
          subtitle={`Available at ${storeName}`}
          icon={Package}
          iconColor="text-emerald-700"
        />

        <StatCard
          title="Total Stock Units"
          value={totalStockUnits.toLocaleString()}
          subtitle="Shelf & backroom count"
          icon={Layers}
          iconColor="text-blue-600"
        />

        <StatCard
          title="Low Stock Watch"
          value={lowStockCount}
          subtitle="At or near reorder trigger"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          badge={
            lowStockCount > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Low
              </span>
            ) : undefined
          }
        />

        <StatCard
          title="Out of Stock"
          value={outOfStockCount}
          subtitle="Zero balance items"
          icon={XCircle}
          iconColor="text-rose-600"
        />
      </div>

      {/* ───────────────── INVENTORY LOOKUP TABLE ───────────────── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Store className="h-4 w-4 text-[#14532D]" />
              {storeName} Stock Directory
            </CardTitle>
            <div className="w-full sm:w-72 relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search product name, SKU, barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs border-slate-300"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-[#14532D] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">SKU / Barcode</th>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Retail Price</th>
                  <th className="py-2.5 px-4 text-center">Available Stock</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-700" />
                      Loading inventory...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const isOut = item.stock <= 0
                    const isLow = !isOut && item.stock <= item.reorderLevel

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {item.sku}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-medium">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-4 text-right font-extrabold text-[#14532D]">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`font-mono font-bold text-xs ${
                              isOut ? "text-rose-600" : isLow ? "text-amber-700" : "text-slate-800"
                            }`}
                          >
                            {item.stock} units
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isOut ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Out of Stock
                            </Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                              In Stock
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
