"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { FolderSyncIcon as Sync, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { formatDisplayDateTime } from "@/lib/standards/formatting"

interface IntegrationHubProps {
  locationId: string
}

export default function IntegrationHub({ locationId }: IntegrationHubProps) {
  const [integrations, setIntegrations] = useState([
    {
      id: "quickbooks",
      name: "QuickBooks",
      description: "Sync transactions, customers, and products with QuickBooks",
      status: "connected",
      lastSync: "2024-01-15T10:30:00Z",
      enabled: true,
    },
    {
      id: "shopify",
      name: "Shopify",
      description: "Sync inventory and import online orders",
      status: "disconnected",
      lastSync: null,
      enabled: false,
    },
    {
      id: "mailchimp",
      name: "Mailchimp",
      description: "Email marketing automation for customers",
      status: "connected",
      lastSync: "2024-01-15T09:15:00Z",
      enabled: true,
    },
    {
      id: "twilio",
      name: "Twilio SMS",
      description: "Send SMS notifications and marketing messages",
      status: "pending",
      lastSync: null,
      enabled: false,
    },
  ])

  const [syncing, setSyncing] = useState<string | null>(null)

  const handleSync = async (integrationId: string) => {
    setSyncing(integrationId)
    try {
      let response
      switch (integrationId) {
        case "quickbooks":
          response = await fetch("/api/integrations/quickbooks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync_transactions", locationId }),
          })
          break
        case "shopify":
          response = await fetch("/api/integrations/ecommerce", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform: "shopify", action: "sync_inventory", locationId }),
          })
          break
        default:
          throw new Error("Integration not implemented")
      }

      if (response?.ok) {
        const data = await response.json()
        console.log("Sync result:", data)

        // Update integration status
        setIntegrations((prev) =>
          prev.map((integration) =>
            integration.id === integrationId
              ? { ...integration, lastSync: new Date().toISOString(), status: "connected" }
              : integration,
          ),
        )
      }
    } catch (error) {
      console.error("Sync error:", error)
    } finally {
      setSyncing(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "disconnected":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "disconnected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Integration Hub</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(integration.status)}
                  {integration.name}
                </div>
                <Badge className={getStatusColor(integration.status)}>{integration.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{integration.description}</p>

              <div className="flex items-center space-x-2">
                <Switch
                  id={`${integration.id}-enabled`}
                  checked={integration.enabled}
                  onCheckedChange={(checked) =>
                    setIntegrations((prev) =>
                      prev.map((int) => (int.id === integration.id ? { ...int, enabled: checked } : int)),
                    )
                  }
                />
                <Label htmlFor={`${integration.id}-enabled`}>Enable Integration</Label>
              </div>

              {integration.lastSync && (
                <p className="text-xs text-gray-500">Last sync: {formatDisplayDateTime(integration.lastSync)}</p>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSync(integration.id)}
                  disabled={!integration.enabled || syncing === integration.id}
                >
                  <Sync className={`h-4 w-4 mr-1 ${syncing === integration.id ? "animate-spin" : ""}`} />
                  {syncing === integration.id ? "Syncing..." : "Sync Now"}
                </Button>
                <Button size="sm" variant="outline">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
