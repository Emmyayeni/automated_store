"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Upload, Edit, Trash2, Package, Search, Filter } from "lucide-react"
import { toast } from "sonner"
import { usePermissions } from "@/hooks/use-permissions"
import QuickProductRegistration from "@/components/products/quick-product-registration"

import type { Product } from "@/lib/types"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    "Fresh Produce",
    "Bakery & Bread",
    "Dairy & Eggs",
    "Meat & Seafood",
    "Pantry & Groceries",
    "Beverages",
    "Snacks & Confectionery",
    "Frozen Foods",
    "Household & Cleaning",
    "Personal Care",
  ])

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((c: any) => c.name)
          setAvailableCategories((prev) => Array.from(new Set([...prev, ...names])))
        }
      })
      .catch(() => {})
  }, [])
  const { data: session } = useSession()
  const { canAddProducts, canEditProducts, canDeleteProducts, canRegisterProducts } = usePermissions()
  const sessionData = session?.data || session;
  const businessId = sessionData?.user?.businessId
  const locationId = sessionData?.user?.locationId // <-- Make sure this exists in your session!
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    barcode: "",
    price: "",
    cost: "",
    category: "",
    stock: "",
    description: "",
  })

  // Fetch products from API using businessId and locationId
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const url = locationId ? `/api/products?locationId=${locationId}` : `/api/products`
        const res = await fetch(url)
        const json = await res.json()
        const rawList = Array.isArray(json) ? json : json.data || []
        setProducts(
          rawList.map((p: any) => {
            const numPrice = typeof p.price === "number" ? p.price : parseFloat(String(p.price || 0).replace(/[^0-9.-]+/g, "")) || 0
            const numCost = typeof p.cost === "number" ? p.cost : parseFloat(String(p.cost || 0).replace(/[^0-9.-]+/g, "")) || 0
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              barcode: p.barcode,
              price: numPrice,
              cost: numCost,
              category: p.category,
              stock: p.stockQuantity ?? p.stock ?? 25,
              description: p.description,
              status: p.isActive ? "active" : "inactive",
            }
          })
        )
      } catch {
        toast.error("Failed to load products")
      }
    }
    fetchProducts()
  }, [businessId, locationId])

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Add product via API (include locationId)
  const handleAddProduct = async () => {
    if (
      !newProduct.name ||
      !newProduct.sku ||
      !newProduct.price ||
      !newProduct.stock ||
      !locationId ||
      isNaN(Number(newProduct.price)) ||
      isNaN(Number(newProduct.stock))
    ) {
      toast.error("Please fill all required fields.")
      return
    }
    const product = {
      name: newProduct.name,
      sku: newProduct.sku,
      barcode: newProduct.barcode,
      price: Number(newProduct.price),
      cost: Number(newProduct.cost),
      category: newProduct.category,
      stockQuantity: Number(newProduct.stock),
      description: newProduct.description,
      locationId, // <-- REQUIRED for your API!
    }
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to add product")
        return
      }
      const created = await res.json()
      setProducts([
        ...products,
        {
          id: created.id,
          name: created.name,
          sku: created.sku,
          barcode: created.barcode,
          price: created.price,
          cost: created.cost ?? 0,
          category: created.category,
          stock: created.stockQuantity,
          description: created.description,
          status: created.isActive ? "active" : "inactive",
        },
      ])
      setNewProduct({
        name: "",
        sku: "",
        barcode: "",
        price: "",
        cost: "",
        category: "",
        stock: "",
        description: "",
      })
      setIsAddDialogOpen(false)
      toast.success("Product added successfully!")
    } catch {
      toast.error("Failed to add product")
    }
  }

  // Edit product dialog open
  const handleEditClick = (product: Product) => {
    setEditProduct(product)
    setIsEditDialogOpen(true)
  }

  // Update product via API
  const handleUpdateProduct = async () => {
    if (
      !editProduct?.id ||
      !editProduct.name ||
      !editProduct.sku ||
      !editProduct.price ||
      !editProduct.stock ||
      !locationId ||
      isNaN(Number(editProduct.price)) ||
      isNaN(Number(editProduct.stock))
    ) {
      toast.error("Please fill all required fields.")
      return
    }
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editProduct.id,
          name: editProduct.name,
          sku: editProduct.sku,
          barcode: editProduct.barcode,
          price: Number(editProduct.price),
          cost: Number(editProduct.cost),
          category: editProduct.category,
          stockQuantity: Number(editProduct.stock),
          description: editProduct.description,
          locationId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update product")
        return
      }
      const updated = await res.json()
      setProducts(products.map(p => p.id === updated.id ? {
        ...p,
        ...updated,
        stock: updated.stockQuantity,
        status: updated.isActive ? "active" : "inactive",
      } : p))
      setIsEditDialogOpen(false)
      setEditProduct(null)
      toast.success("Product updated successfully!")
    } catch {
      toast.error("Failed to update product")
    }
  }

  // Delete product via API
  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to delete product")
        return
      }
      setProducts(products.filter((product) => product.id !== id))
      toast.success("Product deleted successfully!")
    } catch {
      toast.error("Failed to delete product")
    }
  }

  const handleProductRegistered = (product: any) => {
    setProducts([
      ...products,
      {
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.price,
        cost: 0,
        category: product.category,
        stock: product.stockQuantity,
        description: product.description || "",
        status: "active",
      },
    ])
  }

  const categories = Array.from(new Set(products.map((p) => p.category)))

  return (
    <div className="space-y-6">
      {/* Quick Product Registration */}
      {locationId && canRegisterProducts() && (
        <QuickProductRegistration
          locationId={locationId}
          onProductRegistered={handleProductRegistered}
        />
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
          <p className="text-muted-foreground">Manage your inventory and product catalog</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          {canAddProducts() && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Create a new product in your inventory.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Premium Coffee Beans"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU (auto-generated if empty)</Label>
                    <Input
                      id="sku"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      placeholder="Auto-generated"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    placeholder="1234567890123"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₦)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="50"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="3500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost (₦)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="50"
                      value={newProduct.cost}
                      onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
                      placeholder="2400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                      placeholder="50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newProduct.category}
                    onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Product description..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProduct}>Add Product</Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
          {/* Edit Product Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>Update product details.</DialogDescription>
              </DialogHeader>
              {editProduct && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Product Name</Label>
                      <Input
                        id="edit-name"
                        value={editProduct.name}
                        onChange={e => setEditProduct({ ...editProduct, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-sku">SKU</Label>
                      <Input
                        id="edit-sku"
                        value={editProduct.sku}
                        onChange={e => setEditProduct({ ...editProduct, sku: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-barcode">Barcode</Label>
                    <Input
                      id="edit-barcode"
                      value={editProduct.barcode}
                      onChange={e => setEditProduct({ ...editProduct, barcode: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-price">Price (₦)</Label>
                      <Input
                        id="edit-price"
                        type="number"
                        step="50"
                        value={editProduct.price}
                        onChange={e => setEditProduct({ ...editProduct, price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-cost">Cost (₦)</Label>
                      <Input
                        id="edit-cost"
                        type="number"
                        step="50"
                        value={editProduct.cost}
                        onChange={e => setEditProduct({ ...editProduct, cost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-stock">Stock</Label>
                      <Input
                        id="edit-stock"
                        type="number"
                        value={editProduct.stock}
                        onChange={e => setEditProduct({ ...editProduct, stock: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={editProduct.category}
                      onValueChange={value => setEditProduct({ ...editProduct, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editProduct.description}
                      onChange={e => setEditProduct({ ...editProduct, description: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateProduct}>Update Product</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Product Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter((p) => p.stock < 20).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{products.reduce((sum, p) => sum + p.price * p.stock, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Manage your product inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">{product.description}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{product.sku}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="font-medium font-mono">₦{Number(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Badge variant={product.stock < 20 ? "destructive" : "default"}>{product.stock}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {canEditProducts() && (
                        <Button size="sm" variant="ghost" onClick={() => handleEditClick(product)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {canDeleteProducts() && (
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}