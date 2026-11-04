"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Scan, Check, AlertCircle, Package, Barcode, Wand2 } from "lucide-react"
import type { Product } from "@/lib/types"
import { formatPrice } from "@/lib/standards/formatting"

interface QuickProductRegistrationProps {
  locationId: string
  onProductRegistered: (product: Product) => void
}

export default function QuickProductRegistration({ 
  locationId, 
  onProductRegistered 
}: QuickProductRegistrationProps) {
  const [barcodeInput, setBarcodeInput] = useState("")
  const [scanning, setScanning] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState("")
  const [productDetails, setProductDetails] = useState({
    name: "",
    description: "",
    sku: "",
    price: "",
    cost: "",
    category: "",
    stockQuantity: "0",
    minStockLevel: "10",
    maxStockLevel: "100",
  })
  const [registrationResult, setRegistrationResult] = useState<{
    product: Product;
    exists: boolean;
    message: string;
  } | null>(null)
  const [skuGenerating, setSkuGenerating] = useState(false)
  const [manualSku, setManualSku] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-generate SKU when product name or category changes
  const generateSKU = useCallback(async (productName: string, category: string) => {
    if (!productName.trim() || manualSku) return
    
    setSkuGenerating(true)
    try {
      const res = await fetch("/api/products/generate-sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          productName: productName.trim(), 
          category: category || "General" 
        }),
      })
      const data = await res.json()
      if (res.ok && data.sku) {
        setProductDetails(prev => ({ ...prev, sku: data.sku }))
      }
    } catch (err) {
      console.error("Failed to generate SKU:", err)
    } finally {
      setSkuGenerating(false)
    }
  }, [manualSku])

  // Debounced SKU generation
  const debouncedGenerateSKU = useCallback((productName: string, category: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      generateSKU(productName, category)
    }, 500)
  }, [generateSKU])

  // Generate SKU when name or category changes
  useEffect(() => {
    if (productDetails.name) {
      debouncedGenerateSKU(productDetails.name, productDetails.category)
    }
  }, [productDetails.name, productDetails.category, debouncedGenerateSKU])

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim() || scanning) return

    setScanning(true)
    setBarcodeInput("")

    try {
      // First check if product exists
      const response = await fetch("/api/products/register-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          barcode: barcode.trim(), 
          locationId,
          ...productDetails,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setRegistrationResult(result)
        
        if (result.exists) {
          // Product exists, show confirmation
          alert(`Product found: ${result.product.name}`)
          onProductRegistered(result.product)
        } else {
          // New product created, show success
          alert(`New product registered: ${result.product.name} (SKU: ${result.product.sku})`)
          onProductRegistered(result.product)
        }
      } else {
        const error = await response.json()
        // If product doesn't exist and we need details, show modal
        if (error.error === "Product not found" || response.status === 404) {
          setScannedBarcode(barcode.trim())
          setShowDetailsModal(true)
        } else {
          alert(error.error || "Failed to register product")
        }
      }
    } catch (error) {
      console.error("Product registration error:", error)
      // Show details modal for manual entry
      setScannedBarcode(barcode.trim())
      setShowDetailsModal(true)
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

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setScanning(true)

    try {
      const response = await fetch("/api/products/register-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: scannedBarcode,
          locationId,
          name: productDetails.name,
          description: productDetails.description,
          sku: productDetails.sku,
          price: parseFloat(productDetails.price) || 0,
          cost: productDetails.cost ? parseFloat(productDetails.cost) : null,
          category: productDetails.category || "General",
          stockQuantity: parseInt(productDetails.stockQuantity) || 0,
          minStockLevel: parseInt(productDetails.minStockLevel) || 10,
          maxStockLevel: parseInt(productDetails.maxStockLevel) || 100,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        onProductRegistered(result.product)
        setShowDetailsModal(false)
        setProductDetails({
          name: "",
          description: "",
          sku: "",
          price: "",
          cost: "",
          category: "",
          stockQuantity: "0",
          minStockLevel: "10",
          maxStockLevel: "100",
        })
        setManualSku(false)
        alert(`Product registered successfully: ${result.product.name}`)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to register product")
      }
    } catch (error) {
      console.error("Product registration error:", error)
      alert("Failed to register product")
    } finally {
      setScanning(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Quick Product Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Scan or enter barcode to register product..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={handleInputKeyPress}
              disabled={scanning}
              autoFocus
            />
            <Button onClick={handleManualScan} disabled={!barcodeInput.trim() || scanning}>
              {scanning ? "Processing..." : <Scan className="h-4 w-4" />}
            </Button>
          </div>

          {registrationResult && (
            <div className={`p-3 rounded-lg border ${
              registrationResult.exists ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {registrationResult.exists ? (
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                ) : (
                  <Check className="h-4 w-4 text-green-600" />
                )}
                <span className="font-medium">{registrationResult.message}</span>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Name:</strong> {registrationResult.product.name}</p>
                <p><strong>SKU:</strong> {registrationResult.product.sku}</p>
                <p><strong>Price:</strong> {formatPrice(registrationResult.product.price)}</p>
                <p><strong>Stock:</strong> {registrationResult.product.stockQuantity}</p>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p>• Scan a barcode to instantly register or find products</p>
            <p>• If product doesn't exist, you'll be prompted for details</p>
            <p>• SKUs are automatically generated for new products</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              New Product Details
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDetailsSubmit} className="space-y-4">
            <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
              Barcode: <code className="font-mono">{scannedBarcode}</code>
            </div>
            
            <Input
              placeholder="Product Name *"
              value={productDetails.name}
              onChange={(e) => {
                setProductDetails({ ...productDetails, name: e.target.value })
              }}
              required
            />
            
            <Input
              placeholder="Description"
              value={productDetails.description}
              onChange={(e) => setProductDetails({ ...productDetails, description: e.target.value })}
            />
            
            <div className="relative">
              <Input
                placeholder={skuGenerating ? "Generating SKU..." : "SKU (auto-generated)"}
                value={productDetails.sku}
                onChange={(e) => {
                  setProductDetails({ ...productDetails, sku: e.target.value })
                  setManualSku(e.target.value.trim() !== '')
                }}
                disabled={skuGenerating}
                className={skuGenerating ? "animate-pulse" : ""}
              />
              {skuGenerating && (
                <Wand2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.01"
                placeholder="Price *"
                value={productDetails.price}
                onChange={(e) => setProductDetails({ ...productDetails, price: e.target.value })}
                required
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Cost"
                value={productDetails.cost}
                onChange={(e) => setProductDetails({ ...productDetails, cost: e.target.value })}
              />
            </div>
            
            <Input
              placeholder="Category"
              value={productDetails.category}
              onChange={(e) => setProductDetails({ ...productDetails, category: e.target.value })}
            />
            
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="Stock"
                value={productDetails.stockQuantity}
                onChange={(e) => setProductDetails({ ...productDetails, stockQuantity: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Min"
                value={productDetails.minStockLevel}
                onChange={(e) => setProductDetails({ ...productDetails, minStockLevel: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Max"
                value={productDetails.maxStockLevel}
                onChange={(e) => setProductDetails({ ...productDetails, maxStockLevel: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={scanning || !productDetails.name || !productDetails.price}>
                {scanning ? "Registering..." : "Register Product"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowDetailsModal(false)}
                disabled={scanning}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
