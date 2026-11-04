"use client"

import { useState, useEffect, useCallback } from "react"
import POSLayout from "@/components/ui/pos-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Download } from "lucide-react"
import { useSession } from "next-auth/react"

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [locationId, setLocationId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  // Set locationId from session when available
  useEffect(() => {
    if (session?.user?.locationId) {
      setLocationId(session.user.locationId)
    }
  }, [session])

  const fetchReportData = useCallback(async () => {
    if (!locationId || locationId.trim() === "") {
      setError("Location ID is required.")
      setReportData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        locationId,
      })
      const response = await fetch(`/api/reports/sales?${params.toString()}`)
      const data = await response.json()
      if (data.error) {
        setError(data.error)
        setReportData(null)
      } else {
        setReportData(data)
      }
    } catch (error) {
      setError("Error fetching report data.")
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, locationId])

  // Only fetch when all dependencies are ready
  useEffect(() => {
    if (status === "authenticated" && locationId && locationId.trim() !== "") {
      fetchReportData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, locationId, status])

  const exportToCSV = () => {
    if (!reportData) return

    const csvData = [
      ["Date", "Transactions", "Total Sales", "Tax", "Average Sale"],
      ...(reportData.dailySales || []).map((day: any) => [
        day.date,
        day.transactionCount,
        day.totalSales,
        day.totalTax,
        day.averageSale,
      ]),
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sales-report-${startDate}-to-${endDate}${locationId ? `-location-${locationId}` : ""}.csv`
    a.click()
  }

  // Use actual user info if available
  const user = session?.user
    ? {
        firstName: session.user.firstName || "",
        lastName: session.user.lastName || "",
        role: session.user.role || "",
      }
    : { firstName: "Demo", lastName: "User", role: "admin" }

  if (status === "loading") {
    return (
        <div className="p-8 text-center text-gray-500">Loading reports...</div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Sales Reports</h1>
          <Button onClick={exportToCSV} disabled={!reportData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Date Range & Location Display */}
        <Card>
          <CardHeader>
            <CardTitle>Report Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              {/* <div>
                <Label htmlFor="location-id">Location ID</Label>
                <Input
                  id="location-id"
                  value={locationId}
                  disabled
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div> */}
              <Button onClick={fetchReportData} disabled={loading || !locationId || locationId.trim() === ""}>
                {loading ? "Loading..." : "Generate Report"}
              </Button>
            </div>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </CardContent>
        </Card>

        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${Number.parseFloat(reportData.summary?.total_revenue || 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.summary?.total_transactions || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${Number.parseFloat(reportData.summary?.average_transaction || 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${Number.parseFloat(reportData.summary?.total_tax || 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Sales */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(reportData.dailySales || []).map((day: any) => (
                    <div key={day.date} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-500">{day.transactionCount} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${day.totalSales.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Avg: ${day.averageSale.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(reportData.topProducts || []).map((product: any, index: number) => (
                    <div key={product.sku} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">
                          #{index + 1} {product.name}
                        </p>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{product.totalQuantity} sold</p>
                        <p className="text-sm text-gray-500">${product.totalRevenue.toFixed(2)} revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(reportData.paymentMethods || []).map((method: any) => (
                    <div key={method.method} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium capitalize">{method.method}</p>
                        <p className="text-sm text-gray-500">{method.transactionCount} transactions</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${method.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}