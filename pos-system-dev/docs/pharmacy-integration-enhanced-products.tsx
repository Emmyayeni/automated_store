// Integration: Enhance existing /admin/products page to detect pharmacy business

"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pill, Package, AlertTriangle } from "lucide-react"
import Link from "next/link"

// Your existing ProductsPage component...
export default function ProductsPage() {
  const { data: session } = useSession()
  const businessId = session?.user?.businessId
  const [business, setBusiness] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])

  // Check if this is a pharmacy business
  const isPharmacyBusiness = business?.industry === 'pharmacy' || 
                            products.some(p => p.drugType || p.requiresPrescription)

  useEffect(() => {
    if (!businessId) return
    
    // Load business info to detect pharmacy industry
    fetch(`/api/business/${businessId}`)
      .then(res => res.json())
      .then(data => setBusiness(data))
    
    // Load products to check for pharmacy fields
    fetch(`/api/products?businessId=${businessId}`)
      .then(res => res.json())
      .then(data => setProducts(data))
  }, [businessId])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
          <p className="text-muted-foreground">
            {isPharmacyBusiness 
              ? "Manage your pharmaceutical inventory and drug catalog"
              : "Manage your inventory and product catalog"
            }
          </p>
        </div>
        <div className="flex space-x-2">
          {/* Existing buttons */}
          <Button variant="outline">Import CSV</Button>
          <Button>Add Product</Button>
          
          {/* Pharmacy-specific buttons */}
          {isPharmacyBusiness && (
            <>
              <Link href="/admin/pharmacy/products">
                <Button variant="outline" className="flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Pharmacy View
                </Button>
              </Link>
              <Link href="/admin/pharmacy/alerts">
                <Button variant="outline" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alerts
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Pharmacy-specific notifications */}
      {isPharmacyBusiness && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Pill className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Pharmacy Management Features Available
                </h3>
                <p className="text-blue-700">
                  Access specialized pharmacy tools for drug management, expiry tracking, 
                  and regulatory compliance.
                </p>
                <div className="flex gap-2 mt-3">
                  <Link href="/admin/pharmacy/products">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Drug Management
                    </Button>
                  </Link>
                  <Link href="/admin/pharmacy/fefo">
                    <Button size="sm" variant="outline" className="border-blue-600 text-blue-600">
                      FEFO Tracking
                    </Button>
                  </Link>
                  <Link href="/admin/settings/currency">
                    <Button size="sm" variant="outline" className="border-blue-600 text-blue-600">
                      SLL Currency
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced product stats for pharmacy */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        
        {isPharmacyBusiness && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prescription Drugs</CardTitle>
                <Pill className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {products.filter(p => p.requiresPrescription).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {products.filter(p => {
                    if (!p.expiryDate) return false
                    const daysUntilExpiry = Math.ceil(
                      (new Date(p.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    )
                    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30
                  }).length}
                </div>
              </CardContent>
            </Card>
          </>
        )}
        
        {/* Existing stats cards... */}
      </div>

      {/* Enhanced product table with pharmacy badges */}
      {/* Your existing table with added pharmacy indicators */}
    </div>
  )
}