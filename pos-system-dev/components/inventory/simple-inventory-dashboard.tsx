"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Plus, Minus, Edit, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"

interface ProductInventory {
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
  lastUpdated: string
}

interface SimpleInventoryDashboardProps {
  locationId: string
}

export default function SimpleInventoryDashboard({ locationId }: SimpleInventoryDashboardProps) {
  const [inventory, setInventory] = useState<ProductInventory[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null)
  const [showAdjustDialog, setShowAdjustDialog] = useState(false)
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: "add", // add or remove
    level: "packs", // packs, cards, strips, baseUnits
    quantity: "",
    reason: ""
  })

  // Sample data - replace with actual API call
  useEffect(() => {
    const sampleData: ProductInventory[] = [
      {
        id: "1",
        name: "Paracetamol",
        strength: "500mg",
        manufacturer: "PharmaCorp",
        category: "Pain Relief",
        stockLevels: {
          packs: 25,
          cards: 78, // includes loose cards
          strips: 156,
          baseUnits: 1560,
          baseUnitName: "tablets"
        },
        pricing: {
          perPack: 24.00,
          perCard: 8.50,
          perStrip: 4.50,
          perBaseUnit: 0.50
        },
        lowStockAlert: false,
        lastUpdated: "2 hours ago"
      },
      {
        id: "2", 
        name: "Amoxicillin",
        strength: "250mg",
        manufacturer: "MediCorp",
        category: "Antibiotics",
        stockLevels: {
          packs: 5,
          cards: 15,
          strips: 30,
          baseUnits: 300,
          baseUnitName: "capsules"
        },
        pricing: {
          perPack: 36.00,
          perCard: 12.00,
          perStrip: 6.00,
          perBaseUnit: 0.60
        },
        lowStockAlert: true,
        lastUpdated: "1 hour ago"
      }
    ]
    setInventory(sampleData)
  }, [locationId])

  const handleAdjustStock = async () => {
    if (!selectedProduct) return

    try {
      // Calculate base units affected
      let baseUnitsAffected = 0
      const quantity = parseInt(adjustmentForm.quantity) || 0

      switch (adjustmentForm.level) {
        case "packs":
          baseUnitsAffected = quantity * 60 // Assuming 60 base units per pack
          break
        case "cards": 
          baseUnitsAffected = quantity * 20 // Assuming 20 base units per card
          break
        case "strips":
          baseUnitsAffected = quantity * 10 // Assuming 10 base units per strip
          break
        case "baseUnits":
          baseUnitsAffected = quantity
          break
      }

      if (adjustmentForm.type === "remove") {
        baseUnitsAffected = -baseUnitsAffected
      }

      // Call API to adjust inventory
      const response = await fetch(`/api/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          locationId,
          adjustmentType: adjustmentForm.type === "add" ? "manual" : "manual",
          adjustmentQuantity: baseUnitsAffected,
          uomLevel: adjustmentForm.level,
          reason: adjustmentForm.reason,
        })
      })

      if (response.ok) {
        // Refresh inventory data
        // loadInventory()
        setShowAdjustDialog(false)
        resetAdjustmentForm()
      }
    } catch (error) {
      console.error("Error adjusting stock:", error)
    }
  }

  const resetAdjustmentForm = () => {
    setAdjustmentForm({
      type: "add",
      level: "packs", 
      quantity: "",
      reason: ""
    })
  }

  const getStockStatus = (product: ProductInventory) => {
    if (product.lowStockAlert) return "low"
    if (product.stockLevels.packs > 20) return "good"
    if (product.stockLevels.packs > 10) return "medium"
    return "low"
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "good": return "text-green-600 bg-green-100"
      case "medium": return "text-yellow-600 bg-yellow-100"
      case "low": return "text-red-600 bg-red-100"
      default: return "text-gray-600 bg-gray-100"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Inventory Dashboard</h2>
        <div className="flex gap-2">
          <Button variant="outline">Export Report</Button>
          <Button>Add New Product</Button>
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
                <p className="text-sm text-gray-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {inventory.filter(p => p.lowStockAlert).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">
                  ${inventory.reduce((sum, p) => sum + (p.stockLevels.packs * p.pricing.perPack), 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Products Updated</p>
                <p className="text-2xl font-bold">Today</p>
              </div>
              <Edit className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {inventory.map((product) => {
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
                  <Badge className={`text-xs ${getStockStatusColor(stockStatus)}`}>
                    {stockStatus === "good" ? "In Stock" : stockStatus === "medium" ? "Medium" : "Low Stock"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Stock Levels Display */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">Current Stock</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Packs:</span>
                      <span className="font-medium">{product.stockLevels.packs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cards:</span> 
                      <span className="font-medium">{product.stockLevels.cards}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Strips:</span>
                      <span className="font-medium">{product.stockLevels.strips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{product.stockLevels.baseUnitName}:</span>
                      <span className="font-medium">{product.stockLevels.baseUnits}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setSelectedProduct(product)
                      setAdjustmentForm({...adjustmentForm, type: "add"})
                      setShowAdjustDialog(true)
                    }}
                    className="flex-1"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedProduct(product)
                      setAdjustmentForm({...adjustmentForm, type: "remove"})
                      setShowAdjustDialog(true)
                    }}
                    className="flex-1"
                  >
                    <Minus className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>

                {/* Last Updated */}
                <p className="text-xs text-gray-500">Updated {product.lastUpdated}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentForm.type === "add" ? "Add Stock" : "Remove Stock"} - {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>What level are you adjusting?</Label>
              <Select 
                value={adjustmentForm.level} 
                onValueChange={(value) => setAdjustmentForm({...adjustmentForm, level: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="packs">📦 Packs (60 {selectedProduct?.stockLevels.baseUnitName})</SelectItem>
                  <SelectItem value="cards">🗃️ Cards (20 {selectedProduct?.stockLevels.baseUnitName})</SelectItem>
                  <SelectItem value="strips">📋 Strips (10 {selectedProduct?.stockLevels.baseUnitName})</SelectItem>
                  <SelectItem value="baseUnits">💊 Individual {selectedProduct?.stockLevels.baseUnitName}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                placeholder="How many?"
                value={adjustmentForm.quantity}
                onChange={(e) => setAdjustmentForm({...adjustmentForm, quantity: e.target.value})}
              />
              {adjustmentForm.quantity && (
                <p className="text-sm text-gray-500 mt-1">
                  This will {adjustmentForm.type} {" "}
                  {adjustmentForm.level === "packs" ? parseInt(adjustmentForm.quantity) * 60 :
                   adjustmentForm.level === "cards" ? parseInt(adjustmentForm.quantity) * 20 :
                   adjustmentForm.level === "strips" ? parseInt(adjustmentForm.quantity) * 10 :
                   adjustmentForm.quantity} {selectedProduct?.stockLevels.baseUnitName} to/from inventory
                </p>
              )}
            </div>

            <div>
              <Label>Reason</Label>
              <Select 
                value={adjustmentForm.reason} 
                onValueChange={(value) => setAdjustmentForm({...adjustmentForm, reason: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Why are you adjusting stock?" />
                </SelectTrigger>
                <SelectContent>
                  {adjustmentForm.type === "add" ? (
                    <>
                      <SelectItem value="new-stock">New Stock Received</SelectItem>
                      <SelectItem value="return">Customer Return</SelectItem>
                      <SelectItem value="found">Found Stock</SelectItem>
                      <SelectItem value="correction">Inventory Correction</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="expired">Expired Product</SelectItem>
                      <SelectItem value="damaged">Damaged Product</SelectItem>
                      <SelectItem value="theft">Theft/Loss</SelectItem>
                      <SelectItem value="correction">Inventory Correction</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAdjustStock}
                disabled={!adjustmentForm.quantity || !adjustmentForm.reason}
              >
                {adjustmentForm.type === "add" ? "Add to" : "Remove from"} Inventory
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}