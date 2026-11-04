"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Package, Plus, Minus, History, AlertTriangle, CheckCircle } from "lucide-react"
import { formatPrice, formatDisplayDate, formatTime } from "@/lib/standards/formatting"
import { ApiError, handleApiError } from "@/lib/standards/error-handling"
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages"
import { CommonValidators, validateForm } from "@/lib/standards/validation"
import type { Product, AdminInventoryItem } from "@/lib/types"

// Use centralized type instead of duplicate interface
type InventoryItem = AdminInventoryItem

interface AdjustmentLog {
  id: string
  productName: string
  productSku: string
  adjustmentType: string
  previousQuantity: number
  adjustmentQuantity: number
  newQuantity: number
  reason: string
  adjustedByName: string
  createdAt: string
  notes?: string
}

const adjustmentTypes = [
  { value: 'manual', label: 'Manual Adjustment' },
  { value: 'waste', label: 'Waste/Spoilage' },
  { value: 'theft', label: 'Theft/Loss' },
  { value: 'damage', label: 'Damage' },
  { value: 'recount', label: 'Physical Recount' },
  { value: 'expired', label: 'Expired Items' },
  { value: 'production', label: 'Production Use' },
]

export default function InventoryManagement({ locationId }: { locationId: string }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentLog[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0)
  const [adjustmentType, setAdjustmentType] = useState<string>('manual')
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [filter, setFilter] = useState<string>('')
  const [showLowStock, setShowLowStock] = useState<boolean>(false)
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false)

  useEffect(() => {
    fetchInventory()
    fetchAdjustmentHistory()
  }, [locationId])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/adjustments?locationId=${locationId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || 'Failed to fetch inventory',
          response.status,
          errorData.code || 'FETCH_FAILED'
        )
      }
      const data = await response.json()
      // Handle both success response format and direct array
      const inventoryData = data.success ? data.data : data
      setInventory(Array.isArray(inventoryData) ? inventoryData : [])
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch inventory'
      console.error('Error fetching inventory:', error)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchAdjustmentHistory = async () => {
    try {
      const response = await fetch(`/api/inventory/adjustments?locationId=${locationId}&type=history`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || 'Failed to fetch adjustment history',
          response.status,
          errorData.code || 'FETCH_FAILED'
        )
      }
      const data = await response.json()
      // Handle both success response format and direct array
      const historyData = data.success ? data.data : data
      setAdjustmentHistory(Array.isArray(historyData) ? historyData : [])
    } catch (error) {
      const errorResponse = handleApiError(error, 'fetch adjustment history')
      console.error('Error fetching adjustment history:', error)
      toast.error(errorResponse.error || 'Failed to fetch adjustment history')
    }
  }

  const handleAdjustment = async () => {
    // Use standardized validation
    const validationSchema = {
      adjustmentQuantity: CommonValidators.stockQuantity(true),
      reason: CommonValidators.name('Reason', true),
    }
    
    const validationResult = validateForm(
      { adjustmentQuantity, reason: reason.trim() },
      validationSchema
    )
    
    if (!validationResult.isValid) {
      toast.error(validationResult.errors[0])
      return
    }
    
    if (!selectedItem || adjustmentQuantity === 0) {
      toast.error(VALIDATION_MESSAGES.REQUIRED('Product and adjustment quantity'))
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          productId: selectedItem.productId,
          adjustmentQuantity,
          adjustmentType,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || 'Failed to adjust inventory',
          response.status,
          errorData.code || 'ADJUSTMENT_FAILED'
        )
      }

      const data = await response.json()
      const successMessage = data.success ? data.message : 'Inventory adjusted successfully'
      toast.success(successMessage)
      
      // Reset form
      setSelectedItem(null)
      setAdjustmentQuantity(0)
      setReason('')
      setNotes('')
      setIsAdjustmentDialogOpen(false)
      
      // Refresh data
      await fetchInventory()
      await fetchAdjustmentHistory()

    } catch (error) {
      const errorResponse = handleApiError(error, 'inventory adjustment')
      console.error('Error adjusting inventory:', error)
      toast.error(errorResponse.error || 'Failed to adjust inventory')
    } finally {
      setLoading(false)
    }
  }

  const filteredInventory = inventory.filter(item => {
    const matchesFilter = !filter || 
      item.productName.toLowerCase().includes(filter.toLowerCase()) ||
      item.sku.toLowerCase().includes(filter.toLowerCase()) ||
      item.category.toLowerCase().includes(filter.toLowerCase())
    
    const matchesLowStock = !showLowStock || item.quantity <= item.minStockLevel
    
    return matchesFilter && matchesLowStock
  })

  const lowStockCount = inventory.filter(item => item.quantity <= item.minStockLevel).length
  const outOfStockCount = inventory.filter(item => item.quantity === 0).length

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { status: 'Out of Stock', color: 'destructive' }
    if (item.quantity <= item.minStockLevel) return { status: 'Low Stock', color: 'secondary' }
    return { status: 'In Stock', color: 'default' }
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{inventory.length}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{lowStockCount}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{outOfStockCount}</p>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
          <TabsTrigger value="history">Adjustment History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search products..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full sm:w-64"
              />
              <Button
                variant={showLowStock ? "default" : "outline"}
                onClick={() => setShowLowStock(!showLowStock)}
              >
                {showLowStock ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                Low Stock
              </Button>
            </div>
          </div>

          {/* Inventory List */}
          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-8">Loading inventory...</div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {filter || showLowStock ? 'No products match your filters' : 'No inventory found'}
              </div>
            ) : (
              filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item)
                return (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{item.productName}</h3>
                          <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                          <p className="text-sm text-muted-foreground">Category: {item.category}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={stockStatus.color as any}>{stockStatus.status}</Badge>
                            <span className="text-sm">
                              Quantity: <strong>{item.quantity}</strong>
                            </span>
                            <span className="text-sm text-muted-foreground">
                              (Min: {item.minStockLevel}, Max: {item.maxStockLevel})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog open={isAdjustmentDialogOpen && selectedItem?.id === item.id} onOpenChange={(open) => {
                            setIsAdjustmentDialogOpen(open)
                            if (!open) {
                              setSelectedItem(null)
                              setAdjustmentQuantity(0)
                              setReason('')
                              setNotes('')
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedItem(item)}
                              >
                                <Package className="h-4 w-4 mr-2" />
                                Adjust
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Adjust Inventory</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Product</Label>
                                  <p className="text-sm font-medium">{item.productName}</p>
                                  <p className="text-sm text-muted-foreground">Current quantity: {item.quantity}</p>
                                </div>
                                
                                <div>
                                  <Label htmlFor="adjustmentType">Adjustment Type</Label>
                                  <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select adjustment type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {adjustmentTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label htmlFor="adjustmentQuantity">Adjustment Quantity</Label>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAdjustmentQuantity(Math.max(adjustmentQuantity - 1, -item.quantity))}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <Input
                                      id="adjustmentQuantity"
                                      type="number"
                                      value={adjustmentQuantity}
                                      onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                                      className="text-center"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAdjustmentQuantity(adjustmentQuantity + 1)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    New quantity will be: {item.quantity + adjustmentQuantity}
                                  </p>
                                </div>

                                <div>
                                  <Label htmlFor="reason">Reason *</Label>
                                  <Textarea
                                    id="reason"
                                    placeholder={VALIDATION_MESSAGES.REQUIRED('Reason for adjustment')}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="notes">Additional Notes</Label>
                                  <Textarea
                                    id="notes"
                                    placeholder="Optional additional notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                  />
                                </div>

                                <div className="flex gap-2 pt-4">
                                  <Button
                                    onClick={handleAdjustment}
                                    disabled={loading || adjustmentQuantity === 0 || !reason.trim()}
                                    className="flex-1"
                                  >
                                    {loading ? 'Adjusting...' : 'Apply Adjustment'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => setIsAdjustmentDialogOpen(false)}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Adjustments for This Location
              </CardTitle>
              <CardDescription>
                All inventory adjustments are automatically logged and visible to administrators.
                This helps maintain transparency and accountability across the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adjustmentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No adjustment history found
                </div>
              ) : (
                <div className="space-y-4">
                  {adjustmentHistory.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{log.productName}</h4>
                            <Badge variant="outline">{log.productSku}</Badge>
                            <Badge variant={log.adjustmentQuantity > 0 ? "default" : "destructive"}>
                              {log.adjustmentQuantity > 0 ? '+' : ''}{log.adjustmentQuantity}
                            </Badge>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">Type:</span> {log.adjustmentType}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Reason:</span> {log.reason}
                          </p>
                          {log.notes && (
                            <p className="text-sm">
                              <span className="font-medium">Notes:</span> {log.notes}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {log.previousQuantity} → {log.newQuantity} units
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{log.adjustedByName}</p>
                          <p>{formatDisplayDate(log.createdAt)}</p>
                          <p>{formatTime(log.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
