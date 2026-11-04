"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, TrendingUp, TrendingDown } from "lucide-react"
import type { Product } from "@/lib/types"
import { formatDisplayDateTime } from "@/lib/standards/formatting"

export default function StockAdjustments() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const locationId = session?.user?.locationId

  const [adjustments, setAdjustments] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showAddAdjustment, setShowAddAdjustment] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState("")
  const [adjustmentType, setAdjustmentType] = useState("add")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (locationId) {
      fetchAdjustments()
      fetchProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  // Use GET for adjustments fetch with locationId as query param
  const fetchAdjustments = async () => {
    if (!locationId) return
    try {
      const response = await fetch(`/api/inventory/adjustments?locationId=${encodeURIComponent(locationId)}`)
      const data = await response.json()
      setAdjustments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching adjustments:", error)
      setAdjustments([])
    }
  }

  const fetchProducts = async () => {
    if (!locationId) return
    try {
      // Fetch products for this location only (join location_inventory and products)
      const response = await fetch(`/api/products?locationId=${encodeURIComponent(locationId)}`)
      const data = await response.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
    }
  }

  const handleAddAdjustment = async () => {
    if (!selectedProduct || !quantity || !userId || !locationId) return

    setLoading(true)
    try {
      const response = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          userId,
          locationId,
          adjustmentType,
          quantityChange: Number.parseInt(quantity),
          reason,
        }),
      })

      if (response.ok) {
        fetchAdjustments()
        setSelectedProduct("")
        setQuantity("")
        setReason("")
        setShowAddAdjustment(false)
      }
    } catch (error) {
      console.error("Error creating adjustment:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!userId || !locationId) {
    return (
      <div className="text-center text-gray-500 py-8">
        Please sign in and select a store location to manage stock adjustments.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Stock Adjustments</h2>
        <Dialog open={showAddAdjustment} onOpenChange={setShowAddAdjustment}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Stock Adjustment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="product">Product</Label>
                <select
                  id="product"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (SKU: {product.sku}) - Current: {product.stockQuantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="adjustment-type">Adjustment Type</Label>
                <select
                  id="adjustment-type"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="add">Add Stock</option>
                  <option value="remove">Remove Stock</option>
                  <option value="set">Set Stock Level</option>
                </select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for adjustment..."
                />
              </div>

              <Button onClick={handleAddAdjustment} disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Adjustment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {(Array.isArray(adjustments) ? adjustments : []).map((adjustment) => (
          <Card key={adjustment.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gray-100">
                    {adjustment.adjustmentType === "add" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{adjustment.productName}</h3>
                    <p className="text-sm text-gray-500">SKU: {adjustment.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {adjustment.adjustmentType === "add" ? "+" : adjustment.adjustmentType === "remove" ? "-" : ""}
                    {adjustment.quantityChange}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{adjustment.adjustmentType}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-gray-600">{adjustment.reason}</p>
                <p className="text-xs text-gray-500 mt-1">
                  By {adjustment.userName} on {formatDisplayDateTime(adjustment.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}