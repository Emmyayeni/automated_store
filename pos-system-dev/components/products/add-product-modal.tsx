"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  createProductValidationSchema, 
  validateForm as validateFormData,
  FIELD_VALIDATION_MESSAGES 
} from "@/lib/standards/validation"

type Category = {
  id: string
  name: string
}

interface AddProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProductAdded: () => void
  locationId?: string | null
}

export default function AddProductModal({
  open,
  onOpenChange,
  onProductAdded,
  locationId,
}: AddProductModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    price: "",
    cost: "",
    categoryId: "",
    newCategory: "",
    stockQuantity: "",
    lowStockThreshold: "",
    autoGenerateBarcode: false,
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
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
        setForm(prev => ({ ...prev, sku: data.sku }))
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
    if (form.name) {
      const selectedCategory = categories.find(cat => cat.id === form.categoryId)?.name || form.newCategory
      debouncedGenerateSKU(form.name, selectedCategory)
    }
  }, [form.name, form.categoryId, form.newCategory, debouncedGenerateSKU, categories])

  // Fetch categories on open
  useEffect(() => {
    if (!open) return
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories")
        const data = await res.json()
        setCategories(data)
      } catch (e) {
        setCategories([])
      }
    }
    fetchCategories()
  }, [open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
      
      // Track if user manually edits SKU
      if (name === 'sku') {
        setManualSku(value.trim() !== '')
      }
    }
  }

  const validateForm = (): boolean => {
    const validationSchema = createProductValidationSchema()
    
    const validationData = {
      name: form.name,
      sku: form.sku,
      price: form.price,
      stockQuantity: form.stockQuantity,
    }
    
    const result = validateFormData(validationData, validationSchema)
    
    const newErrors: Record<string, string> = {}
    
    // Map validation errors to form fields
    result.errors.forEach(error => {
      if (error.includes('Product name')) newErrors.name = error
      else if (error.includes('SKU')) newErrors.sku = error
      else if (error.includes('Price')) newErrors.price = error
      else if (error.includes('Stock quantity')) newErrors.stockQuantity = error
    })
    
    // Additional validations
    if (!form.categoryId && !form.newCategory.trim()) {
      newErrors.category = FIELD_VALIDATION_MESSAGES.productName.required.replace('Product name', 'Category')
    }
    
    setValidationErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    setError(null)
    setValidationErrors({})
    let categoryId = form.categoryId

    // If user entered a new category, create it first
    if (!categoryId && form.newCategory.trim()) {
      try {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.newCategory.trim() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to create category")
        categoryId = data.id
      } catch (err: any) {
        setError("Failed to create category: " + err.message)
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryId,
          price: parseFloat(form.price),
          cost: form.cost ? parseFloat(form.cost) : null,
          stockQuantity: parseInt(form.stockQuantity, 10),
          lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold, 10) : null,
          autoGenerateBarcode: form.autoGenerateBarcode,
          locationId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add product")
      onProductAdded()
      onOpenChange(false)
      setForm({
        name: "",
        description: "",
        sku: "",
        barcode: "",
        price: "",
        cost: "",
        categoryId: "",
        newCategory: "",
        stockQuantity: "",
        lowStockThreshold: "",
        autoGenerateBarcode: false,
      })
      setManualSku(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              required
              className={validationErrors.name ? "border-red-500" : ""}
            />
            {validationErrors.name && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
            )}
          </div>
          <Input
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
          />
          <div className="relative">
            <Input
              name="sku"
              placeholder={skuGenerating ? "Generating SKU..." : "SKU (auto-generated)"}
              value={form.sku}
              onChange={handleChange}
              disabled={skuGenerating}
              className={skuGenerating ? "animate-pulse" : ""}
            />
            {skuGenerating && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Input
              name="barcode"
              placeholder="Barcode (optional)"
              value={form.barcode}
              onChange={handleChange}
              disabled={form.autoGenerateBarcode}
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="autoGenerateBarcode"
                checked={form.autoGenerateBarcode}
                onChange={handleChange}
                className="rounded"
              />
              <span className="text-sm">Auto-generate barcode</span>
            </label>
          </div>
          <div>
            <Input
              name="price"
              placeholder="Price"
              type="number"
              value={form.price}
              onChange={handleChange}
              required
              className={validationErrors.price ? "border-red-500" : ""}
            />
            {validationErrors.price && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.price}</p>
            )}
          </div>
          <Input
            name="cost"
            placeholder="Cost"
            type="number"
            value={form.cost}
            onChange={handleChange}
          />
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <Input
            name="newCategory"
            placeholder="Or create new category"
            value={form.newCategory}
            onChange={handleChange}
            className="w-full"
          />
          <div>
            <Input
              name="stockQuantity"
              placeholder="Stock Quantity"
              type="number"
              value={form.stockQuantity}
              onChange={handleChange}
              required
              className={validationErrors.stockQuantity ? "border-red-500" : ""}
            />
            {validationErrors.stockQuantity && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.stockQuantity}</p>
            )}
          </div>
          <Input
            name="lowStockThreshold"
            placeholder="Low Stock Threshold"
            type="number"
            value={form.lowStockThreshold}
            onChange={handleChange}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Product"}
          </Button>
          {error && <div className="text-red-500">{error}</div>}
        </form>
      </DialogContent>
    </Dialog>
  )
}