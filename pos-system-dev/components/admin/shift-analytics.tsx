"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Clock, Users, Target } from "lucide-react"
import { formatDisplayDate, formatPrice } from "@/lib/standards/formatting"

interface ShiftAnalyticsProps {
  businessId: string
  dateRange?: {
    startDate: string
    endDate: string
  }
  locationId?: string
}

interface AnalyticsData {
  overview: {
    totalShifts: number
    averageShiftDuration: number
    totalRevenue: number
    averageRevenuePerShift: number
    cashVarianceRate: number
    completionRate: number
  }
  variances: {
    totalVariances: number
    majorVariances: number
    minorVariances: number
    averageVariance: number
    variancesByLocation: Array<{
      locationId: string
      locationName: string
      varianceCount: number
      totalVariance: number
    }>
  }
  performance: {
    topPerformers: Array<{
      staffId: string
      staffName: string
      averageRevenue: number
      shiftCount: number
      averageTransactions: number
      efficiencyScore: number
    }>
    locationPerformance: Array<{
      locationId: string
      locationName: string
      averageRevenue: number
      shiftCount: number
      averageEfficiency: number
    }>
  }
  trends: {
    dailyTrends: Array<{
      date: string
      shiftCount: number
      totalRevenue: number
      varianceCount: number
    }>
    hourlyPatterns: Array<{
      hour: number
      averageRevenue: number
      shiftCount: number
    }>
  }
}

export default function ShiftAnalytics({ businessId, dateRange, locationId }: ShiftAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [businessId, dateRange, locationId])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        businessId,
        ...(dateRange && {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
        ...(locationId && { locationId }),
      })

      const response = await fetch(`/api/admin/analytics/shifts?${params.toString()}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error("Error fetching shift analytics:", error)
    } finally {
      setLoading(false)
    }
  }



  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const getVarianceRiskLevel = (variance: number) => {
    if (variance < 1000) return { level: "Low", color: "bg-green-500" }
    if (variance < 5000) return { level: "Medium", color: "bg-yellow-500" }
    return { level: "High", color: "bg-red-500" }
  }

  const getEfficiencyBadge = (score: number) => {
    if (score >= 90) return { label: "Excellent", variant: "default" as const }
    if (score >= 75) return { label: "Good", variant: "secondary" as const }
    if (score >= 60) return { label: "Fair", variant: "outline" as const }
    return { label: "Needs Improvement", variant: "destructive" as const }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No analytics data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalShifts}</div>
            <p className="text-xs text-muted-foreground">
              {formatDuration(data.overview.averageShiftDuration)} avg duration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue per Shift</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(data.overview.averageRevenuePerShift)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(data.overview.totalRevenue)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.cashVarianceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.variances.totalVariances} shifts with variance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.completionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Shifts properly closed
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="variances" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="variances">Cash Variances</TabsTrigger>
          <TabsTrigger value="performance">Staff Performance</TabsTrigger>
          <TabsTrigger value="locations">Location Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="variances" className="space-y-4">
          {/* Variance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Variance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Variances</span>
                  <span className="font-bold">{data.variances.totalVariances}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Major Variances</span>
                  <span className="font-bold text-red-600">{data.variances.majorVariances}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Minor Variances</span>
                  <span className="font-bold text-yellow-600">{data.variances.minorVariances}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Variance</span>
                  <span className="font-bold">{formatPrice(data.variances.averageVariance)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Variances by Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.variances.variancesByLocation.map((location, index) => {
                    const risk = getVarianceRiskLevel(Math.abs(location.totalVariance))
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${risk.color}`}></div>
                            <span className="font-medium">{location.locationName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatPrice(location.totalVariance)}</div>
                            <div className="text-sm text-muted-foreground">
                              {location.varianceCount} shifts
                            </div>
                          </div>
                        </div>
                        <Progress 
                          value={Math.min(100, (Math.abs(location.totalVariance) / 10000) * 100)} 
                          className="h-2"
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performing Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.performance.topPerformers.map((staff, index) => {
                  const efficiency = getEfficiencyBadge(staff.efficiencyScore)
                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">#{index + 1} {staff.staffName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {staff.shiftCount} shifts completed
                          </p>
                        </div>
                        <Badge variant={efficiency.variant}>{efficiency.label}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Avg Revenue</p>
                          <p className="font-bold">{formatPrice(staff.averageRevenue)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Avg Transactions</p>
                          <p className="font-bold">{staff.averageTransactions}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Efficiency</p>
                          <p className="font-bold">{staff.efficiencyScore}%</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Location Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.performance.locationPerformance.map((location, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="font-semibold">{location.locationName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {location.shiftCount} shifts analyzed
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatPrice(location.averageRevenue)}</p>
                        <p className="text-sm text-muted-foreground">Average per shift</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Efficiency Score</span>
                        <span className="font-medium">{location.averageEfficiency.toFixed(1)}%</span>
                      </div>
                      <Progress value={location.averageEfficiency} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.trends.dailyTrends.slice(-7).map((day, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">{formatDisplayDate(day.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {day.shiftCount} shifts • {day.varianceCount} variances
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(day.totalRevenue)}</p>
                        <p className="text-sm text-muted-foreground">Total revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Hourly Performance Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.trends.hourlyPatterns
                    .filter(hour => hour.shiftCount > 0)
                    .sort((a, b) => b.averageRevenue - a.averageRevenue)
                    .slice(0, 8)
                    .map((hour, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">
                          {hour.hour.toString().padStart(2, '0')}:00 - {(hour.hour + 1).toString().padStart(2, '0')}:00
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {hour.shiftCount} active shifts
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(hour.averageRevenue)}</p>
                        <p className="text-sm text-muted-foreground">Avg revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}