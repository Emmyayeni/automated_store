"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Globe,
  Sliders,
  Bell,
  Upload,
  CheckCircle2,
  Save,
  RefreshCw,
  Store,
  ShieldCheck,
  Package,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  Percent,
  Clock,
  Coins
} from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/ui/page-header"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Business Profile & Regional Standards
  const [businessSettings, setBusinessSettings] = useState({
    name: "Apex Multi-Branch Supermarket",
    logoUrl: "",
    industry: "Supermarket & Multi-Branch Retail",
    address: "Plot 12, Commercial Central District, Victoria Island, Lagos, Nigeria",
    phone: "+234 1 800 2739",
    email: "operations@apexretail.ng",
    website: "https://apexretail.ng",
    taxRate: "7.5",
    currency: "NGN",
    timezone: "Africa/Lagos",
  })

  // Supermarket Inventory Control Policies
  const [inventoryPolicies, setInventoryPolicies] = useState({
    defaultLowStockThreshold: 10,
    defaultReorderBuffer: 25,
    enforceStrictStockControl: true, // prevent POS sales if stock is 0
    requireTransferApproval: true, // dual branch verification on transfer
    autoGenerateSKUs: true, // automatically assign SKU on new item registration
    trackPerishableDates: true, // enable expiry date validation on perishables
  })

  // Notifications & Alerts
  const [notifications, setNotifications] = useState({
    emailLowStock: true,
    emailDailyReports: true,
    emailTransferAlerts: true,
    pushLowStock: true,
    pushOrderReceipts: true,
    pushStockDiscrepancies: true,
  })

  // Load business settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/business")
        if (res.ok) {
          const json = await res.json()
          const data = json?.data || json
          if (data && !data.error) {
            setBusinessSettings(prev => ({
              ...prev,
              name: data.name || prev.name,
              logoUrl: data.logoUrl || prev.logoUrl,
              industry: data.industry || prev.industry,
              address: data.address || prev.address,
              phone: data.phone || prev.phone,
              email: data.email || prev.email,
              website: data.website || prev.website,
              taxRate: data.taxRate ? String(data.taxRate) : prev.taxRate,
              currency: data.currency || prev.currency,
              timezone: data.timezone || prev.timezone,
            }))
          }
        }

        // Load cached local policy overrides if present
        const savedPolicies = localStorage.getItem("stockflow_inventory_policies")
        if (savedPolicies) {
          try {
            setInventoryPolicies(JSON.parse(savedPolicies))
          } catch {}
        }
        const savedNotifs = localStorage.getItem("stockflow_notifications")
        if (savedNotifs) {
          try {
            setNotifications(JSON.parse(savedNotifs))
          } catch {}
        }
      } catch (err) {
        console.error("Error loading settings:", err)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save all business settings via API
  const handleSaveBusinessSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(businessSettings),
      })

      if (!res.ok) {
        // Fallback to PATCH if PUT is restricted
        const patchRes = await fetch("/api/business", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(businessSettings),
        })
        if (!patchRes.ok) throw new Error("Failed to update settings")
      }

      // Persist client operational policies
      localStorage.setItem("stockflow_inventory_policies", JSON.stringify(inventoryPolicies))
      localStorage.setItem("stockflow_notifications", JSON.stringify(notifications))

      toast.success("Settings updated successfully", {
        description: "Supermarket profile and inventory standards have been synchronized."
      })
    } catch (err) {
      console.error("Save error:", err)
      toast.error("Failed to save settings", {
        description: "Please check your network connection and retry."
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle Logo Upload
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
        toast.success("Supermarket logo uploaded")
      } else {
        // Fallback: create object URL for immediate live display
        const localPreview = URL.createObjectURL(file)
        setBusinessSettings(prev => ({
          ...prev,
          logoUrl: localPreview,
        }))
        toast.success("Logo updated for this session")
      }
    } catch {
      const localPreview = URL.createObjectURL(file)
      setBusinessSettings(prev => ({
        ...prev,
        logoUrl: localPreview,
      }))
      toast.success("Logo updated for this session")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <PageHeader
        title="Supermarket & System Settings"
        description="Configure your supermarket retail profile, regional currency defaults, inventory control policies, and operational alerts."
        breadcrumbs={[
          { label: "Management", href: "/admin" },
          { label: "Settings" },
        ]}
        actions={
          <Button
            onClick={handleSaveBusinessSettings}
            disabled={saving || loading}
            className="bg-[#14532D] hover:bg-[#0f3e22] text-white font-semibold text-xs h-9 shadow-sm"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save All Changes
              </>
            )}
          </Button>
        }
      />

      {/* Quick Summary Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#14532D]">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{businessSettings.name || "Apex Supermarket"}</span>
            <span className="text-[11px] text-slate-500 font-medium">
              Multi-Branch Inventory Network • Central Management Workstation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono text-[11px]">
            Currency: {businessSettings.currency === "NGN" ? "₦ (NGN)" : businessSettings.currency}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[11px]">
            VAT: {businessSettings.taxRate}%
          </Badge>
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]">
            {businessSettings.timezone}
          </Badge>
        </div>
      </div>

      {/* Main Settings Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100/90 p-1 rounded-xl h-auto border border-slate-200">
          <TabsTrigger
            value="profile"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#14532D] data-[state=active]:shadow-2xs rounded-lg"
          >
            <Building2 className="h-4 w-4" />
            <span>Supermarket Profile</span>
          </TabsTrigger>
          <TabsTrigger
            value="regional"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#14532D] data-[state=active]:shadow-2xs rounded-lg"
          >
            <Globe className="h-4 w-4" />
            <span>Currency & Region</span>
          </TabsTrigger>
          <TabsTrigger
            value="policies"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#14532D] data-[state=active]:shadow-2xs rounded-lg"
          >
            <Sliders className="h-4 w-4" />
            <span>Inventory Policies</span>
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="flex items-center gap-2 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#14532D] data-[state=active]:shadow-2xs rounded-lg"
          >
            <Bell className="h-4 w-4" />
            <span>Alerts & Audits</span>
          </TabsTrigger>
        </TabsList>

        {/* ────────────── TAB 1: SUPERMARKET PROFILE ────────────── */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="h-4 w-4 text-[#14532D]" />
                Supermarket Identity & Branding
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official retail brand information displayed on POS customer receipts, stock transfer manifests, and audit reports.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Logo & Avatar Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <Avatar className="h-16 w-16 rounded-xl border border-slate-200 shadow-xs bg-white">
                  <AvatarImage src={businessSettings.logoUrl} className="object-cover" />
                  <AvatarFallback className="rounded-xl bg-[#14532D] text-white font-bold text-lg">
                    {businessSettings.name?.slice(0, 2).toUpperCase() || "AP"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-xs font-bold text-slate-900">Brand Logo / Supermarket Mark</h4>
                  <p className="text-[11px] text-slate-500">
                    Recommended: Transparent PNG or SVG (512x512px). Appears on printable POS receipts and navigation header.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs font-semibold border-slate-300"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {uploading ? "Uploading..." : "Upload New Logo"}
                    </Button>
                    {businessSettings.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setBusinessSettings(prev => ({ ...prev, logoUrl: "" }))}
                        className="h-8 text-xs text-slate-500 hover:text-rose-600"
                      >
                        Reset to Default
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="biz-name" className="text-xs font-bold text-slate-700">
                    Supermarket Brand Name *
                  </Label>
                  <Input
                    id="biz-name"
                    value={businessSettings.name}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, name: e.target.value })}
                    className="h-9 text-xs border-slate-300 focus-visible:ring-[#14532D]"
                    placeholder="e.g. Apex Multi-Branch Supermarket"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-industry" className="text-xs font-bold text-slate-700">
                    Retail Category / Sector
                  </Label>
                  <Input
                    id="biz-industry"
                    value={businessSettings.industry}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, industry: e.target.value })}
                    className="h-9 text-xs border-slate-300 focus-visible:ring-[#14532D]"
                    placeholder="e.g. Supermarket & Fast-Moving Consumer Goods"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="biz-email" className="text-xs font-bold text-slate-700">
                    Central Operations Email *
                  </Label>
                  <Input
                    id="biz-email"
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
                    className="h-9 text-xs border-slate-300 focus-visible:ring-[#14532D]"
                    placeholder="operations@supermarket.ng"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-phone" className="text-xs font-bold text-slate-700">
                    Headquarters Phone *
                  </Label>
                  <Input
                    id="biz-phone"
                    value={businessSettings.phone}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
                    className="h-9 text-xs border-slate-300 focus-visible:ring-[#14532D]"
                    placeholder="+234 1 234 5678"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biz-web" className="text-xs font-bold text-slate-700">
                    Company Website
                  </Label>
                  <Input
                    id="biz-web"
                    value={businessSettings.website}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, website: e.target.value })}
                    className="h-9 text-xs border-slate-300 focus-visible:ring-[#14532D]"
                    placeholder="https://apexretail.ng"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="biz-addr" className="text-xs font-bold text-slate-700">
                  Headquarters Physical Address
                </Label>
                <Textarea
                  id="biz-addr"
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
                  rows={2}
                  className="text-xs border-slate-300 focus-visible:ring-[#14532D] resize-none"
                  placeholder="Plot 12, Commercial Central District, Victoria Island, Lagos, Nigeria"
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                onClick={handleSaveBusinessSettings}
                disabled={saving}
                className="bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold h-8"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Update Profile Details
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ────────────── TAB 2: CURRENCY & REGION ────────────── */}
        <TabsContent value="regional" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Coins className="h-4 w-4 text-[#14532D]" />
                Currency, Taxation & Fiscal Standards
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure your retail base currency symbol, sales tax (VAT), and regional timezone.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-curr" className="text-xs font-bold text-slate-700">
                    Primary Operational Currency *
                  </Label>
                  <Select
                    value={businessSettings.currency}
                    onValueChange={(val) => setBusinessSettings({ ...businessSettings, currency: val })}
                  >
                    <SelectTrigger id="reg-curr" className="h-9 text-xs border-slate-300 focus:ring-[#14532D]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">Nigerian Naira (₦ NGN) — Default</SelectItem>
                      <SelectItem value="USD">US Dollar ($ USD)</SelectItem>
                      <SelectItem value="EUR">Euro (€ EUR)</SelectItem>
                      <SelectItem value="GBP">British Pound (£ GBP)</SelectItem>
                      <SelectItem value="GHS">Ghanaian Cedi (₵ GHS)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    Used across all branch POS terminals, inventory valuation, and sales ledgers.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-tax" className="text-xs font-bold text-slate-700">
                    Standard Sales Tax / VAT Rate (%) *
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-tax"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={businessSettings.taxRate}
                      onChange={(e) => setBusinessSettings({ ...businessSettings, taxRate: e.target.value })}
                      className="h-9 text-xs border-slate-300 focus-visible:ring-[#14532D] pr-8 font-mono"
                      placeholder="7.5"
                    />
                    <Percent className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Standard Nigerian VAT is 7.5%. Automatically computed during POS terminal checkout.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-tz" className="text-xs font-bold text-slate-700">
                    Supermarket Timezone *
                  </Label>
                  <Select
                    value={businessSettings.timezone}
                    onValueChange={(val) => setBusinessSettings({ ...businessSettings, timezone: val })}
                  >
                    <SelectTrigger id="reg-tz" className="h-9 text-xs border-slate-300 focus:ring-[#14532D]">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lagos">Africa/Lagos (West Africa Time, GMT+1)</SelectItem>
                      <SelectItem value="Africa/Accra">Africa/Accra (GMT)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (Eastern Time)</SelectItem>
                      <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    Determines daily shift open/close audit stamps and sales reporting cycles.
                  </p>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Live Price Display Preview
                </span>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Shelf Product Tag</span>
                    <span className="text-lg font-black text-[#14532D] font-mono">
                      {businessSettings.currency === "NGN" ? "₦" : businessSettings.currency + " "}3,200.00
                    </span>
                  </div>
                  <div className="border-l border-slate-200 pl-6">
                    <span className="text-[10px] text-slate-400 block font-medium">Cart Subtotal (inc. {businessSettings.taxRate}% VAT)</span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {businessSettings.currency === "NGN" ? "₦" : businessSettings.currency + " "}
                      {(3200 * (1 + (parseFloat(businessSettings.taxRate) || 0) / 100)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                onClick={handleSaveBusinessSettings}
                disabled={saving}
                className="bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold h-8"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Save Currency & Tax Rules
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ────────────── TAB 3: INVENTORY POLICIES ────────────── */}
        <TabsContent value="policies" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#14532D]" />
                Inventory Control & Shelf Replenishment Policies
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enforce operational safeguards, transfer confirmation workflows, and safety stock rules across branches.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <Label htmlFor="pol-low" className="text-xs font-bold text-slate-800">
                    Default Low-Stock Warning Threshold
                  </Label>
                  <Input
                    id="pol-low"
                    type="number"
                    min="1"
                    value={inventoryPolicies.defaultLowStockThreshold}
                    onChange={(e) =>
                      setInventoryPolicies({
                        ...inventoryPolicies,
                        defaultLowStockThreshold: parseInt(e.target.value) || 5,
                      })
                    }
                    className="h-9 text-xs border-slate-300 focus-visible:ring-[#14532D] font-mono bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Triggers yellow amber alert status when shelf inventory drops to or below this count.
                  </p>
                </div>

                <div className="space-y-1.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                  <Label htmlFor="pol-reorder" className="text-xs font-bold text-slate-800">
                    Default Suggested Reorder Buffer (Units)
                  </Label>
                  <Input
                    id="pol-reorder"
                    type="number"
                    min="1"
                    value={inventoryPolicies.defaultReorderBuffer}
                    onChange={(e) =>
                      setInventoryPolicies({
                        ...inventoryPolicies,
                        defaultReorderBuffer: parseInt(e.target.value) || 20,
                      })
                    }
                    className="h-9 text-xs border-slate-300 focus-visible:ring-[#14532D] font-mono bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Recommended restock quantity populated automatically in purchase order suggestions.
                  </p>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              {/* Policy Toggles */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label htmlFor="pol-strict" className="text-xs font-bold text-slate-900 cursor-pointer">
                      Enforce Strict Non-Negative Stock at POS
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Prevents cashiers from completing sales for products with 0 recorded shelf stock, eliminating ledger anomalies.
                    </p>
                  </div>
                  <Switch
                    id="pol-strict"
                    checked={inventoryPolicies.enforceStrictStockControl}
                    onCheckedChange={(val) =>
                      setInventoryPolicies({ ...inventoryPolicies, enforceStrictStockControl: val })
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label htmlFor="pol-transfer" className="text-xs font-bold text-slate-900 cursor-pointer">
                      Dual Verification on Inter-Branch Stock Transfers
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Transfers remain in "In-Transit" status until the receiving branch manager accepts the dispatch manifest.
                    </p>
                  </div>
                  <Switch
                    id="pol-transfer"
                    checked={inventoryPolicies.requireTransferApproval}
                    onCheckedChange={(val) =>
                      setInventoryPolicies({ ...inventoryPolicies, requireTransferApproval: val })
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label htmlFor="pol-sku" className="text-xs font-bold text-slate-900 cursor-pointer">
                      Auto-Generate Unique SKU & Barcode Format
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Automatically generates standard retail SKU codes (e.g. SKU-PRD-001) for newly registered catalog products.
                    </p>
                  </div>
                  <Switch
                    id="pol-sku"
                    checked={inventoryPolicies.autoGenerateSKUs}
                    onCheckedChange={(val) =>
                      setInventoryPolicies({ ...inventoryPolicies, autoGenerateSKUs: val })
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-0.5">
                    <Label htmlFor="pol-perish" className="text-xs font-bold text-slate-900 cursor-pointer">
                      Perishable & Dairy Expiry Tracking Buffer
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      Enables batch number and expiry date input fields for Bakery, Dairy, and Produce departments.
                    </p>
                  </div>
                  <Switch
                    id="pol-perish"
                    checked={inventoryPolicies.trackPerishableDates}
                    onCheckedChange={(val) =>
                      setInventoryPolicies({ ...inventoryPolicies, trackPerishableDates: val })
                    }
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                onClick={handleSaveBusinessSettings}
                disabled={saving}
                className="bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold h-8"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Apply Inventory Safeguards
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ────────────── TAB 4: ALERTS & AUDITS ────────────── */}
        <TabsContent value="alerts" className="mt-4 space-y-4">
          <Card className="border-slate-200 shadow-2xs bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#14532D]" />
                Automated System Notifications & Ledgers
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Choose automated email and live system broadcasts for branch managers and store auditors.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Broadcast & Email Notifications
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                    <div>
                      <Label htmlFor="n-low" className="text-xs font-bold text-slate-800">
                        Critical Low-Stock Alerts
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        Notify central warehouse when branch stock drops below safety threshold
                      </p>
                    </div>
                    <Switch
                      id="n-low"
                      checked={notifications.emailLowStock}
                      onCheckedChange={(val) => setNotifications({ ...notifications, emailLowStock: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                    <div>
                      <Label htmlFor="n-trans" className="text-xs font-bold text-slate-800">
                        Inter-Branch Transfer Dispatches
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        Real-time alerts when stock leaves a branch hub and when it arrives at destination
                      </p>
                    </div>
                    <Switch
                      id="n-trans"
                      checked={notifications.emailTransferAlerts}
                      onCheckedChange={(val) => setNotifications({ ...notifications, emailTransferAlerts: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                    <div>
                      <Label htmlFor="n-rep" className="text-xs font-bold text-slate-800">
                        Daily Supermarket Reconciliation Summary
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        Daily automated digest of total sales revenue, cashier shift balances, and stock deductions
                      </p>
                    </div>
                    <Switch
                      id="n-rep"
                      checked={notifications.emailDailyReports}
                      onCheckedChange={(val) => setNotifications({ ...notifications, emailDailyReports: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                    <div>
                      <Label htmlFor="n-disc" className="text-xs font-bold text-slate-800">
                        Physical Count Discrepancy Alerts
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        Alert inventory supervisor when manual stock adjustment exceeds ±5% of recorded balance
                      </p>
                    </div>
                    <Switch
                      id="n-disc"
                      checked={notifications.pushStockDiscrepancies}
                      onCheckedChange={(val) =>
                        setNotifications({ ...notifications, pushStockDiscrepancies: val })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                onClick={handleSaveBusinessSettings}
                disabled={saving}
                className="bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold h-8"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Save Notification Rules
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
