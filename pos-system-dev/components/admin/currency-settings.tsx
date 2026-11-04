"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { SIERRA_LEONE_CONFIG, formatSLLCurrency } from "@/lib/sierra-leone-config"
import { Banknote, Settings, Globe, Calculator, AlertTriangle } from "lucide-react"

interface CurrencySettings {
  businessId: string
  currencyCode: string
  currencySymbol: string
  currencyPosition: 'before' | 'after'
  decimalPlaces: number
  thousandsSeparator: string
  decimalSeparator: string
  showCurrencyInCompactForm: boolean
  enableTaxCalculation: boolean
  gstRate: number
  withholdingTaxRate: number
  roundingPrecision: 'exact' | 'nearest_5' | 'nearest_10' | 'nearest_50' | 'nearest_100'
}

interface CurrencySettingsProps {
  businessId: string
}

export default function CurrencySettings({ businessId }: CurrencySettingsProps) {
  const { toast } = useToast()
  const [settings, setSettings] = useState<CurrencySettings>({
    businessId,
    currencyCode: SIERRA_LEONE_CONFIG.currency.code,
    currencySymbol: SIERRA_LEONE_CONFIG.currency.symbol,
    currencyPosition: SIERRA_LEONE_CONFIG.currency.position as 'before' | 'after',
    decimalPlaces: SIERRA_LEONE_CONFIG.currency.decimals,
    thousandsSeparator: SIERRA_LEONE_CONFIG.currency.thousandsSeparator,
    decimalSeparator: SIERRA_LEONE_CONFIG.currency.decimalSeparator,
    showCurrencyInCompactForm: false,
    enableTaxCalculation: true,
    gstRate: SIERRA_LEONE_CONFIG.taxation.gst * 100, // Convert to percentage
    withholdingTaxRate: SIERRA_LEONE_CONFIG.taxation.withholding_tax * 100,
    roundingPrecision: 'exact'
  })
  const [loading, setLoading] = useState(false)
  const [previewAmount] = useState(123456.789)

  useEffect(() => {
    fetchSettings()
  }, [businessId])

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/admin/settings/currency?businessId=${businessId}`)
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setSettings(prev => ({ ...prev, ...data }))
        }
      }
    } catch (error) {
      console.error("Error fetching currency settings:", error)
    }
  }

  const saveSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/settings/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Currency settings have been updated successfully."
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save currency settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetToDefaults = () => {
    setSettings(prev => ({
      ...prev,
      currencyCode: SIERRA_LEONE_CONFIG.currency.code,
      currencySymbol: SIERRA_LEONE_CONFIG.currency.symbol,
      currencyPosition: SIERRA_LEONE_CONFIG.currency.position as 'before' | 'after',
      decimalPlaces: SIERRA_LEONE_CONFIG.currency.decimals,
      thousandsSeparator: SIERRA_LEONE_CONFIG.currency.thousandsSeparator,
      decimalSeparator: SIERRA_LEONE_CONFIG.currency.decimalSeparator,
      gstRate: SIERRA_LEONE_CONFIG.taxation.gst * 100,
      withholdingTaxRate: SIERRA_LEONE_CONFIG.taxation.withholding_tax * 100,
    }))
  }

  const formatPreview = (amount: number): string => {
    const formatted = amount.toFixed(settings.decimalPlaces)
      .replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousandsSeparator)
      .replace('.', settings.decimalSeparator)
    
    return settings.currencyPosition === 'before' 
      ? `${settings.currencySymbol} ${formatted}` 
      : `${formatted} ${settings.currencySymbol}`
  }

  const formatCompactPreview = (amount: number): string => {
    if (amount >= 1000000) {
      const millions = amount / 1000000
      const formatted = millions.toFixed(1) + 'M'
      return settings.currencyPosition === 'before' 
        ? `${settings.currencySymbol} ${formatted}` 
        : `${formatted} ${settings.currencySymbol}`
    }
    
    if (amount >= 1000) {
      const thousands = amount / 1000
      const formatted = thousands.toFixed(1) + 'K'
      return settings.currencyPosition === 'before' 
        ? `${settings.currencySymbol} ${formatted}` 
        : `${formatted} ${settings.currencySymbol}`
    }
    
    return formatPreview(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Currency Settings</h2>
          <p className="text-muted-foreground">Configure currency formatting and tax settings for Sierra Leone</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Sierra Leone (SLL)
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Currency Format Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Currency Formatting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Currency Code</Label>
                <Input
                  id="currencyCode"
                  value={settings.currencyCode}
                  onChange={(e) => setSettings(prev => ({ ...prev, currencyCode: e.target.value }))}
                  placeholder="SLL"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencySymbol">Currency Symbol</Label>
                <Input
                  id="currencySymbol"
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
                  placeholder="Le"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencyPosition">Symbol Position</Label>
                <Select
                  value={settings.currencyPosition}
                  onValueChange={(value: 'before' | 'after') => 
                    setSettings(prev => ({ ...prev, currencyPosition: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before amount (Le 1,000.00)</SelectItem>
                    <SelectItem value="after">After amount (1,000.00 Le)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="decimalPlaces">Decimal Places</Label>
                <Select
                  value={settings.decimalPlaces.toString()}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, decimalPlaces: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 (Le 1,000)</SelectItem>
                    <SelectItem value="2">2 (Le 1,000.00)</SelectItem>
                    <SelectItem value="3">3 (Le 1,000.000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thousandsSeparator">Thousands Separator</Label>
                <Select
                  value={settings.thousandsSeparator}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, thousandsSeparator: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">, (comma)</SelectItem>
                    <SelectItem value=" ">  (space)</SelectItem>
                    <SelectItem value=".">. (period)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="decimalSeparator">Decimal Separator</Label>
                <Select
                  value={settings.decimalSeparator}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, decimalSeparator: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=".">. (period)</SelectItem>
                    <SelectItem value=",">, (comma)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Currency Display</Label>
                  <p className="text-sm text-muted-foreground">
                    Show large amounts in compact form (Le 1.2M instead of Le 1,200,000)
                  </p>
                </div>
                <Switch
                  checked={settings.showCurrencyInCompactForm}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, showCurrencyInCompactForm: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Rounding Precision</Label>
                <Select
                  value={settings.roundingPrecision}
                  onValueChange={(value: CurrencySettings['roundingPrecision']) => 
                    setSettings(prev => ({ ...prev, roundingPrecision: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exact amounts</SelectItem>
                    <SelectItem value="nearest_5">Round to nearest Le 5</SelectItem>
                    <SelectItem value="nearest_10">Round to nearest Le 10</SelectItem>
                    <SelectItem value="nearest_50">Round to nearest Le 50</SelectItem>
                    <SelectItem value="nearest_100">Round to nearest Le 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Standard Format</Label>
                <div className="text-lg font-mono bg-muted p-2 rounded">
                  {formatPreview(previewAmount)}
                </div>
              </div>

              {settings.showCurrencyInCompactForm && (
                <div>
                  <Label className="text-sm font-medium">Compact Format</Label>
                  <div className="text-lg font-mono bg-muted p-2 rounded">
                    {formatCompactPreview(previewAmount)}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Small Amount</Label>
                <div className="text-lg font-mono bg-muted p-2 rounded">
                  {formatPreview(25.50)}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Large Amount</Label>
                <div className="text-lg font-mono bg-muted p-2 rounded">
                  {settings.showCurrencyInCompactForm 
                    ? formatCompactPreview(5234567.89)
                    : formatPreview(5234567.89)
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Tax Calculation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically calculate GST and other taxes on transactions
              </p>
            </div>
            <Switch
              checked={settings.enableTaxCalculation}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, enableTaxCalculation: checked }))
              }
            />
          </div>

          {settings.enableTaxCalculation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstRate">GST Rate (%)</Label>
                <div className="relative">
                  <Input
                    id="gstRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.gstRate}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      gstRate: parseFloat(e.target.value) || 0 
                    }))}
                  />
                  <span className="absolute right-3 top-3 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current Sierra Leone GST: 15%
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="withholdingTaxRate">Withholding Tax Rate (%)</Label>
                <div className="relative">
                  <Input
                    id="withholdingTaxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.withholdingTaxRate}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      withholdingTaxRate: parseFloat(e.target.value) || 0 
                    }))}
                  />
                  <span className="absolute right-3 top-3 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  For business transactions: 5%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={resetToDefaults}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Reset to Defaults
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchSettings}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}