"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Brain, RefreshCw } from "lucide-react"
import { formatPrice, formatDisplayDate } from "@/lib/standards/formatting"

interface ForecastingDashboardProps {
  locationId: string
}

export default function ForecastingDashboard({ locationId }: ForecastingDashboardProps) {
  const [forecasts, setForecasts] = useState<any[]>([])
  const [reorderSuggestions, setReorderSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchForecasts = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics/forecasting?locationId=${locationId}&days=7`)
      const data = await response.json()
      setForecasts(Array.isArray(data.forecasts) ? data.forecasts.slice(0, 10) : [])
    } catch (error) {
      console.error("Error fetching forecasts:", error)
      setForecasts([])
    } finally {
      setLoading(false)
    }
  }, [locationId])

  const fetchReorderSuggestions = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/reorder-suggestions?locationId=${locationId}`)
      const data = await response.json()
      setReorderSuggestions(Array.isArray(data) ? data.slice(0, 5) : [])
    } catch (error) {
      console.error("Error fetching reorder suggestions:", error)
      setReorderSuggestions([])
    }
  }, [locationId])

  useEffect(() => {
    fetchForecasts()
    fetchReorderSuggestions()
  }, [fetchForecasts, fetchReorderSuggestions])

  const handleApproveReorder = async (suggestionIds: string[]) => {
    try {
      const response = await fetch("/api/analytics/reorder-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionIds, action: "approve" }),
      })

      if (response.ok) {
        fetchReorderSuggestions()
      }
    } catch (error) {
      console.error("Error approving reorder:", error)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Analytics & Forecasting
        </h2>
        <Button onClick={fetchForecasts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Sales Forecasts */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Sales Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          {forecasts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No forecast data available</p>
          ) : (
            <div className="space-y-3">
              {forecasts.map((forecast, index) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <h4 className="font-medium">{forecast.productName}</h4>
                    <p className="text-sm text-gray-500">{forecast.forecastDate ? formatDisplayDate(forecast.forecastDate) : ""}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{forecast.predictedQuantity} units</span>
                    </div>
                    <p className="text-sm text-gray-500">{formatPrice(forecast.predictedRevenue || 0)}</p>
                    <Badge variant="outline" className="text-xs">
                      {forecast.confidenceScore !== undefined ? Math.round(forecast.confidenceScore * 100) : 0}% confidence
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reorder Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>AI Reorder Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          {reorderSuggestions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No reorder suggestions at this time</p>
          ) : (
            <div className="space-y-3">
              {reorderSuggestions.map((suggestion: any) => (
                <div key={suggestion.id} className="flex justify-between items-center p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{suggestion.productName}</h4>
                      <Badge className={getUrgencyColor(suggestion.urgencyLevel)}>{suggestion.urgencyLevel}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">SKU: {suggestion.sku}</p>
                    <p className="text-sm text-gray-600">{suggestion.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Order {suggestion.suggestedQuantity} units</p>
                    <p className="text-sm text-gray-500">Current: {suggestion.currentStock}</p>
                    <p className="text-sm text-green-600">{formatPrice(suggestion.estimatedCost || 0)}</p>
                    <Button size="sm" onClick={() => handleApproveReorder([suggestion.id])} className="mt-2">
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}