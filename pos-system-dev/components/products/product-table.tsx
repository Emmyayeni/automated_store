"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PackageSearch, Plus } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { formatPrice, formatDisplayDate } from "@/lib/standards/formatting"
import AddProductModal from "@/components/products/add-product-modal"
import QuickProductRegistration from "@/components/products/quick-product-registration"
import type { Product } from "@/lib/types"

interface ProductsTableProps {
  locationId?: string | null
}

export default function ProductsTable({ locationId }: ProductsTableProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const { canAddProducts, canRegisterProducts } = usePermissions()

  useEffect(() => {
    setSearch("") // Reset search when location changes
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  const fetchProducts = async (searchValue = "") => {
    setLoading(true)
    try {
      const params: string[] = []
      if (locationId) params.push(`locationId=${encodeURIComponent(locationId)}`)
      if (searchValue) params.push(`search=${encodeURIComponent(searchValue)}`)
      const query = params.length ? `?${params.join("&")}` : ""
      const res = await fetch(`/api/products${query}`)
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProducts(search)
  }

  const handleProductRegistered = () => {
    fetchProducts()
  }

  return (
    <div className="space-y-6">
      {locationId && canRegisterProducts() && (
        <QuickProductRegistration
          locationId={locationId}
          onProductRegistered={handleProductRegistered}
        />
      )}
      
      <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <PackageSearch className="h-5 w-5" />
          Products
        </CardTitle>
        {canAddProducts() && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Product
          </Button>
        )}
        {canAddProducts() && (
          <AddProductModal
            open={addOpen}
            onOpenChange={setAddOpen}
            onProductAdded={() => fetchProducts()}
            locationId={locationId}
          />
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <Input
            placeholder="Search by name, SKU, or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" disabled={loading}>
            Search
          </Button>
        </form>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">SKU</th>
                <th className="px-2 py-2 text-left">Barcode</th>
                <th className="px-2 py-2 text-right">Price</th>
                <th className="px-2 py-2 text-right">Stock</th>
                <th className="px-2 py-2 text-left">Category</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="px-2 py-2">{p.name}</td>
                    <td className="px-2 py-2">{p.sku}</td>
                    <td className="px-2 py-2">{p.barcode}</td>
                    <td className="px-2 py-2 text-right">{formatPrice(p.price)}</td>
                    <td className="px-2 py-2 text-right">{p.stockQuantity}</td>
                    <td className="px-2 py-2">{p.category ?? "-"}</td>
                    <td className="px-2 py-2">
                      {p.isActive ? (
                        <span className="text-green-600 font-medium">Active</span>
                      ) : (
                        <span className="text-gray-400">Inactive</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {p.createdAt
                        ? formatDisplayDate(p.createdAt)
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}