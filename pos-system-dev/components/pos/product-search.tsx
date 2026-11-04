"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Package } from "lucide-react"
import { formatPrice } from "@/lib/standards/formatting"
import type { Product } from "@/lib/types"

interface ProductUOM {
  id: string;
  uomId: string;
  uomCode: string;
  uomName: string;
  uomAbbreviation: string;
  conversionFactor: number;
  pricePerUnit?: number;
  isBaseUom: boolean;
  isSellingUom: boolean;
}

interface ProductWithUOMs extends Product {
  availableUOMs?: ProductUOM[];
  selectedUOM?: ProductUOM;
  selectedQuantity?: number;
}

interface ProductSearchProps {
  onProductSelect: (product: ProductWithUOMs, quantity: number, uomId: string) => void
  locationId: string
}

export default function ProductSearch({ onProductSelect, locationId }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [products, setProducts] = useState<ProductWithUOMs[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      if (searchTerm.length < 2) {
        setProducts([])
        return
      }

      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append("search", searchTerm)
        params.append("includeUOMs", "true") // Request UOM information
        if (locationId) params.append("locationId", locationId)
        
        const response = await fetch(`/api/products?${params.toString()}`)
        const data = await response.json()
        
        // Set default selected UOM to first selling UOM for each product
        const productsWithDefaults = data.map((product: ProductWithUOMs) => ({
          ...product,
          selectedUOM: product.availableUOMs?.find(uom => uom.isSellingUom) || product.availableUOMs?.[0],
          selectedQuantity: 1,
        }))
        
        setProducts(productsWithDefaults)
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchProducts, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm, locationId])

  const handleUOMChange = (productId: string, uomId: string) => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        const selectedUOM = product.availableUOMs?.find(uom => uom.uomId === uomId)
        return { ...product, selectedUOM }
      }
      return product
    }))
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        return { ...product, selectedQuantity: Math.max(1, quantity) }
      }
      return product
    }))
  }

  const calculateDisplayPrice = (product: ProductWithUOMs): number => {
    if (product.selectedUOM?.pricePerUnit) {
      return product.selectedUOM.pricePerUnit
    }
    
    // Calculate price based on conversion factor
    const basePrice = parseFloat(product.price.toString())
    const conversionFactor = product.selectedUOM?.conversionFactor || 1
    return basePrice * conversionFactor
  }

  const getStockDisplay = (product: ProductWithUOMs): string => {
    if (!product.selectedUOM) {
      return `${product.stockQuantity} units`
    }
    
    // Convert base stock to selected UOM
    const baseStock = product.stockQuantity || 0
    const uomStock = Math.floor(baseStock / product.selectedUOM.conversionFactor)
    return `${uomStock} ${product.selectedUOM.uomAbbreviation}`
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search products by name, SKU, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {products.map((product) => {
            const displayPrice = calculateDisplayPrice(product)
            const stockDisplay = getStockDisplay(product)
            const isOutOfStock = (product.stockQuantity || 0) === 0
            
            return (
              <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Product Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                        {product.drugType && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {product.drugType}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* UOM Selection */}
                    {product.availableUOMs && product.availableUOMs.length > 1 && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700">Unit:</label>
                        <Select
                          value={product.selectedUOM?.uomId || ""}
                          onValueChange={(value) => handleUOMChange(product.id, value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {product.availableUOMs
                              .filter(uom => uom.isSellingUom)
                              .map((uom) => (
                                <SelectItem key={uom.uomId} value={uom.uomId}>
                                  <div className="flex items-center gap-2">
                                    <Package className="h-3 w-3" />
                                    <span>{uom.uomName}</span>
                                    <span className="text-xs text-gray-500">
                                      ({uom.conversionFactor}x)
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Quantity Input */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">Quantity:</label>
                      <Input
                        type="number"
                        min="1"
                        value={product.selectedQuantity || 1}
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Price and Stock */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold text-green-600">
                          {formatPrice(displayPrice)}
                          {product.selectedUOM && (
                            <span className="text-xs text-gray-500 ml-1">
                              per {product.selectedUOM.uomAbbreviation}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">Stock: {stockDisplay}</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          if (product.selectedUOM) {
                            onProductSelect(
                              product, 
                              product.selectedQuantity || 1, 
                              product.selectedUOM.uomId
                            )
                          }
                        }}
                        disabled={isOutOfStock || !product.selectedUOM}
                        className="h-8"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Total Price Display */}
                    {(product.selectedQuantity || 1) > 1 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-blue-600">
                          Total: {formatPrice(displayPrice * (product.selectedQuantity || 1))}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}