"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Scan, Wifi, WifiOff } from "lucide-react"
import type { Product } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

interface BarcodeScannerProps {
  onProductScanned: (product: Product) => void
  locationId: string
  enableRegistration?: boolean
  onProductNotFound?: (barcode: string) => void
}

export default function BarcodeScanner({ 
  onProductScanned, 
  locationId, 
  enableRegistration = false,
  onProductNotFound 
}: BarcodeScannerProps) {
  const [barcodeInput, setBarcodeInput] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    // Simulate scanner connection
    const timer = setTimeout(() => setIsConnected(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim() || scanning) return

    setScanning(true)
    setLastScanned(barcode)

    try {
      const response = await fetch("/api/barcodescan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: barcode.trim(), locationId }),
      })

      if (response.ok) {
        const product = await response.json()
        if (product && product.id) {
          onProductScanned(product)
          toast({
            title: "Product Added",
            description: `Product "${product.name}" scanned successfully.`,
            variant: "default",
          })
        } else {
          toast({
            title: "Scan Error",
            description: "Product not found",
            variant: "destructive",
          })
        }
        setBarcodeInput("")
      } else {
        const error = await response.json()
        alert(error.error || "Product not found")
      }
    } catch (error) {
      console.error("Barcode scan error:", error)
      toast({
        title: "Scan Error",
        description: "Failed to scan barcode",
        variant: "destructive",
      })
      setBarcodeInput("")
    } finally {
      setScanning(false)
    }
  }

  const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim())
    }
  }

  const handleManualScan = () => {
    if (barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim())
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Barcode Scanner
          </div>
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Scan barcode or enter manually..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyPress={handleInputKeyPress}
            disabled={scanning}
            autoFocus
          />
          <Button onClick={handleManualScan} disabled={!barcodeInput.trim() || scanning}>
            {scanning ? "Scanning..." : "Scan"}
          </Button>
        </div>

        {lastScanned && (
          <div className="text-sm text-gray-600">
            <p>Last scanned: {lastScanned}</p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>• Use a USB or Bluetooth barcode scanner</p>
          <p>• Scanner input will appear automatically</p>
          <p>• Or enter barcode manually and press Enter</p>
        </div>
      </CardContent>
    </Card>
  )
}