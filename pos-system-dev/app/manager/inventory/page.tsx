"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import SimpleInventoryDashboard from "@/components/inventory/simple-inventory-dashboard"
import SimpleProductForm from "@/components/products/simple-product-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, MapPin, Store, Plus, Package, BarChart3 } from "lucide-react"

interface Location {
  id: string
  name: string
  address?: string
}

export default function InventoryPage() {
  const { data: session } = useSession()
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const locationId = session?.user?.locationId

  useEffect(() => {
    if (locationId) {
      // Fetch location details
      fetch(`/api/locations/${locationId}`)
        .then(res => res.json())
        .then(data => {
          setLocation(data)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [locationId])

  const handleProductAdded = () => {
    setRefreshKey(prev => prev + 1)
    setShowAddProduct(false)
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Please log in to access inventory management.</p>
      </div>
    )
  }

  if (session.user.role !== 'MANAGER') {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You need manager privileges to access this page.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!locationId) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            Location Required
          </CardTitle>
          <CardDescription>
            You need to be assigned to a location to manage inventory. Please contact your administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading location information...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Monitor, adjust, and track inventory with smart UOM packaging
          </p>
        </div>
        <Button onClick={() => setShowAddProduct(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Product
        </Button>
      </div>

      {/* Location Information */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Store className="h-5 w-5" />
            Your Assigned Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{location?.name || 'Unknown Location'}</span>
            </div>
            {location?.address && (
              <div className="text-sm text-muted-foreground">
                {location.address}
              </div>
            )}
            <Badge variant="secondary">Manager Access</Badge>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Multi-level packaging supported</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600">Real-time stock tracking</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">📊 Inventory Dashboard</TabsTrigger>
          <TabsTrigger value="reports">📈 Reports & Analytics</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SimpleInventoryDashboard key={refreshKey} locationId={locationId} />
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Reports</CardTitle>
              <CardDescription>
                Analyze stock movements, sales patterns, and inventory turnover
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Package className="h-6 w-6" />
                  <span>Stock Report</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>Movement Report</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <AlertTriangle className="h-6 w-6" />
                  <span>Low Stock Alert</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>
                Configure stock thresholds, alerts, and UOM preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Inventory settings configuration coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <SimpleProductForm
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onProductAdded={handleProductAdded}
        locationId={locationId}
      />
    </div>
  )
}