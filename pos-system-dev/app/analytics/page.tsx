"use client"

import { useState, useEffect } from "react"
import POSLayout from "@/components/ui/pos-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ForecastingDashboard from "@/components/analytics/forecasting-dashboard"
import IntegrationHub from "@/components/integrations/integration-hub"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, Users, ShoppingBag } from "lucide-react"
import { useSession } from "next-auth/react"

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const [user, setUser] = useState({
    id: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "",
  })
  const [locationId, setLocationId] = useState<string>("")

  useEffect(() => {
    if (session?.user) {
      setUser({
        id: session.user.id ?? "",
        email: session.user.email ?? "",
        firstName: session.user.firstName ?? "",
        lastName: session.user.lastName ?? "",
        role: session.user.role ?? "",
      })
      setLocationId(session.user.locationId ?? "")
    }
  }, [session])

  // Optionally, show a loading state while session is loading
  if (status === "loading") {
    return <div className="p-8 text-center text-gray-500">Loading analytics...</div>
  }

  return (
    <POSLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Advanced Analytics & AI</h1>

        {/* AI Insights Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Predictions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">Forecast accuracy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,450</div>
              <p className="text-xs text-muted-foreground">Next 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customer Insights</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">High-value customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reorder Alerts</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">Items need reordering</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="forecasting" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecasting">AI Forecasting</TabsTrigger>
            <TabsTrigger value="customer-insights">Customer Insights</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="forecasting">
            {locationId ? (
              <ForecastingDashboard locationId={locationId} />
            ) : (
              <div className="text-center text-gray-500">Loading forecasting data...</div>
            )}
          </TabsContent>

          <TabsContent value="customer-insights">
            <Card>
              <CardHeader>
                <CardTitle>Customer Behavior Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">85%</div>
                          <p className="text-sm text-gray-500">Customer Retention</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">$67.50</div>
                          <p className="text-sm text-gray-500">Avg Transaction Value</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">2.3</div>
                          <p className="text-sm text-gray-500">Visits per Month</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-gray-500">Detailed customer analytics coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            {locationId ? (
              <IntegrationHub locationId={locationId} />
            ) : (
              <div className="text-center text-gray-500">Loading integrations...</div>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>System Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Transaction Speed</span>
                            <span className="font-medium">1.2s avg</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: "85%" }}></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>System Uptime</span>
                            <span className="font-medium">99.9%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: "99%" }}></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <p className="text-gray-500">Advanced performance metrics coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </POSLayout>
  )
}