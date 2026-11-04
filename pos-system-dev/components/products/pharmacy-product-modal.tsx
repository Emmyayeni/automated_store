"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar, Pill, AlertTriangle, Package } from "lucide-react"

interface PharmacyProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductAdded: () => void
  locationId?: string | null
}

export default function PharmacyProductModal({
  open,
  onOpenChange,
  onProductAdded,
  locationId,
}: PharmacyProductModalProps) {
  const [form, setForm] = useState({
    // Basic product info
    name: "",
    description: "",
    price: "",
    cost: "",
    stockQuantity: "",
    
    // Pharmacy-specific fields
    drugType: "otc",
    drugForm: "",
    strength: "",
    genericName: "",
    brandName: "",
    manufacturer: "",
    batchNumber: "",
    expiryDate: "",
    manufacturingDate: "",
    drugLicenseNumber: "",
    storageConditions: "room_temperature",
    activeIngredient: "",
    dosageInstructions: "",
    sideEffects: "",
    contraindications: "",
    requiresPrescription: false,
    isControlledSubstance: false,
    controlledSubstanceSchedule: "",
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const drugTypes = [
    { value: "prescription", label: "Prescription Drug", icon: "🔴" },
    { value: "otc", label: "Over-the-Counter", icon: "🟢" },
    { value: "controlled", label: "Controlled Substance", icon: "🔒" },
    { value: "medical_device", label: "Medical Device", icon: "🏥" },
    { value: "supplement", label: "Supplement", icon: "💊" },
    { value: "personal_care", label: "Personal Care", icon: "🧴" },
  ]

  const drugForms = [
    "tablet", "capsule", "syrup", "injection", "cream", 
    "ointment", "drops", "inhaler", "patch", "suppository"
  ]

  const storageConditions = [
    { value: "room_temperature", label: "Room Temperature (15-30°C)" },
    { value: "refrigerated", label: "Refrigerated (2-8°C)" },
    { value: "frozen", label: "Frozen (-20°C or below)" },
    { value: "controlled_room", label: "Controlled Room Temperature" },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setForm({ ...form, [name]: checked })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        cost: form.cost ? parseFloat(form.cost) : null,
        stockQuantity: parseInt(form.stockQuantity, 10),
        locationId,
        category: `${form.drugType}_medicines`,
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add pharmaceutical product")

      onProductAdded()
      onOpenChange(false)
      resetForm()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      cost: "",
      stockQuantity: "",
      drugType: "otc",
      drugForm: "",
      strength: "",
      genericName: "",
      brandName: "",
      manufacturer: "",
      batchNumber: "",
      expiryDate: "",
      manufacturingDate: "",
      drugLicenseNumber: "",
      storageConditions: "room_temperature",
      activeIngredient: "",
      dosageInstructions: "",
      sideEffects: "",
      contraindications: "",
      requiresPrescription: false,
      isControlledSubstance: false,
      controlledSubstanceSchedule: "",
    })
  }

  const isExpiryDateNear = () => {
    if (!form.expiryDate) return false
    const expiryDate = new Date(form.expiryDate)
    const today = new Date()
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(today.getMonth() + 3)
    return expiryDate <= threeMonthsFromNow
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Add Pharmaceutical Product
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Product Information */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Basic Product Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                name="name"
                placeholder="Product Name *"
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                name="brandName"
                placeholder="Brand Name"
                value={form.brandName}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="genericName"
                placeholder="Generic Name"
                value={form.genericName}
                onChange={handleChange}
              />
              <Input
                name="manufacturer"
                placeholder="Manufacturer"
                value={form.manufacturer}
                onChange={handleChange}
              />
            </div>

            <Textarea
              name="description"
              placeholder="Product Description"
              value={form.description}
              onChange={handleChange}
              rows={2}
            />
          </div>

          {/* Drug Classification */}
          <div className="bg-green-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-green-900">Drug Classification</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Drug Type *</label>
                <select
                  name="drugType"
                  value={form.drugType}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {drugTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Drug Form</label>
                <select
                  name="drugForm"
                  value={form.drugForm}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select Form</option>
                  {drugForms.map(form => (
                    <option key={form} value={form}>
                      {form.charAt(0).toUpperCase() + form.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                name="strength"
                placeholder="Strength (e.g., 500mg)"
                value={form.strength}
                onChange={handleChange}
              />
              <Input
                name="activeIngredient"
                placeholder="Active Ingredient"
                value={form.activeIngredient}
                onChange={handleChange}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Storage Conditions</label>
                <select
                  name="storageConditions"
                  value={form.storageConditions}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                >
                  {storageConditions.map(condition => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Batch & Expiry Information */}
          <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-yellow-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Batch & Expiry Information
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <Input
                name="batchNumber"
                placeholder="Batch Number"
                value={form.batchNumber}
                onChange={handleChange}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Manufacturing Date</label>
                <Input
                  type="date"
                  name="manufacturingDate"
                  value={form.manufacturingDate}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Expiry Date *</label>
                <Input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  className={isExpiryDateNear() ? "border-red-500" : ""}
                  required
                />
                {isExpiryDateNear() && (
                  <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    Expiry date is within 3 months
                  </div>
                )}
              </div>
            </div>

            <Input
              name="drugLicenseNumber"
              placeholder="Drug License Number"
              value={form.drugLicenseNumber}
              onChange={handleChange}
            />
          </div>

          {/* Regulatory & Safety Information */}
          <div className="bg-red-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Regulatory & Safety Information
            </h3>
            
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="requiresPrescription"
                  checked={form.requiresPrescription}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm">Requires Prescription</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isControlledSubstance"
                  checked={form.isControlledSubstance}
                  onChange={handleChange}
                  className="rounded"
                />
                <span className="text-sm">Controlled Substance</span>
              </label>
            </div>

            {form.isControlledSubstance && (
              <Input
                name="controlledSubstanceSchedule"
                placeholder="Schedule (I, II, III, IV, V)"
                value={form.controlledSubstanceSchedule}
                onChange={handleChange}
              />
            )}

            <div className="grid grid-cols-1 gap-4">
              <Textarea
                name="dosageInstructions"
                placeholder="Dosage Instructions"
                value={form.dosageInstructions}
                onChange={handleChange}
                rows={2}
              />
              <Textarea
                name="sideEffects"
                placeholder="Common Side Effects"
                value={form.sideEffects}
                onChange={handleChange}
                rows={2}
              />
              <Textarea
                name="contraindications"
                placeholder="Contraindications"
                value={form.contraindications}
                onChange={handleChange}
                rows={2}
              />
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-purple-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-purple-900">Pricing & Inventory</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <Input
                name="cost"
                placeholder="Cost Price (SLL)"
                type="number"
                step="0.01"
                value={form.cost}
                onChange={handleChange}
              />
              <Input
                name="price"
                placeholder="Selling Price (SLL) *"
                type="number"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
              />
              <Input
                name="stockQuantity"
                placeholder="Initial Stock *"
                type="number"
                value={form.stockQuantity}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding Product..." : "Add Pharmaceutical Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
