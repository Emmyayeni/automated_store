"use client"

import { useState, useEffect } from "react"
import POSLayout from "@/components/ui/pos-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PromotionManager from "@/components/settings/promotion-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Store, CreditCard, Printer, SettingsIcon } from "lucide-react"
import { useSession } from "next-auth/react"

export default function SettingsPage() {
  const { data: session } = useSession()
  const [locationId, setLocationId] = useState<string>("")

  useEffect(() => {
    if (session?.user?.locationId) {
      setLocationId(session.user.locationId)
    }
  }, [session?.user?.locationId])

  const [storeSettings, setStoreSettings] = useState({
    storeName: "",
    storeAddress: "",
    storePhone: "",
    storeEmail: "",
    taxRate: "",
    receiptFooter: "",
    autoPrintReceipt: false,
  })

  // Fetch store settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      if (!locationId) return
      try {
        const res = await fetch(`/api/locations/${locationId}`)
        if (!res.ok) throw new Error("Failed to fetch settings")
        const data = await res.json()
        setStoreSettings({
          storeName: data.storeName ?? "",
          storeAddress: data.storeAddress ?? "",
          storePhone: data.storePhone ?? "",
          storeEmail: data.storeEmail ?? "",
          taxRate: data.taxRate ?? "",
          receiptFooter: data.receiptFooter ?? "",
          autoPrintReceipt: data.autoPrintReceipt ?? false,
        })
      } catch (err) {
        // fallback to defaults or show error
      }
    }
    fetchSettings()
  }, [locationId])

  const handleSaveSettings = async () => {
    try {
      const payload = {
        storeName: storeSettings.storeName,
        storeAddress: storeSettings.storeAddress,
        storePhone: storeSettings.storePhone,
        storeEmail: storeSettings.storeEmail,
        taxRate: storeSettings.taxRate,
        receiptFooter: storeSettings.receiptFooter,
        autoPrintReceipt: storeSettings.autoPrintReceipt,
      }
      const res = await fetch(`/api/locations/${locationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save settings")
      alert("Settings saved successfully!")
    } catch (err) {
      alert("Failed to save settings.")
    }
  }

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">System Settings</h1>

        <Tabs defaultValue="store" className="space-y-4">
          <TabsList>
            <TabsTrigger value="store">Store Settings</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="users">User Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Store Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="store-name">Store Name</Label>
                    <Input
                      id="store-name"
                      value={storeSettings.storeName}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={storeSettings.storePhone}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storePhone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={storeSettings.storeAddress}
                    onChange={(e) => setStoreSettings({ ...storeSettings, storeAddress: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={storeSettings.storeEmail}
                      onChange={(e) => setStoreSettings({ ...storeSettings, storeEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                    <Input
                      id="tax-rate"
                      type="number"
                      step="0.01"
                      value={storeSettings.taxRate}
                      onChange={(e) => setStoreSettings({ ...storeSettings, taxRate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="receipt-footer">Receipt Footer</Label>
                  <Input
                    id="receipt-footer"
                    value={storeSettings.receiptFooter}
                    onChange={(e) => setStoreSettings({ ...storeSettings, receiptFooter: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-print"
                    checked={storeSettings.autoPrintReceipt}
                    onCheckedChange={(checked) => setStoreSettings({ ...storeSettings, autoPrintReceipt: checked })}
                  />
                  <Label htmlFor="auto-print">Automatically print receipts</Label>
                </div>

                <Button onClick={handleSaveSettings}>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotions">
            <PromotionManager locationId={locationId || "main-location-id"} />
          </TabsContent>

          <TabsContent value="hardware">
            {/* ...hardware tab code... */}
          </TabsContent>

          <TabsContent value="payments">
            {/* ...payments tab code... */}
          </TabsContent>

          <TabsContent value="users">
            {/* ...users tab code... */}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}