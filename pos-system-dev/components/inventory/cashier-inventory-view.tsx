"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Package, Search, Bell, Eye } from "lucide-react"

interface CashierProductInventory {
  id: string
  name: string
  strength: string
  manufacturer: string
  category: string
  stockLevels: {
    packs: number
    cards: number
    strips: number
    baseUnits: number
    baseUnitName: string
  }
  pricing: {
    perPack: number
    perCard: number
    perStrip: number
    perBaseUnit: number
  }
  lowStockAlert: boolean
  canSell: boolean
  lastUpdated: string
}

interface CashierInventoryViewProps {
  locationId: string
}

export default function CashierInventoryView({ locationId }: CashierInventoryViewProps) {
  const [inventory, setInventory] = useState<CashierProductInventory[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  // Fetch inventory data from API
  useEffect(() => {
    const fetchInventory = async () => {
      if (!locationId) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/inventory/uom?locationId=${locationId}`);
        const result = await response.json();
        
        if (result.success) {
          setInventory(result.data);
        } else {
          console.error('Failed to fetch inventory:', result.error);
          setInventory([]);
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
        setInventory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [locationId])

  const filteredInventory = inventory.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.strength && product.strength.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.manufacturer && product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStockStatus = (product: CashierProductInventory) => {
    if (!product.canSell) return "out-of-stock"
    if (product.lowStockAlert) return "low-stock"
    if (product.stockLevels.packs > 10) return "good-stock"
    return "medium-stock"
  }

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "good-stock":
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
      case "medium-stock":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Stock</Badge>
      case "low-stock":
        return <Badge className="bg-orange-100 text-orange-800">Low Stock</Badge>
      case "out-of-stock":
        return <Badge variant="destructive">Out of Stock</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  }

  const alertManager = async (productId: string, productName: string) => {
    try {
      // This would send an alert to the manager - implement actual API call
      const response = await fetch('/api/notifications/low-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          productName,
          locationId,
          message: `Low stock alert for ${productName}`,
          type: 'low_stock'
        }),
      });

      if (response.ok) {
        alert(`Low stock alert sent for ${productName}`);
      } else {
        alert('Failed to send alert. Please try again.');
      }
    } catch (error) {
      console.error('Error sending alert:', error);
      alert('Failed to send alert. Please try again.');
    }
  }

  const totalLowStockItems = inventory.filter(p => p.lowStockAlert).length
  const totalOutOfStock = inventory.filter(p => !p.canSell).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading inventory...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Inventory Overview</h2>
          <p className="text-muted-foreground">
            Check stock levels and product availability (Read-only)
          </p>
        </div>
        <div className="flex gap-2">
          {totalLowStockItems > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalLowStockItems} Low Stock
            </Badge>
          )}
          {totalOutOfStock > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Package className="h-3 w-3" />
              {totalOutOfStock} Out of Stock
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available for Sale</p>
                <p className="text-2xl font-bold text-green-600">
                  {inventory.filter(p => p.canSell).length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-orange-600">{totalLowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{totalOutOfStock}</p>
              </div>
              <Package className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search products by name, strength, or manufacturer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((product) => {
          const stockStatus = getStockStatus(product)
          
          return (
            <Card key={product.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{product.name} {product.strength}</CardTitle>
                    <p className="text-sm text-gray-500">{product.manufacturer}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {product.category}
                    </Badge>
                  </div>
                  {getStockStatusBadge(stockStatus)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stock Levels Display */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Available Stock</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Packs:</span>
                      <span className={`font-medium ${product.stockLevels.packs === 0 ? 'text-red-600' : ''}`}>
                        {product.stockLevels.packs}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cards:</span>
                      <span className={`font-medium ${product.stockLevels.cards === 0 ? 'text-red-600' : ''}`}>
                        {product.stockLevels.cards}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Strips:</span>
                      <span className={`font-medium ${product.stockLevels.strips === 0 ? 'text-red-600' : ''}`}>
                        {product.stockLevels.strips}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{product.stockLevels.baseUnitName}:</span>
                      <span className={`font-medium ${product.stockLevels.baseUnits === 0 ? 'text-red-600' : ''}`}>
                        {product.stockLevels.baseUnits}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing Display */}
                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm text-blue-900">Selling Prices</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>Pack:</span>
                      <span className="font-medium">${product.pricing.perPack.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card:</span>
                      <span className="font-medium">${product.pricing.perCard.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Strip:</span>
                      <span className="font-medium">${product.pricing.perStrip.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Each:</span>
                      <span className="font-medium">${product.pricing.perBaseUnit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {product.lowStockAlert && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => alertManager(product.id, product.name)}
                  >
                    <Bell className="h-3 w-3 mr-2" />
                    Alert Manager
                  </Button>
                )}

                {!product.canSell && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded text-center">
                    <p className="text-red-800 text-sm font-medium">Cannot sell - No sellable packages available</p>
                    <p className="text-red-600 text-xs mt-1">Manager needs to restock or break packages</p>
                  </div>
                )}

                {/* Last Updated */}
                <p className="text-xs text-gray-500">Updated {formatLastUpdated(product.lastUpdated)}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredInventory.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No products found matching your search.</p>
        </div>
      )}
    </div>
  )
}