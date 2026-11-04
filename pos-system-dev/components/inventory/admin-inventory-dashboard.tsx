"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import SimpleProductForm from "@/components/products/simple-product-form"
import { Package, Plus, MapPin, Building, BarChart3, AlertTriangle, TrendingUp, Users, Database } from "lucide-react"

interface Location {
  id: string
  name: string
  address?: string
  productCount: number
  lowStockCount: number
  totalValue: number
}

interface AdminProductInventory {
  id: string
  name: string
  strength: string
  manufacturer: string
  category: string
  locations: Array<{
    locationId: string
    locationName: string
    stockLevels: {
      packs: number
      cards: number
      strips: number
      baseUnits: number
      baseUnitName: string
    }
    lowStockAlert: boolean
  }>
  totalStock: {
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
}

interface AdminInventoryDashboardProps {
  businessId: string
}

export default function AdminInventoryDashboard({ businessId }: AdminInventoryDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [locations, setLocations] = useState<Location[]>([])
  const [inventory, setInventory] = useState<AdminProductInventory[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [selectedProductLocation, setSelectedProductLocation] = useState<string>("")

  // Sample data - replace with actual API calls
  useEffect(() => {
    const sampleLocations: Location[] = [
      {
        id: "loc1",
        name: "Main Pharmacy",
        address: "123 Main St, Freetown",
        productCount: 150,
        lowStockCount: 8,
        totalValue: 45000
      },
      {
        id: "loc2", 
        name: "Branch Pharmacy",
        address: "456 Oak Ave, Freetown",
        productCount: 120,
        lowStockCount: 12,
        totalValue: 32000
      },
      {
        id: "loc3",
        name: "Hospital Pharmacy",
        address: "789 Hospital Rd, Freetown", 
        productCount: 200,
        lowStockCount: 5,
        totalValue: 78000
      }
    ]
    setLocations(sampleLocations)

    const sampleInventory: AdminProductInventory[] = [
      {
        id: "1",
        name: "Paracetamol",
        strength: "500mg",
        manufacturer: "PharmaCorp",
        category: "Pain Relief",
        locations: [
          {
            locationId: "loc1",
            locationName: "Main Pharmacy",
            stockLevels: {
              packs: 25,
              cards: 78,
              strips: 156,
              baseUnits: 1560,
              baseUnitName: "tablets"
            },
            lowStockAlert: false
          },
          {
            locationId: "loc2",
            locationName: "Branch Pharmacy", 
            stockLevels: {
              packs: 15,
              cards: 45,
              strips: 90,
              baseUnits: 900,
              baseUnitName: "tablets"
            },
            lowStockAlert: false
          },
          {
            locationId: "loc3",
            locationName: "Hospital Pharmacy",
            stockLevels: {
              packs: 50,
              cards: 150,
              strips: 300,
              baseUnits: 3000,
              baseUnitName: "tablets"
            },
            lowStockAlert: false
          }
        ],
        totalStock: {
          packs: 90,
          cards: 273,
          strips: 546,
          baseUnits: 5460,
          baseUnitName: "tablets"
        },
        pricing: {
          perPack: 24.00,
          perCard: 8.50,
          perStrip: 4.50,
          perBaseUnit: 0.50
        }
      },
      {
        id: "2",
        name: "Amoxicillin",
        strength: "250mg", 
        manufacturer: "MediCorp",
        category: "Antibiotics",
        locations: [
          {
            locationId: "loc1",
            locationName: "Main Pharmacy",
            stockLevels: {
              packs: 5,
              cards: 15,
              strips: 30,
              baseUnits: 300,
              baseUnitName: "capsules"
            },
            lowStockAlert: true
          },
          {
            locationId: "loc2",
            locationName: "Branch Pharmacy",
            stockLevels: {
              packs: 8,
              cards: 24,
              strips: 48,
              baseUnits: 480,
              baseUnitName: "capsules"
            },
            lowStockAlert: false
          }
        ],
        totalStock: {
          packs: 13,
          cards: 39,
          strips: 78,
          baseUnits: 780,
          baseUnitName: "capsules"
        },
        pricing: {
          perPack: 36.00,
          perCard: 12.00,
          perStrip: 6.00,
          perBaseUnit: 0.60
        }
      }
    ]
    setInventory(sampleInventory)
  }, [businessId])

  const getFilteredInventory = () => {
    if (selectedLocation === "all") return inventory
    return inventory.filter(item => 
      item.locations.some(loc => loc.locationId === selectedLocation)
    )
  }

  const getTotalStats = () => {
    const stats = {
      totalProducts: 0,
      totalLocations: locations.length,
      lowStockAlerts: 0,
      totalValue: 0
    }

    inventory.forEach(product => {
      stats.totalProducts++
      stats.totalValue += product.totalStock.packs * product.pricing.perPack
      product.locations.forEach(loc => {
        if (loc.lowStockAlert) stats.lowStockAlerts++
      })
    })

    return stats
  }

  const stats = getTotalStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage inventory across all locations with smart UOM tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setActiveTab("bulk-operations")}
          >
            <Database className="h-4 w-4 mr-2" />
            Bulk Operations
          </Button>
          <Button onClick={() => setShowAddProduct(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Locations</p>
                <p className="text-2xl font-bold">{stats.totalLocations}</p>
              </div>
              <Building className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600">{stats.lowStockAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Inventory Value</p>
                <p className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="by-location">🏢 By Location</TabsTrigger>
          <TabsTrigger value="low-stock">⚠️ Low Stock</TabsTrigger>
          <TabsTrigger value="bulk-operations">⚙️ Bulk Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Location Filter */}
            <div className="flex items-center gap-4">
              <Label htmlFor="location-filter">Filter by Location:</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {getFilteredInventory().map((product) => (
                <Card key={product.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{product.name} {product.strength}</CardTitle>
                        <p className="text-sm text-gray-500">{product.manufacturer}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {product.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Total Stock Summary */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-medium text-sm text-blue-900 mb-2">Total Across All Locations</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Packs:</span>
                          <span className="font-bold text-blue-700">{product.totalStock.packs}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cards:</span>
                          <span className="font-bold text-blue-700">{product.totalStock.cards}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Strips:</span>
                          <span className="font-bold text-blue-700">{product.totalStock.strips}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{product.totalStock.baseUnitName}:</span>
                          <span className="font-bold text-blue-700">{product.totalStock.baseUnits}</span>
                        </div>
                      </div>
                    </div>

                    {/* Location Breakdown */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Stock by Location</h4>
                      {product.locations.map((location) => (
                        <div key={location.locationId} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">{location.locationName}</span>
                            {location.lowStockAlert && (
                              <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                            )}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{location.stockLevels.packs}pk</span>
                            <span className="text-gray-500 ml-2">
                              ({location.stockLevels.baseUnits} {location.stockLevels.baseUnitName})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pricing Info */}
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-medium text-sm text-green-900 mb-2">Pricing Structure</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Pack: ${product.pricing.perPack}</div>
                        <div>Card: ${product.pricing.perCard}</div>
                        <div>Strip: ${product.pricing.perStrip}</div>
                        <div>{product.totalStock.baseUnitName}: ${product.pricing.perBaseUnit}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="by-location">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {locations.map((location) => (
              <Card key={location.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {location.name}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{location.address}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Products:</span>
                      <span className="font-bold">{location.productCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Low Stock:</span>
                      <span className={`font-bold ${location.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {location.lowStockCount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Value:</span>
                      <span className="font-bold">${location.totalValue.toLocaleString()}</span>
                    </div>
                    <Button 
                      className="w-full mt-3" 
                      variant="outline"
                      onClick={() => setSelectedLocation(location.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventory.filter(product => 
                  product.locations.some(loc => loc.lowStockAlert)
                ).map((product) => (
                  <div key={product.id} className="border border-red-200 bg-red-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{product.name} {product.strength}</h3>
                        <p className="text-sm text-gray-600">{product.manufacturer}</p>
                      </div>
                      <Badge variant="destructive">Low Stock</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      {product.locations.filter(loc => loc.lowStockAlert).map((location) => (
                        <div key={location.locationId} className="flex justify-between items-center">
                          <span className="text-sm">{location.locationName}</span>
                          <span className="text-sm font-medium">
                            {location.stockLevels.packs} packs ({location.stockLevels.baseUnits} {location.stockLevels.baseUnitName})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-operations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Stock Transfer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-4">Transfer stock between locations</p>
                <Button className="w-full" variant="outline">
                  Start Transfer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bulk Price Update</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-4">Update prices across all locations</p>
                <Button className="w-full" variant="outline">
                  Update Prices
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-4">Export comprehensive inventory report</p>
                <Button className="w-full" variant="outline">
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock Reorder</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-4">Bulk reorder low stock items</p>
                <Button className="w-full" variant="outline">
                  Create Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <SimpleProductForm
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onProductAdded={() => {
          setShowAddProduct(false)
          // Refresh data
        }}
        locationId={selectedProductLocation}
      />
    </div>
  )
}