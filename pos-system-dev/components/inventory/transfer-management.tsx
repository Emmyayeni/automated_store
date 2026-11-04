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
import { 
  ArrowRightLeft, Package, Clock, CheckCircle, XCircle, Truck, 
  Eye, Search, Filter, RefreshCw, Calendar, User, MapPin
} from "lucide-react"
import { formatPrice, formatDisplayDate, formatDisplayDateTime } from "@/lib/standards/formatting"

interface Location {
  id: string
  name: string
  address?: string
}

interface InventoryItem {
  id: string
  productId: string
  productName: string
  sku: string
  quantity: number
  locationId: string
  locationName: string
}

interface TransferRequest {
  fromLocationId: string
  toLocationId: string
  productId: string
  quantity: number
  reason: string
  notes?: string
}

interface Transfer {
  id: string
  transferNumber: string
  fromLocationId: string
  toLocationId: string
  fromLocationName: string
  toLocationName: string
  requestedBy: string
  requestedByName: string
  approvedBy?: string
  approvedByName?: string
  status: 'pending' | 'approved' | 'rejected' | 'shipped' | 'received' | 'cancelled'
  notes?: string
  requestedDate: string
  approvedDate?: string
  shippedDate?: string
  receivedDate?: string
  items: TransferItem[]
}

interface TransferItem {
  id: string
  productId: string
  productName: string
  productSku: string
  quantityRequested: number
  quantityShipped: number
  quantityReceived: number
  notes?: string
}

const statusColors = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  shipped: 'default',
  received: 'default',
  cancelled: 'destructive'
} as const

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  shipped: Truck,
  received: CheckCircle,
  cancelled: XCircle
} as const

export default function TransferManagement() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [fromLocationFilter, setFromLocationFilter] = useState<string>('all')
  const [toLocationFilter, setToLocationFilter] = useState<string>('all')
  const [searchFilter, setSearchFilter] = useState<string>('')
  
  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  
  // Transfer form
  const [transferData, setTransferData] = useState<TransferRequest>({
    fromLocationId: '',
    toLocationId: '',
    productId: '',
    quantity: 0,
    reason: '',
    notes: ''
  })

  useEffect(() => {
    fetchTransfers()
    fetchLocations()
    fetchInventory()
  }, [])

  const fetchTransfers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/inventory/transfers')
      if (!response.ok) throw new Error('Failed to fetch transfers')
      const data = await response.json()
      setTransfers(data)
    } catch (error) {
      console.error('Error fetching transfers:', error)
      toast.error('Failed to fetch transfers')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (!response.ok) throw new Error('Failed to fetch locations')
      const data = await response.json()
      setLocations(data)
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/admin/inventory/all')
      if (!response.ok) throw new Error('Failed to fetch inventory')
      const data = await response.json()
      setInventory(data)
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }

  const handleCreateTransfer = async () => {
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
        throw new Error(data.error || 'Failed to create transfer')
      }

      toast.success(data.message || 'Transfer created successfully')
      
      // Reset form
      setTransferData({
        fromLocationId: '',
        toLocationId: '',
        productId: '',
        quantity: 0,
        reason: '',
        notes: ''
      })
      setIsCreateDialogOpen(false)
      
      // Refresh data
      await fetchTransfers()
      await fetchInventory()

    } catch (error: any) {
      console.error('Error creating transfer:', error)
      toast.error(error.message || 'Failed to create transfer')
    } finally {
      setLoading(false)
    }
  }

  const getAvailableProducts = () => {
    if (!transferData.fromLocationId) return []
    return inventory.filter(item => 
      item.locationId === transferData.fromLocationId && item.quantity > 0
    )
  }

  const getSelectedProductQuantity = () => {
    if (!transferData.fromLocationId || !transferData.productId) return 0
    const item = inventory.find(item => 
      item.locationId === transferData.fromLocationId && item.productId === transferData.productId
    )
    return item?.quantity || 0
  }

  // Apply filters
  const filteredTransfers = transfers.filter(transfer => {
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter
    const matchesFromLocation = fromLocationFilter === 'all' || transfer.fromLocationId === fromLocationFilter
    const matchesToLocation = toLocationFilter === 'all' || transfer.toLocationId === toLocationFilter
    const matchesSearch = !searchFilter || 
      transfer.transferNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      transfer.fromLocationName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      transfer.toLocationName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      transfer.items.some(item => 
        item.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.productSku.toLowerCase().includes(searchFilter.toLowerCase())
      )
    
    return matchesStatus && matchesFromLocation && matchesToLocation && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transfer Management</h2>
          <p className="text-muted-foreground">
            Manage inventory transfers between stores
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Transfer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from-location">From Location *</Label>
                  <Select 
                    value={transferData.fromLocationId} 
                    onValueChange={(value) => setTransferData(prev => ({ 
                      ...prev, 
                      fromLocationId: value,
                      productId: '' // Reset product when location changes
                    }))}
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
                  <Label htmlFor="to-location">To Location *</Label>
                  <Select 
                    value={transferData.toLocationId} 
                    onValueChange={(value) => setTransferData(prev => ({ ...prev, toLocationId: value }))}
                  >
                    <SelectTrigger id="to-location">
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations
                        .filter(loc => loc.id !== transferData.fromLocationId)
                        .map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="transfer-product">Product *</Label>
                <Select 
                  value={transferData.productId} 
                  onValueChange={(value) => setTransferData(prev => ({ ...prev, productId: value }))}
                  disabled={!transferData.fromLocationId}
                >
                  <SelectTrigger id="transfer-product">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableProducts().map((item) => (
                      <SelectItem key={item.productId} value={item.productId}>
                        {item.productName} ({item.sku}) - Available: {item.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="transfer-quantity">Quantity *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="transfer-quantity"
                    type="number"
                    min="1"
                    max={getSelectedProductQuantity()}
                    value={transferData.quantity || ''}
                    onChange={(e) => setTransferData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter quantity"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    / {getSelectedProductQuantity()} available
                  </span>
                </div>
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
                  onClick={handleCreateTransfer}
                  disabled={loading || !transferData.fromLocationId || !transferData.toLocationId || 
                           !transferData.productId || transferData.quantity <= 0 || !transferData.reason.trim()}
                  className="flex-1"
                >
                  {loading ? 'Creating...' : 'Create Transfer'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Transfer #, location, product..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="from-location-filter">From Location</Label>
              <Select value={fromLocationFilter} onValueChange={setFromLocationFilter}>
                <SelectTrigger id="from-location-filter">
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
              <Label htmlFor="to-location-filter">To Location</Label>
              <Select value={toLocationFilter} onValueChange={setToLocationFilter}>
                <SelectTrigger id="to-location-filter">
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
            
            <div className="flex items-end">
              <Button onClick={fetchTransfers} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading transfers...</div>
        ) : filteredTransfers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transfers found matching your filters
          </div>
        ) : (
          filteredTransfers.map((transfer) => {
            const StatusIcon = statusIcons[transfer.status]
            return (
              <Card key={transfer.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{transfer.transferNumber}</h3>
                        <Badge 
                          variant={statusColors[transfer.status] as any}
                          className="flex items-center gap-1"
                        >
                          <StatusIcon className="h-3 w-3" />
                          {transfer.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{transfer.fromLocationName} → {transfer.toLocationName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>Requested by {transfer.requestedByName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDisplayDate(transfer.requestedDate)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {transfer.items.length} item{transfer.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {transfer.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          Note: {transfer.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog open={isDetailsDialogOpen && selectedTransfer?.id === transfer.id} onOpenChange={(open) => {
                        setIsDetailsDialogOpen(open)
                        if (!open) setSelectedTransfer(null)
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTransfer(transfer)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Transfer Details - {transfer.transferNumber}</DialogTitle>
                          </DialogHeader>
                          {selectedTransfer && (
                            <div className="space-y-6">
                              {/* Transfer Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium">Transfer Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Status:</span> {selectedTransfer.status}</p>
                                    <p><span className="font-medium">From:</span> {selectedTransfer.fromLocationName}</p>
                                    <p><span className="font-medium">To:</span> {selectedTransfer.toLocationName}</p>
                                    <p><span className="font-medium">Requested by:</span> {selectedTransfer.requestedByName}</p>
                                    <p><span className="font-medium">Requested:</span> {formatDisplayDateTime(selectedTransfer.requestedDate)}</p>
                                    {selectedTransfer.approvedDate && (
                                      <p><span className="font-medium">Approved:</span> {formatDisplayDateTime(selectedTransfer.approvedDate)}</p>
                                    )}
                                    {selectedTransfer.receivedDate && (
                                      <p><span className="font-medium">Completed:</span> {formatDisplayDateTime(selectedTransfer.receivedDate)}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <h4 className="font-medium">Items</h4>
                                  <div className="space-y-2">
                                    {selectedTransfer.items.map((item) => (
                                      <div key={item.id} className="p-3 border rounded-lg">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="font-medium">{item.productName}</p>
                                            <p className="text-sm text-muted-foreground">{item.productSku}</p>
                                          </div>
                                          <div className="text-right text-sm">
                                            <p>Qty: {item.quantityRequested}</p>
                                            {item.quantityReceived > 0 && (
                                              <p className="text-green-600">Received: {item.quantityReceived}</p>
                                            )}
                                          </div>
                                        </div>
                                        {item.notes && (
                                          <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              {selectedTransfer.notes && (
                                <div>
                                  <h4 className="font-medium mb-2">Notes</h4>
                                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                                    {selectedTransfer.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
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
    </div>
  )
}