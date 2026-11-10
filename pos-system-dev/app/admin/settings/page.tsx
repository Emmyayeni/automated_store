"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, CreditCard, Bell, Shield, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/ui/page-header"

export default function SettingsPage() {
  const [businessSettings, setBusinessSettings] = useState({
    name: "",
    logoUrl: "",
    industry: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    taxRate: "",
    currency: "USD",
    timezone: "America/New_York",
  })

  const [stripeSettings, setStripeSettings] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    testMode: true,
  })

  const [notifications, setNotifications] = useState({
    emailOrders: true,
    emailLowStock: true,
    emailReports: false,
    pushOrders: true,
    pushLowStock: true,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Load business settings from API on mount
  useEffect(() => {
    fetch("/api/business")
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setBusinessSettings(prev => ({
            ...prev,
            name: data.name || "",
            logoUrl: data.logoUrl || "",
            industry: data.industry || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            taxRate: data.taxRate || "",
            currency: data.currency || "NGN",
            timezone: data.timezone || "Africa/Lagos",
          }))
        }
      })
      .catch(() => {})
  }, [])

  // PATCH business settings to API
  const handleSaveBusinessSettings = async () => {
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessSettings),
      })
      if (!res.ok) throw new Error("Failed to save business settings")
      toast.success("Business settings saved successfully!")
    } catch (e) {
      toast.error("Failed to save business settings")
    }
  }

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setBusinessSettings(prev => ({
          ...prev,
          logoUrl: data.url,
        }))
        toast.success("Logo uploaded!")
      } else {
        toast.error("Failed to upload logo")
      }
    } catch {
      toast.error("Failed to upload logo")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveStripeSettings = () => {
    toast.success("Stripe settings saved successfully!")
  }

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!")
  }

  // DELETE tenant (business) via API
  const handleDeleteTenant = async () => {
    if (confirm("Are you sure you want to delete your tenant? This action cannot be undone.")) {
      try {
        const res = await fetch("/api/business", { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete tenant")
        toast.error("Tenant deleted. You will be logged out.")
        // Optionally: redirect or reload
      } catch {
        toast.error("Failed to delete tenant")
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System & Supermarket Settings"
        description="Configure retail business credentials, branch defaults, and notifications."
        breadcrumbs={[
          { label: "Management", href: "/admin/settings" },
          { label: "Settings" },
        ]}
      />

      {/* Business Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>Update your business details and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={businessSettings.logoUrl || "/placeholder.svg"} />
              <AvatarFallback className="text-lg">
                <Building2 className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input
                id="business-name"
                value={businessSettings.name}
                onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={businessSettings.phone}
                onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={businessSettings.address}
              onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={businessSettings.email}
                onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={businessSettings.website}
                onChange={(e) => setBusinessSettings({ ...businessSettings, website: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.1"
                value={businessSettings.taxRate}
                onChange={(e) => setBusinessSettings({ ...businessSettings, taxRate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={businessSettings.currency}
                onValueChange={(value) => setBusinessSettings({ ...businessSettings, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={businessSettings.timezone}
                onValueChange={(value) => setBusinessSettings({ ...businessSettings, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSaveBusinessSettings}>Save Business Settings</Button>
        </CardContent>
      </Card>

      {/* Stripe Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Settings (Stripe)
          </CardTitle>
          <CardDescription>Configure your Stripe payment processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="test-mode"
              checked={stripeSettings.testMode}
              onCheckedChange={(checked) => setStripeSettings({ ...stripeSettings, testMode: checked })}
            />
            <Label htmlFor="test-mode">Test Mode</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publishable-key">Publishable Key</Label>
            <Input
              id="publishable-key"
              type="password"
              placeholder="pk_test_..."
              value={stripeSettings.publishableKey}
              onChange={(e) => setStripeSettings({ ...stripeSettings, publishableKey: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key</Label>
            <Input
              id="secret-key"
              type="password"
              placeholder="sk_test_..."
              value={stripeSettings.secretKey}
              onChange={(e) => setStripeSettings({ ...stripeSettings, secretKey: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <Input
              id="webhook-secret"
              type="password"
              placeholder="whsec_..."
              value={stripeSettings.webhookSecret}
              onChange={(e) => setStripeSettings({ ...stripeSettings, webhookSecret: e.target.value })}
            />
          </div>

          <Button onClick={handleSaveStripeSettings}>Save Stripe Settings</Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-4">Email Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-orders">New Orders</Label>
                  <p className="text-sm text-muted-foreground">Get notified when new orders are placed</p>
                </div>
                <Switch
                  id="email-orders"
                  checked={notifications.emailOrders}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailOrders: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-low-stock">Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when products are running low</p>
                </div>
                <Switch
                  id="email-low-stock"
                  checked={notifications.emailLowStock}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailLowStock: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-reports">Daily Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive daily sales reports via email</p>
                </div>
                <Switch
                  id="email-reports"
                  checked={notifications.emailReports}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailReports: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-4">Push Notifications</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-orders">New Orders</Label>
                  <p className="text-sm text-muted-foreground">Push notifications for new orders</p>
                </div>
                <Switch
                  id="push-orders"
                  checked={notifications.pushOrders}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, pushOrders: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-low-stock">Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">Push notifications for low stock</p>
                </div>
                <Switch
                  id="push-low-stock"
                  checked={notifications.pushLowStock}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, pushLowStock: checked })}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveNotifications}>Save Notification Settings</Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
            <div>
              <h4 className="text-sm font-medium">Delete Tenant</h4>
              <p className="text-sm text-muted-foreground">Permanently delete your tenant and all associated data</p>
            </div>
            <Button variant="destructive" onClick={handleDeleteTenant}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Tenant
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}