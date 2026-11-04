"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pill, Package, Calculator } from "lucide-react"

interface SimpleProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductAdded: () => void
  locationId?: string | null
}

// Predefined packaging templates for common pharmacy items
const PACKAGING_TEMPLATES = {
  tablet: {
    name: "Tablets",
    baseUnit: "tablet",
    levels: [
      { name: "Tablet", unit: "tab", factor: 1 },
      { name: "Strip", unit: "strip", factor: 10, defaultPer: 10 },
      { name: "Card", unit: "card", factor: 20, defaultPer: 2 },
      { name: "Pack", unit: "pack", factor: 60, defaultPer: 3 }
    ]
  },
  capsule: {
    name: "Capsules", 
    baseUnit: "capsule",
    levels: [
      { name: "Capsule", unit: "cap", factor: 1 },
      { name: "Strip", unit: "strip", factor: 10, defaultPer: 10 },
      { name: "Card", unit: "card", factor: 20, defaultPer: 2 },
      { name: "Pack", unit: "pack", factor: 60, defaultPer: 3 }
    ]
  },
  syrup: {
    name: "Syrup",
    baseUnit: "ml",
    levels: [
      { name: "Milliliter", unit: "ml", factor: 1 },
      { name: "Bottle", unit: "bottle", factor: 100, defaultPer: 100 },
      { name: "Case", unit: "case", factor: 1200, defaultPer: 12 }
    ]
  },
  injection: {
    name: "Injection",
    baseUnit: "ml", 
    levels: [
      { name: "Milliliter", unit: "ml", factor: 1 },
      { name: "Vial", unit: "vial", factor: 10, defaultPer: 10 },
      { name: "Box", unit: "box", factor: 50, defaultPer: 5 }
    ]
  },
  cream: {
    name: "Cream/Ointment",
    baseUnit: "g",
    levels: [
      { name: "Gram", unit: "g", factor: 1 },
      { name: "Tube", unit: "tube", factor: 30, defaultPer: 30 },
      { name: "Box", unit: "box", factor: 360, defaultPer: 12 }
    ]
  }
}

export default function SimpleProductForm({ open, onOpenChange, onProductAdded, locationId }: SimpleProductFormProps) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    // Basic Info
    name: "",
    genericName: "",
    strength: "",
    manufacturer: "",
    
    // Category Selection
    category: "",
    productType: "", // tablet, capsule, syrup, etc.
    
    // Pricing
    basePrice: "", // price per base unit (tablet, ml, g)
    
    // Packaging Configuration (auto-populated based on type)
    packaging: {
      stripsPer: "10", // tablets per strip
      cardsPerPack: "2", // strips per card  
      packsOrdered: "10", // how many packs you're adding to inventory
    },
    
    // Auto-calculated UOM structure
    uomStructure: null as any,
  })

  const [calculatedStructure, setCalculatedStructure] = useState<any>(null)

  // Auto-calculate UOM structure when packaging changes
  useEffect(() => {
    if (form.productType && form.packaging.stripsPer && form.packaging.cardsPerPack) {
      const template = PACKAGING_TEMPLATES[form.productType as keyof typeof PACKAGING_TEMPLATES]
      if (template) {
        const stripsPer = parseInt(form.packaging.stripsPer) || 10
        const cardsPerPack = parseInt(form.packaging.cardsPerPack) || 2
        
        const structure = {
          baseUnit: template.baseUnit,
          levels: [
            { name: template.levels[0].name, unit: template.levels[0].unit, factor: 1, price: parseFloat(form.basePrice) || 0 },
            { name: "Strip", unit: "strip", factor: stripsPer, price: (parseFloat(form.basePrice) || 0) * stripsPer * 0.95 }, // 5% discount
            { name: "Card", unit: "card", factor: stripsPer * cardsPerPack, price: (parseFloat(form.basePrice) || 0) * stripsPer * cardsPerPack * 0.90 }, // 10% discount
            { name: "Pack", unit: "pack", factor: stripsPer * cardsPerPack * 3, price: (parseFloat(form.basePrice) || 0) * stripsPer * cardsPerPack * 3 * 0.85 } // 15% discount
          ]
        }
        
        setCalculatedStructure(structure)
      }
    }
  }, [form.productType, form.packaging, form.basePrice])

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    try {
      // Create product with UOM structure
      const payload = {
        // Basic product data
        name: form.name,
        genericName: form.genericName,
        strength: form.strength,
        manufacturer: form.manufacturer,
        category: form.category,
        drugForm: form.productType,
        
        // Auto-calculated pricing and UOM
        price: calculatedStructure.levels[0].price, // base unit price
        uomStructure: calculatedStructure,
        
        // Initial inventory
        initialStock: {
          packs: parseInt(form.packaging.packsOrdered) || 0,
          totalBaseUnits: (parseInt(form.packaging.packsOrdered) || 0) * calculatedStructure.levels[3].factor
        },
        
        locationId,
      }

      const response = await fetch('/api/products/simple-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to create product')

      onProductAdded()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error creating product:', error)
    }
  }

  const resetForm = () => {
    setStep(1)
    setForm({
      name: "",
      genericName: "",
      strength: "",
      manufacturer: "",
      category: "",
      productType: "",
      basePrice: "",
      packaging: {
        stripsPer: "10",
        cardsPerPack: "2", 
        packsOrdered: "10",
      },
      uomStructure: null,
    })
    setCalculatedStructure(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Add New Product - Step {step} of 3
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-blue-900">Basic Product Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Paracetamol"
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="strength">Strength *</Label>
                  <Input
                    id="strength"
                    placeholder="e.g., 500mg"
                    value={form.strength}
                    onChange={(e) => setForm({...form, strength: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genericName">Generic Name</Label>
                  <Input
                    id="genericName"
                    placeholder="e.g., Acetaminophen"
                    value={form.genericName}
                    onChange={(e) => setForm({...form, genericName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    placeholder="e.g., PharmaCorp"
                    value={form.manufacturer}
                    onChange={(e) => setForm({...form, manufacturer: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={form.category} onValueChange={(value) => setForm({...form, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pain-relief">Pain Relief</SelectItem>
                    <SelectItem value="antibiotics">Antibiotics</SelectItem>
                    <SelectItem value="vitamins">Vitamins & Supplements</SelectItem>
                    <SelectItem value="cold-flu">Cold & Flu</SelectItem>
                    <SelectItem value="digestive">Digestive Health</SelectItem>
                    <SelectItem value="topical">Topical Medications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
              <Button onClick={handleNext} disabled={!form.name || !form.strength || !form.category}>
                Next: Product Type
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Product Type & Packaging */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-green-900">Product Type & Packaging</h3>
              
              <div>
                <Label htmlFor="productType">Product Type *</Label>
                <Select value={form.productType} onValueChange={(value) => setForm({...form, productType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="What type of product is this?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tablet">💊 Tablets</SelectItem>
                    <SelectItem value="capsule">💊 Capsules</SelectItem>
                    <SelectItem value="syrup">🍯 Syrup/Liquid</SelectItem>
                    <SelectItem value="injection">💉 Injection</SelectItem>
                    <SelectItem value="cream">🧴 Cream/Ointment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(form.productType === 'tablet' || form.productType === 'capsule') && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stripsPer">Items per Strip *</Label>
                      <Input
                        id="stripsPer"
                        type="number"
                        placeholder="10"
                        value={form.packaging.stripsPer}
                        onChange={(e) => setForm({
                          ...form, 
                          packaging: {...form.packaging, stripsPer: e.target.value}
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        How many {form.productType}s in one strip?
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="cardsPerPack">Strips per Card *</Label>
                      <Input
                        id="cardsPerPack"
                        type="number"
                        placeholder="2"
                        value={form.packaging.cardsPerPack}
                        onChange={(e) => setForm({
                          ...form, 
                          packaging: {...form.packaging, cardsPerPack: e.target.value}
                        })}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        How many strips in one card?
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="basePrice">Price per {form.productType} *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      placeholder="0.50"
                      value={form.basePrice}
                      onChange={(e) => setForm({...form, basePrice: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Individual selling price per {form.productType}
                    </p>
                  </div>
                </>
              )}

              {form.productType === 'syrup' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="basePrice">Price per ml *</Label>
                      <Input
                        id="basePrice"
                        type="number"
                        step="0.01"
                        placeholder="0.10"
                        value={form.basePrice}
                        onChange={(e) => setForm({...form, basePrice: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Bottle Size</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value="100"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">ml per bottle</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between">
              <Button onClick={handleBack} variant="outline">Back</Button>
              <Button onClick={handleNext} disabled={!form.productType || !form.basePrice}>
                Next: Review & Add Stock
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Initial Stock */}
        {step === 3 && calculatedStructure && (
          <div className="space-y-6">
            <div className="bg-purple-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Review & Add Initial Stock
              </h3>
              
              {/* Calculated UOM Structure Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Auto-Generated Pricing Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {calculatedStructure.levels.map((level: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                      <div>
                        <span className="font-medium">{level.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({level.factor} {calculatedStructure.levels[0].unit}{level.factor > 1 ? 's' : ''})
                        </span>
                      </div>
                      <Badge variant="outline">
                        ${level.price.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Initial Stock */}
              <div>
                <Label htmlFor="packsOrdered">How many packs are you adding to inventory? *</Label>
                <Input
                  id="packsOrdered"
                  type="number"
                  placeholder="10"
                  value={form.packaging.packsOrdered}
                  onChange={(e) => setForm({
                    ...form, 
                    packaging: {...form.packaging, packsOrdered: e.target.value}
                  })}
                />
                {form.packaging.packsOrdered && (
                  <div className="mt-2 p-3 bg-blue-100 rounded text-sm">
                    <p className="font-medium">This will add to inventory:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• {form.packaging.packsOrdered} packs</li>
                      <li>• {parseInt(form.packaging.packsOrdered) * parseInt(form.packaging.cardsPerPack) * 3} cards</li>
                      <li>• {parseInt(form.packaging.packsOrdered) * parseInt(form.packaging.cardsPerPack) * 3 * parseInt(form.packaging.cardsPerPack)} strips</li>
                      <li>• {parseInt(form.packaging.packsOrdered) * calculatedStructure.levels[3].factor} {calculatedStructure.baseUnit}s</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button onClick={handleBack} variant="outline">Back</Button>
              <Button onClick={handleSubmit} disabled={!form.packaging.packsOrdered}>
                Create Product & Add to Inventory
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}