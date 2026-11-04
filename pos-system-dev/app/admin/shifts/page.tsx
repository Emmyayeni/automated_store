"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Clock, DollarSign, Users, MapPin, AlertTriangle, CheckCircle, XCircle, BarChart3, Eye, Printer, Download } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"

interface Shift {
  id: string
  userId: string
  userName: string
  userEmail: string
  locationId: string
  locationName: string
  openedAt: string
  closedAt: string | null
  openingCash: number | null
  closingCash: number | null
  status: "open" | "closed"
  notes: string | null
  variance?: number | null
  totalSales?: number
  totalTransactions?: number
}

interface ShiftSummary {
  shift: Shift
  summary: {
    totalTransactions: number
    totalSales: number
    totalTax: number
    totalDiscount: number
    cashVariance: number | null
  }
  paymentBreakdown: Array<{
    paymentMethod: string
    count: number
    total: number
  }>
  hourlySales: Array<{
    hour: number
    count: number
    total: number
  }>
  topProducts: Array<{
    productName: string
    quantitySold: number
    revenue: number
  }>
}

interface Location {
  id: string
  name: string
}

interface Staff {
  id: string
  name: string
  email: string
}

export default function AdminShiftsPage() {
  const { data: session } = useSession()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedShift, setSelectedShift] = useState<ShiftSummary | null>(null)
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  
  // Filters
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [selectedStaff, setSelectedStaff] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [varianceFilter, setVarianceFilter] = useState<string>("all")
  
  const sessionData = (session as any)?.data || session;
  const businessId = sessionData?.user?.businessId || ""

  // Fetch data
  useEffect(() => {
    if (businessId) {
      fetchLocations()
      fetchStaff()
      fetchShifts()
    }
  }, [businessId])

  const fetchLocations = async () => {
    try {
      const response = await fetch(`/api/admin/locations?businessId=${businessId}`)
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error("Error fetching locations:", error)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await fetch(`/api/admin/staff?businessId=${businessId}`)
      if (response.ok) {
        const data = await response.json()
        setStaff(data)
      }
    } catch (error) {
      console.error("Error fetching staff:", error)
    }
  }

  const fetchShifts = useCallback(async () => {
    if (!businessId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        businessId,
        startDate,
        endDate,
        ...(selectedLocation !== "all" && { locationId: selectedLocation }),
        ...(selectedStaff !== "all" && { userId: selectedStaff }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(varianceFilter !== "all" && { hasVariance: varianceFilter }),
      })
      
      const response = await fetch(`/api/admin/shifts?${params.toString()}`)
      const data = await response.json()
      
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        })
      } else {
        setShifts(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch shifts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [businessId, startDate, endDate, selectedLocation, selectedStaff, statusFilter, varianceFilter])

  useEffect(() => {
    fetchShifts()
  }, [fetchShifts])

  const viewShiftSummary = async (shiftId: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/summary`)
      if (response.ok) {
        const summary = await response.json()
        setSelectedShift(summary)
        setShowSummaryDialog(true)
      } else {
        throw new Error("Failed to fetch shift summary")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load shift summary",
        variant: "destructive",
      })
    }
  }

  const printShiftSummary = async (summary: ShiftSummary) => {
    try {
      const response = await fetch("/api/printer/thermal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "shift_summary",
          data: summary,
        }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Print Successful",
          description: "Shift summary sent to printer",
        })
      } else {
        throw new Error("Print failed")
      }
    } catch (error) {
      toast({
        title: "Print Failed",
        description: "Failed to print shift summary",
        variant: "destructive",
      })
    }
  }

  const exportShiftsData = async () => {
    try {
      const params = new URLSearchParams({
        businessId,
        startDate,
        endDate,
        format: 'csv',
        ...(selectedLocation !== "all" && { locationId: selectedLocation }),
        ...(selectedStaff !== "all" && { userId: selectedStaff }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      })
      
      const response = await fetch(`/api/admin/shifts/export?${params.toString()}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `shifts-data-${startDate}-to-${endDate}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: "Export Successful",
          description: "Shifts data exported to CSV",
        })
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export shifts data",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A"
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLL',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDuration = (start: string, end?: string | null) => {
    const startTime = new Date(start)
    const endTime = end ? new Date(end) : new Date()
    const diffMs = endTime.getTime() - startTime.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getVarianceStatus = (variance: number | null) => {
    if (variance === null) return { status: "unknown", color: "bg-gray-500" }
    if (Math.abs(variance) < 0.01) return { status: "balanced", color: "bg-green-500" }
    if (Math.abs(variance) < 100) return { status: "minor", color: "bg-yellow-500" }
    return { status: "major", color: "bg-red-500" }
  }

  // Statistics
  const totalShifts = shifts.length
  const openShifts = shifts.filter(s => s.status === "open").length
  const shiftsWithVariance = shifts.filter(s => s.variance !== null && s.variance !== undefined && Math.abs(s.variance) > 0.01).length
  const totalRevenue = shifts.reduce((sum, s) => sum + (s.totalSales || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Shift Management & Surveillance</h1>
        <Button onClick={exportShiftsData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Shifts Data
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShifts}</div>
            <p className="text-xs text-muted-foreground">
              {openShifts} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Variances</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shiftsWithVariance}</div>
            <p className="text-xs text-muted-foreground">
              Require investigation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">
              Across business
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input 
                id="start-date" 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input 
                id="end-date" 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
            <div>
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Variance</Label>
              <Select value={varianceFilter} onValueChange={setVarianceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Has Variance</SelectItem>
                  <SelectItem value="false">No Variance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchShifts} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Filter"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No shifts found for the selected criteria
              </div>
            ) : (
              shifts.map((shift) => {
                const variance = getVarianceStatus(shift.variance ?? null)
                return (
                  <div key={shift.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{shift.userName}</h3>
                          <Badge variant={shift.status === "open" ? "default" : "secondary"}>
                            {shift.status}
                          </Badge>
                          {shift.variance !== null && (
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${variance.color}`}></div>
                              <span className="text-xs text-muted-foreground">
                                {variance.status}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {shift.locationName} • {shift.userEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(shift.openedAt).toLocaleString()} - 
                          {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : "Ongoing"}
                        </p>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <div className="font-semibold">
                          {shift.totalSales ? formatCurrency(shift.totalSales) : "No sales"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Duration: {formatDuration(shift.openedAt, shift.closedAt)}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => viewShiftSummary(shift.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Opening Cash</p>
                        <p className="font-medium">{formatCurrency(shift.openingCash)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Closing Cash</p>
                        <p className="font-medium">{formatCurrency(shift.closingCash)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Transactions</p>
                        <p className="font-medium">{shift.totalTransactions || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cash Variance</p>
                        <p className={`font-medium ${
                          shift.variance === null 
                            ? 'text-muted-foreground' 
                            : Math.abs(shift.variance ?? 0) < 0.01 
                              ? 'text-green-600' 
                              : 'text-red-600'
                        }`}>
                          {shift.variance !== null && shift.variance !== undefined ? formatCurrency(shift.variance) : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shift Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Detailed Shift Analysis
            </DialogTitle>
          </DialogHeader>
          
          {selectedShift && (
            <div className="space-y-6">
              {/* Shift Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Shift Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cashier:</span>
                      <span className="font-medium">{selectedShift.shift.userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{selectedShift.shift.locationName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">
                        {formatDuration(selectedShift.shift.openedAt, selectedShift.shift.closedAt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={selectedShift.shift.status === "open" ? "default" : "secondary"}>
                        {selectedShift.shift.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Sales Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transactions:</span>
                      <span className="font-medium">{selectedShift.summary.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Sales:</span>
                      <span className="font-medium">{formatCurrency(selectedShift.summary.totalSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax Collected:</span>
                      <span className="font-medium">{formatCurrency(selectedShift.summary.totalTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Sale:</span>
                      <span className="font-medium">
                        {formatCurrency(
                          selectedShift.summary.totalTransactions > 0 
                            ? selectedShift.summary.totalSales / selectedShift.summary.totalTransactions 
                            : 0
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Reconciliation */}
              {selectedShift.summary.cashVariance !== null && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Cash Reconciliation
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Opening Cash</p>
                      <p className="font-bold text-lg">{formatCurrency(selectedShift.shift.openingCash)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Closing Cash</p>
                      <p className="font-bold text-lg">{formatCurrency(selectedShift.shift.closingCash)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Variance</p>
                      <p className={`font-bold text-lg ${
                        Math.abs(selectedShift.summary.cashVariance) < 0.01 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(selectedShift.summary.cashVariance)}
                        {Math.abs(selectedShift.summary.cashVariance) < 0.01 && (
                          <span className="ml-2 text-green-600">✓</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              <div>
                <h4 className="font-medium mb-3">Payment Method Breakdown</h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedShift.paymentBreakdown.map((payment, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <span className="capitalize font-medium">{payment.paymentMethod}</span>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payment.total)}</p>
                        <p className="text-xs text-muted-foreground">({payment.count} transactions)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Products */}
              <div>
                <h4 className="font-medium mb-3">Top Selling Products</h4>
                <div className="space-y-2">
                  {selectedShift.topProducts.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">#{index + 1} {product.productName}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {product.quantitySold}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(product.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => printShiftSummary(selectedShift)}
                  variant="outline"
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Summary
                </Button>
                <Button 
                  onClick={() => setShowSummaryDialog(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}