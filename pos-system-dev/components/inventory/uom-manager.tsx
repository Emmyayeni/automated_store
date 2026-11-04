"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Package, Settings, Edit, Trash2, Link } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  category: string;
  isBaseUnit: boolean;
  isActive: boolean;
}

interface ProductUOM {
  id: string;
  productId: string;
  uomId: string;
  uomCode: string;
  uomName: string;
  conversionFactor: number;
  pricePerUnit?: number;
  isBaseUom: boolean;
  isSellingUom: boolean;
  isPurchasingUom: boolean;
  barcode?: string;
  skuSuffix?: string;
}

interface ProductPackagingHierarchy {
  id: string;
  parentUomCode: string;
  parentUomName: string;
  childUomCode: string;
  childUomName: string;
  quantityPerParent: number;
  levelOrder: number;
}

interface UOMManagerProps {
  businessId: string;
  productId?: string;
}

export default function UOMManager({ businessId, productId }: UOMManagerProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("uoms")
  
  // UOM Management State
  const [uoms, setUOMs] = useState<UnitOfMeasure[]>([])
  const [showUOMDialog, setShowUOMDialog] = useState(false)
  const [editingUOM, setEditingUOM] = useState<UnitOfMeasure | null>(null)
  
  // Product UOM State
  const [productUOMs, setProductUOMs] = useState<ProductUOM[]>([])
  const [showProductUOMDialog, setShowProductUOMDialog] = useState(false)
  const [editingProductUOM, setEditingProductUOM] = useState<ProductUOM | null>(null)
  
  // Packaging Hierarchy State
  const [packagingHierarchy, setPackagingHierarchy] = useState<ProductPackagingHierarchy[]>([])
  const [showHierarchyDialog, setShowHierarchyDialog] = useState(false)

  // Form States
  const [uomForm, setUOMForm] = useState({
    code: "",
    name: "",
    abbreviation: "",
    category: "packaging",
    isBaseUnit: false,
  })

  const [productUOMForm, setProductUOMForm] = useState({
    uomId: "",
    conversionFactor: "1",
    pricePerUnit: "",
    isBaseUom: false,
    isSellingUom: true,
    isPurchasingUom: false,
    barcode: "",
    skuSuffix: "",
  })

  const [hierarchyForm, setHierarchyForm] = useState({
    parentUomId: "",
    childUomId: "",
    quantityPerParent: "1",
    levelOrder: "1",
  })

  // Load data on component mount
  useEffect(() => {
    loadUOMs()
    if (productId) {
      loadProductUOMs()
      loadPackagingHierarchy()
    }
  }, [businessId, productId])

  const loadUOMs = async () => {
    try {
      const response = await fetch(`/api/uoms?businessId=${businessId}`)
      const data = await response.json()
      setUOMs(data)
    } catch (error) {
      console.error("Error loading UOMs:", error)
      toast({
        title: "Error",
        description: "Failed to load units of measure",
        variant: "destructive",
      })
    }
  }

  const loadProductUOMs = async () => {
    if (!productId) return
    
    try {
      const response = await fetch(`/api/products/${productId}/uoms`)
      const data = await response.json()
      setProductUOMs(data)
    } catch (error) {
      console.error("Error loading product UOMs:", error)
    }
  }

  const loadPackagingHierarchy = async () => {
    if (!productId) return
    
    try {
      const response = await fetch(`/api/products/${productId}/packaging-hierarchy`)
      const data = await response.json()
      setPackagingHierarchy(data)
    } catch (error) {
      console.error("Error loading packaging hierarchy:", error)
    }
  }

  const handleUOMSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingUOM ? `/api/uoms/${editingUOM.id}` : '/api/uoms'
      const method = editingUOM ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...uomForm,
          businessId,
        }),
      })

      if (!response.ok) throw new Error('Failed to save UOM')

      toast({
        title: "Success",
        description: `UOM ${editingUOM ? 'updated' : 'created'} successfully`,
      })

      setShowUOMDialog(false)
      setEditingUOM(null)
      resetUOMForm()
      loadUOMs()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingUOM ? 'update' : 'create'} UOM`,
        variant: "destructive",
      })
    }
  }

  const handleProductUOMSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!productId) return

    try {
      const url = editingProductUOM ? `/api/products/${productId}/uoms/${editingProductUOM.id}` : `/api/products/${productId}/uoms`
      const method = editingProductUOM ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productUOMForm,
          conversionFactor: parseFloat(productUOMForm.conversionFactor),
          pricePerUnit: productUOMForm.pricePerUnit ? parseFloat(productUOMForm.pricePerUnit) : null,
        }),
      })

      if (!response.ok) throw new Error('Failed to save product UOM')

      toast({
        title: "Success",
        description: `Product UOM ${editingProductUOM ? 'updated' : 'created'} successfully`,
      })

      setShowProductUOMDialog(false)
      setEditingProductUOM(null)
      resetProductUOMForm()
      loadProductUOMs()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingProductUOM ? 'update' : 'create'} product UOM`,
        variant: "destructive",
      })
    }
  }

  const resetUOMForm = () => {
    setUOMForm({
      code: "",
      name: "",
      abbreviation: "",
      category: "packaging",
      isBaseUnit: false,
    })
  }

  const resetProductUOMForm = () => {
    setProductUOMForm({
      uomId: "",
      conversionFactor: "1",
      pricePerUnit: "",
      isBaseUom: false,
      isSellingUom: true,
      isPurchasingUom: false,
      barcode: "",
      skuSuffix: "",
    })
  }

  const editUOM = (uom: UnitOfMeasure) => {
    setEditingUOM(uom)
    setUOMForm({
      code: uom.code,
      name: uom.name,
      abbreviation: uom.abbreviation,
      category: uom.category,
      isBaseUnit: uom.isBaseUnit,
    })
    setShowUOMDialog(true)
  }

  const editProductUOM = (productUOM: ProductUOM) => {
    setEditingProductUOM(productUOM)
    setProductUOMForm({
      uomId: productUOM.uomId,
      conversionFactor: productUOM.conversionFactor.toString(),
      pricePerUnit: productUOM.pricePerUnit?.toString() || "",
      isBaseUom: productUOM.isBaseUom,
      isSellingUom: productUOM.isSellingUom,
      isPurchasingUom: productUOM.isPurchasingUom,
      barcode: productUOM.barcode || "",
      skuSuffix: productUOM.skuSuffix || "",
    })
    setShowProductUOMDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Unit of Measure Management</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="uoms">Units of Measure</TabsTrigger>
          {productId && (
            <>
              <TabsTrigger value="product-uoms">Product UOMs</TabsTrigger>
              <TabsTrigger value="hierarchy">Packaging Hierarchy</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="uoms">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Business Units of Measure
                </CardTitle>
                <Dialog open={showUOMDialog} onOpenChange={setShowUOMDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetUOMForm(); setEditingUOM(null); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add UOM
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingUOM ? 'Edit' : 'Create'} Unit of Measure</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUOMSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="code">Code *</Label>
                          <Input
                            id="code"
                            value={uomForm.code}
                            onChange={(e) => setUOMForm({...uomForm, code: e.target.value.toUpperCase()})}
                            placeholder="PACK, CARD, TAB"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="abbreviation">Abbreviation *</Label>
                          <Input
                            id="abbreviation"
                            value={uomForm.abbreviation}
                            onChange={(e) => setUOMForm({...uomForm, abbreviation: e.target.value})}
                            placeholder="pk, cd, tab"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={uomForm.name}
                          onChange={(e) => setUOMForm({...uomForm, name: e.target.value})}
                          placeholder="Pack, Card, Tablet"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={uomForm.category}
                          onValueChange={(value) => setUOMForm({...uomForm, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="packaging">Packaging</SelectItem>
                            <SelectItem value="weight">Weight</SelectItem>
                            <SelectItem value="volume">Volume</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isBaseUnit"
                          checked={uomForm.isBaseUnit}
                          onChange={(e) => setUOMForm({...uomForm, isBaseUnit: e.target.checked})}
                        />
                        <Label htmlFor="isBaseUnit">Is Base Unit</Label>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowUOMDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingUOM ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uoms.map((uom) => (
                  <Card key={uom.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{uom.name}</h3>
                          <p className="text-sm text-gray-500">{uom.code} ({uom.abbreviation})</p>
                        </div>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline" onClick={() => editUOM(uom)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Badge variant="outline">{uom.category}</Badge>
                        {uom.isBaseUnit && <Badge variant="secondary">Base Unit</Badge>}
                        {!uom.isActive && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {productId && (
          <TabsContent value="product-uoms">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Product UOM Configuration
                  </CardTitle>
                  <Dialog open={showProductUOMDialog} onOpenChange={setShowProductUOMDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { resetProductUOMForm(); setEditingProductUOM(null); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product UOM
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingProductUOM ? 'Edit' : 'Add'} Product UOM</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleProductUOMSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="uomId">Unit of Measure *</Label>
                          <Select
                            value={productUOMForm.uomId}
                            onValueChange={(value) => setProductUOMForm({...productUOMForm, uomId: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select UOM" />
                            </SelectTrigger>
                            <SelectContent>
                              {uoms.filter(uom => uom.isActive).map((uom) => (
                                <SelectItem key={uom.id} value={uom.id}>
                                  {uom.name} ({uom.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="conversionFactor">Conversion Factor *</Label>
                            <Input
                              id="conversionFactor"
                              type="number"
                              step="0.000001"
                              value={productUOMForm.conversionFactor}
                              onChange={(e) => setProductUOMForm({...productUOMForm, conversionFactor: e.target.value})}
                              placeholder="1.0"
                              required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              How many base units = 1 of this UOM
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="pricePerUnit">Price Per Unit</Label>
                            <Input
                              id="pricePerUnit"
                              type="number"
                              step="0.01"
                              value={productUOMForm.pricePerUnit}
                              onChange={(e) => setProductUOMForm({...productUOMForm, pricePerUnit: e.target.value})}
                              placeholder="Optional override price"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="barcode">Barcode</Label>
                            <Input
                              id="barcode"
                              value={productUOMForm.barcode}
                              onChange={(e) => setProductUOMForm({...productUOMForm, barcode: e.target.value})}
                              placeholder="UOM-specific barcode"
                            />
                          </div>
                          <div>
                            <Label htmlFor="skuSuffix">SKU Suffix</Label>
                            <Input
                              id="skuSuffix"
                              value={productUOMForm.skuSuffix}
                              onChange={(e) => setProductUOMForm({...productUOMForm, skuSuffix: e.target.value})}
                              placeholder="-PK, -CD"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="isBaseUom"
                              checked={productUOMForm.isBaseUom}
                              onChange={(e) => setProductUOMForm({...productUOMForm, isBaseUom: e.target.checked})}
                            />
                            <Label htmlFor="isBaseUom">Base UOM (for inventory tracking)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="isSellingUom"
                              checked={productUOMForm.isSellingUom}
                              onChange={(e) => setProductUOMForm({...productUOMForm, isSellingUom: e.target.checked})}
                            />
                            <Label htmlFor="isSellingUom">Can be sold</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="isPurchasingUom"
                              checked={productUOMForm.isPurchasingUom}
                              onChange={(e) => setProductUOMForm({...productUOMForm, isPurchasingUom: e.target.checked})}
                            />
                            <Label htmlFor="isPurchasingUom">Can be purchased</Label>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setShowProductUOMDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingProductUOM ? 'Update' : 'Add'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {productUOMs.map((productUOM) => (
                    <Card key={productUOM.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{productUOM.uomName}</h3>
                            <Badge variant="outline">{productUOM.uomCode}</Badge>
                            {productUOM.isBaseUom && <Badge variant="secondary">Base</Badge>}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Conversion Factor: {productUOM.conversionFactor}x</p>
                            {productUOM.pricePerUnit && (
                              <p>Price: ${productUOM.pricePerUnit.toFixed(2)}</p>
                            )}
                            {productUOM.barcode && (
                              <p>Barcode: {productUOM.barcode}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {productUOM.isSellingUom && <Badge variant="outline">Selling</Badge>}
                            {productUOM.isPurchasingUom && <Badge variant="outline">Purchasing</Badge>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => editProductUOM(productUOM)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {productId && (
          <TabsContent value="hierarchy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Packaging Hierarchy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packagingHierarchy.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No packaging hierarchy configured yet. Set up relationships between different package sizes.
                    </p>
                  ) : (
                    packagingHierarchy.map((hierarchy) => (
                      <div key={hierarchy.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">Level {hierarchy.levelOrder}</Badge>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{hierarchy.parentUomName}</span>
                            <span className="text-gray-500">contains</span>
                            <span className="font-bold text-blue-600">{hierarchy.quantityPerParent}</span>
                            <span className="font-medium">{hierarchy.childUomName}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}