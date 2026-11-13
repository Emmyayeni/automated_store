"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import TransferManagement from "@/components/inventory/transfer-management"
import { 
  Package, Plus, Minus, Eye, History, AlertTriangle, CheckCircle, 
  ArrowRightLeft, Store, Search, Filter, Download, RefreshCw 
} from "lucide-react"
import { formatPrice, formatDisplayDate, formatTime } from "@/lib/standards/formatting"
import { ApiError, handleApiError } from "@/lib/standards/error-handling"
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages"
import { CommonValidators, validateForm } from "@/lib/standards/validation"
import type { AdminInventoryItem, Location, InventoryTransferRequest } from "@/lib/types"

// Remove duplicate interface - use centralized type

// Remove duplicate interfaces - use centralized types

interface AdjustmentLog {
  id: string
  productName: string
  productSku: string
  locationName: string
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
  { value: 'transfer_in', label: 'Transfer In' },
  { value: 'transfer_out', label: 'Transfer Out' },
]

export default function AdminInventoryManagement() {
  const [inventory, setInventory] = useState<AdminInventoryItem[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentLog[]>([])
  const [loading, setLoading] = useState(false)
  
  // Filters
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all')
  
  // Dialogs and selected items
  const [selectedItem, setSelectedItem] = useState<AdminInventoryItem | null>(null)
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false)
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  
  // Adjustment form
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(0)
  const [adjustmentType, setAdjustmentType] = useState<string>('manual')
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  
  // Transfer form
  const [transferData, setTransferData] = useState<InventoryTransferRequest>({
    fromLocationId: '',
    toLocationId: '',
    productId: '',
    quantity: 0,
    reason: '',
    notes: ''
  })

  useEffect(() => {
    fetchAllInventory()
    fetchLocations()
    fetchAdjustmentHistory()
  }, [])

  const fetchAllInventory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/inventory/all')
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
      const errorResponse = { error: error instanceof Error ? error.message : "Request failed" }
      console.error('Error fetching inventory:', error)
      toast.error(errorResponse.error || 'Failed to fetch inventory')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || 'Failed to fetch locations',
          response.status,
          errorData.code || 'FETCH_FAILED'
        )
      }
      const data = await response.json()
      // Handle both success response format and direct array
      const locationsData = data.success ? data.data : data
      setLocations(Array.isArray(locationsData) ? locationsData : [])
    } catch (error) {
      const errorResponse = { error: error instanceof Error ? error.message : "Request failed" }
      console.error('Error fetching locations:', error)
      toast.error(errorResponse.error || 'Failed to fetch locations')
    }
  }

  const fetchAdjustmentHistory = async () => {
    try {
      const response = await fetch('/api/admin/inventory/history')
      if (!response.ok) throw new Error('Failed to fetch adjustment history')
      const data = await response.json()
      setAdjustmentHistory(data)
    } catch (error) {
      console.error('Error fetching adjustment history:', error)
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
          locationId: selectedItem.locationId,
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
      await fetchAllInventory()
      await fetchAdjustmentHistory()

    } catch (error) {
      const errorResponse = { error: error instanceof Error ? error.message : "Request failed" }
      console.error('Error adjusting inventory:', error)
      toast.error(errorResponse.error || 'Failed to adjust inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferData.fromLocationId || !transferData.toLocationId || 
        !transferData.productId || transferData.quantity <= 0 || !transferData.reason.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (transferData.fromLocationId === transferData.toLocationId) {
      toast.error('Source and destination locations must be different')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/admin/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer inventory')
      }

      toast.success(data.message || 'Inventory transfer completed successfully')
      
      // Reset form
      setTransferData({
        fromLocationId: '',
        toLocationId: '',
        productId: '',
        quantity: 0,
        reason: '',
        notes: ''
      })
      setIsTransferDialogOpen(false)
      
      // Refresh data
      await fetchAllInventory()
      await fetchAdjustmentHistory()

    } catch (error: any) {
      console.error('Error transferring inventory:', error)
      toast.error(error.message || 'Failed to transfer inventory')
    } finally {
      setLoading(false)
    }
  }

  // Get unique categories for filter
  const uniqueCategories = Array.from(new Set(inventory.map(item => item.category).filter(Boolean)))

  // Apply filters
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchFilter || 
      item.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.locationName.toLowerCase().includes(searchFilter.toLowerCase())
    
    const matchesLocation = locationFilter === 'all' || item.locationId === locationFilter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    
    let matchesStockStatus = true
    if (stockStatusFilter === 'low') {
      matchesStockStatus = item.quantity <= item.minStockLevel
    } else if (stockStatusFilter === 'out') {
      matchesStockStatus = item.quantity === 0
    } else if (stockStatusFilter === 'good') {
      matchesStockStatus = item.quantity > item.minStockLevel
    }
    
    return matchesSearch && matchesLocation && matchesCategory && matchesStockStatus
  })

  // Calculate summary stats
  const totalProducts = inventory.length
  const lowStockCount = inventory.filter(item => item.quantity <= item.minStockLevel).length
  const outOfStockCount = inventory.filter(item => item.quantity === 0).length
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0)

  const getStockStatus = (item: AdminInventoryItem) => {
    if (item.quantity === 0) return { status: 'Out of Stock', color: 'destructive' }
    if (item.quantity <= item.minStockLevel) return { status: 'Low Stock', color: 'secondary' }
    return { status: 'In Stock', color: 'default' }
  }

  const getProductLocations = (productId: string) => {
    return inventory.filter(item => item.productId === productId)
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalProducts}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
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
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Store className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{formatPrice(totalValue)}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">All Inventory</TabsTrigger>
          <TabsTrigger value="transfers">Store Transfers</TabsTrigger>
          <TabsTrigger value="history">Activity History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters and Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Product, SKU, or location..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="location-filter">Location</Label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger id="location-filter">
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="category-filter">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {uniqueCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="stock-status-filter">Stock Status</Label>
                  <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                    <SelectTrigger id="stock-status-filter">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="good">In Stock</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-2">
                  <Button onClick={fetchAllInventory} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  
                  <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transfer
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Transfer Inventory Between Stores</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="from-location">From Location</Label>
                            <Select 
                              value={transferData.fromLocationId} 
                              onValueChange={(value) => setTransferData(prev => ({ ...prev, fromLocationId: value }))}
                            >
                              <SelectTrigger id="from-location">
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    {location.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="to-location">To Location</Label>
                            <Select 
                              value={transferData.toLocationId} 
                              onValueChange={(value) => setTransferData(prev => ({ ...prev, toLocationId: value }))}
                            >
                              <SelectTrigger id="to-location">
                                <SelectValue placeholder="Select destination" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    {location.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="transfer-product">Product</Label>
                          <Select 
                            value={transferData.productId} 
                            onValueChange={(value) => setTransferData(prev => ({ ...prev, productId: value }))}
                          >
                            <SelectTrigger id="transfer-product">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventory
                                .filter(item => item.locationId === transferData.fromLocationId && item.quantity > 0)
                                .map((item) => (
                                  <SelectItem key={`${item.productId}-${item.locationId}`} value={item.productId}>
                                    {item.productName} ({item.sku}) - Qty: {item.quantity}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="transfer-quantity">Quantity to Transfer</Label>
                          <Input
                            id="transfer-quantity"
                            type="number"
                            min="1"
                            value={transferData.quantity}
                            onChange={(e) => setTransferData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="transfer-reason">Reason *</Label>
                          <Textarea
                            id="transfer-reason"
                            placeholder="Enter reason for transfer..."
                            value={transferData.reason}
                            onChange={(e) => setTransferData(prev => ({ ...prev, reason: e.target.value }))}
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="transfer-notes">Additional Notes</Label>
                          <Textarea
                            id="transfer-notes"
                            placeholder="Optional additional notes..."
                            value={transferData.notes}
                            onChange={(e) => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
                          />
                        </div>
                        
                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={handleTransfer}
                            disabled={loading || !transferData.fromLocationId || !transferData.toLocationId || 
                                     !transferData.productId || transferData.quantity <= 0 || !transferData.reason.trim()}
                            className="flex-1"
                          >
                            {loading ? 'Transferring...' : 'Execute Transfer'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsTransferDialogOpen(false)}
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

          {/* Inventory List */}
          <div className="grid gap-4">
            {loading ? (
              <div className="text-center py-8">Loading inventory...</div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No inventory found matching your filters
              </div>
            ) : (
              filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item)
                return (
                  <Card key={`${item.productId}-${item.locationId}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{item.productName}</h3>
                            <Badge variant="outline">{item.sku}</Badge>
                            <Badge variant="outline">{item.locationName}</Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            Category: {item.category || 'Uncategorized'}
                          </p>
                          
                          <div className="flex items-center gap-4">
                            <Badge variant={stockStatus.color as any}>{stockStatus.status}</Badge>
                            <span className="text-sm">
                              Quantity: <strong>{item.quantity}</strong>
                            </span>
                            <span className="text-sm text-muted-foreground">
                              (Min: {item.minStockLevel}, Max: {item.maxStockLevel})
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Cost: {formatPrice(item.costPrice)} | Sell: {formatPrice(item.sellPrice)}
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
                                  <p className="text-sm text-muted-foreground">
                                    Location: {item.locationName} | Current quantity: {item.quantity}
                                  </p>
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
                                    placeholder="Enter reason for adjustment..."
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

        <TabsContent value="transfers" className="space-y-4">
          <TransferManagement />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Activity Across All Stores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adjustmentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity history found
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
                            <Badge variant="outline">{log.locationName}</Badge>
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