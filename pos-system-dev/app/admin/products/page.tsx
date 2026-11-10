"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Trash2,
  Edit,
  ArrowDownToLine,
  TrendingUp,
  Tag
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ProductItem {
  id: string
  name: string
  sku: string
  price: number | string
  category?: string
  description?: string
  barcode?: string
  stock?: number
  isActive?: boolean
}

export default function ProductsPage() {
  const { data: session } = useSession()
  const businessId = (session?.user as any)?.businessId

  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    "Groceries",
    "Beverages",
    "Bakery",
    "Dairy & Eggs",
    "Produce",
    "Meat & Seafood",
    "Snacks & Confectionery",
    "Household & Cleaning",
    "Personal Care",
  ])

  // Add Product Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "Groceries",
    price: "",
    costPrice: "",
    reorderLevel: "10",
    description: "",
  })

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProduct.name.trim() || !newProduct.price) {
      toast.error("Product name and selling price are required")
      return
    }

    setSubmitting(true)
    try {
      const sku = newProduct.sku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`
      const barcode = newProduct.barcode.trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct.name.trim(),
          sku,
          barcode,
          category: newProduct.category || "Groceries",
          price: parseFloat(newProduct.price),
          costPrice: newProduct.costPrice ? parseFloat(newProduct.costPrice) : undefined,
          reorderLevel: parseInt(newProduct.reorderLevel) || 10,
          description: newProduct.description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to create product")
        return
      }

      toast.success(`Product "${newProduct.name}" registered in catalog!`)
      setDialogOpen(false)
      setNewProduct({
        name: "",
        sku: "",
        barcode: "",
        category: "Groceries",
        price: "",
        costPrice: "",
        reorderLevel: "10",
        description: "",
      })
      fetchProducts()
    } catch {
      toast.error("Network error creating product")
    } finally {
      setSubmitting(false)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      let res = await fetch("/api/admin/products")
      if (!res.ok) {
        res = await fetch("/api/products")
      }
      if (res.ok) {
        const json = await res.json()
        const list = Array.isArray(json) ? json : json.data || []
        setProducts(list)
      }
    } catch (err) {
      console.error("Failed to fetch products:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((c: any) => c.name)
          setAvailableCategories((prev) => Array.from(new Set([...prev, ...names])))
        }
      })
      .catch(() => {})
  }, [])

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[]

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false
    const q = searchTerm.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    )
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the product catalog?`)) {
      return
    }
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Failed to delete product")
        return
      }
      toast.success("Product removed")
      setProducts(products.filter((p) => p.id !== id))
    } catch {
      toast.error("Network error deleting product")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Catalog & Master SKUs"
        description="Centralized product master registry for all supermarket branches. Defines product pricing, categories, and SKU barcodes."
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Products Catalog" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProducts}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Register New SKU
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 text-xs font-semibold border-slate-300">
              <Link href="/admin/inventory">
                <Package className="h-3.5 w-3.5 mr-1.5" />
                Stock Balances
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Registered SKUs"
          value={products.length}
          subtitle="Catalog items across supermarket"
          icon={Package}
          iconColor="text-emerald-700"
        />

        <StatCard
          title="Categories"
          value={categories.length || 5}
          subtitle="Organized product departments"
          icon={Tag}
          iconColor="text-blue-600"
        />

        <StatCard
          title="Average Unit Price"
          value={
            products.length > 0
              ? `$${(
                  products.reduce((acc, p) => acc + (Number(p.price) || 0), 0) / products.length
                ).toFixed(2)}`
              : "$0.00"
          }
          subtitle="Across catalog inventory"
          icon={TrendingUp}
          iconColor="text-indigo-600"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by SKU, product name, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 shadow-2xs focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-700" />
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.sku}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {p.name}
                      {p.description && (
                        <span className="block text-[11px] text-slate-400 font-normal truncate max-w-sm">
                          {p.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {p.category || "General"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${Number(p.price || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-emerald-800">
                          <Link href={`/admin/stock-in?productId=${p.id}`}>
                            <ArrowDownToLine className="h-3 w-3 mr-1" />
                            Stock In
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
            <div className="py-8 text-center text-slate-400 text-xs">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No products found.</div>
          ) : (
            filteredProducts.map((p) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                    <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                    <span className="text-[11px] text-slate-500">{p.category || "General"}</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-slate-900">
                    ${Number(p.price || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-emerald-700 font-semibold text-[11px]">✓ Active Catalog</span>
                  <Button asChild size="sm" variant="outline" className="h-6 px-2 text-[10px]">
                    <Link href={`/admin/stock-in?productId=${p.id}`}>+ Receive Stock</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ───────────────── REGISTER SKU DIALOG ───────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <form onSubmit={handleCreateProduct}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Register New Supermarket SKU
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Add a product to the central supermarket catalog. Once registered, stock can be received across any branch.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4 text-xs">
              <div>
                <Label htmlFor="prod-name" className="text-xs font-semibold text-slate-700">
                  Product Name *
                </Label>
                <Input
                  id="prod-name"
                  placeholder="e.g., Highland Whole Milk 1L"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prod-sku" className="text-xs font-semibold text-slate-700">
                    SKU Code (optional)
                  </Label>
                  <Input
                    id="prod-sku"
                    placeholder="Auto-generated if empty"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="prod-barcode" className="text-xs font-semibold text-slate-700">
                    Barcode (EAN/UPC)
                  </Label>
                  <Input
                    id="prod-barcode"
                    placeholder="Auto-generated if empty"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prod-cat" className="text-xs font-semibold text-slate-700">
                    Category
                  </Label>
                  <select
                    id="prod-cat"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="mt-1 w-full h-9 px-3 rounded-md border border-slate-300 text-xs text-slate-800 bg-white"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="prod-reorder" className="text-xs font-semibold text-slate-700">
                    Reorder Threshold
                  </Label>
                  <Input
                    id="prod-reorder"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={newProduct.reorderLevel}
                    onChange={(e) => setNewProduct({ ...newProduct, reorderLevel: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prod-price" className="text-xs font-semibold text-slate-700">
                    Selling Price ($) *
                  </Label>
                  <Input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="9.99"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="prod-cost" className="text-xs font-semibold text-slate-700">
                    Cost Price ($)
                  </Label>
                  <Input
                    id="prod-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="6.50"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="prod-desc" className="text-xs font-semibold text-slate-700">
                  Description
                </Label>
                <Input
                  id="prod-desc"
                  placeholder="Brand, package size, or notes"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="h-9 text-xs border-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-semibold"
              >
                {submitting ? "Registering..." : "Add to Catalog"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
