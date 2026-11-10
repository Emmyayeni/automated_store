"use client"

import React, { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tags,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  Layers,
  RefreshCw,
  FolderOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"

interface CategoryItem {
  id: string
  name: string
  description?: string | null
  productCount: number
  createdAt?: string
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [submittingCreate, setSubmittingCreate] = useState(false)

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Delete State
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null)
  const [submittingDelete, setSubmittingDelete] = useState(false)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/categories")
      if (!res.ok) throw new Error("Failed to load categories")
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }, [categories, searchQuery])

  // KPIs
  const totalCategories = categories.length
  const activeCategoriesWithProducts = categories.filter((c) => (c.productCount || 0) > 0).length
  const totalClassifiedProducts = categories.reduce((acc, c) => acc + (c.productCount || 0), 0)
  const topCategory = useMemo(() => {
    if (categories.length === 0) return null
    return [...categories].sort((a, b) => (b.productCount || 0) - (a.productCount || 0))[0]
  }, [categories])

  // Create Handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      toast.error("Category name is required")
      return
    }
    setSubmittingCreate(true)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create category")

      toast.success(`Category "${createName.trim()}" created successfully`)
      setCreateName("")
      setCreateDescription("")
      setCreateOpen(false)
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message || "Failed to create category")
    } finally {
      setSubmittingCreate(false)
    }
  }

  // Edit Handler
  const openEdit = (cat: CategoryItem) => {
    setEditingCategory(cat)
    setEditName(cat.name)
    setEditDescription(cat.description || "")
    setEditOpen(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !editName.trim()) return
    setSubmittingEdit(true)
    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update category")

      toast.success("Category updated successfully")
      setEditOpen(false)
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message || "Failed to update category")
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Delete Handler
  const openDelete = (cat: CategoryItem) => {
    setDeletingCategory(cat)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingCategory) return
    setSubmittingDelete(true)
    try {
      const res = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete category")

      toast.success("Category deleted successfully")
      setDeleteOpen(false)
      fetchCategories()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category")
    } finally {
      setSubmittingDelete(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Categories"
        description="Organize your supermarket inventory hierarchy, department aisles, and shelf tags."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Products", href: "/admin/products" },
          { label: "Categories" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCategories}
              disabled={loading}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-[#14532D] hover:bg-[#14532D]/90 text-white font-medium shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Category
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Categories"
          value={totalCategories}
          description="Aisles & Departments"
          icon={<Tags className="h-5 w-5" />}
        />
        <StatCard
          title="Active in Catalog"
          value={activeCategoriesWithProducts}
          description="Categories containing SKUs"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          title="Classified Products"
          value={totalClassifiedProducts}
          description="Total SKUs mapped"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          title="Largest Department"
          value={topCategory ? topCategory.name : "N/A"}
          description={topCategory ? `${topCategory.productCount} products assigned` : "No products yet"}
          icon={<Layers className="h-5 w-5" />}
        />
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Category Directory</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Manage product categorization for POS quick filters, stock reports, and retail aisles.
            </CardDescription>
          </div>
          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search category name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mb-2" />
              <span>Loading category directory...</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <FolderOpen className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">No categories found</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {searchQuery
                  ? `No categories matching "${searchQuery}". Clear your search or create a new one.`
                  : "Start structuring your store by creating your first supermarket category."}
              </p>
              {!searchQuery && (
                <Button
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create Category
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Category Name</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Description</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3 text-center">Associated SKUs</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Date Added</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                      <TableCell className="font-medium text-xs text-slate-900 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-100">
                            <Tags className="h-3.5 w-3.5 text-emerald-700" />
                          </div>
                          <span className="font-semibold text-slate-900">{cat.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate py-3.5">
                        {cat.description || <span className="text-slate-400 italic">No notes provided</span>}
                      </TableCell>
                      <TableCell className="text-xs text-center py-3.5">
                        <Badge
                          variant="secondary"
                          className={
                            cat.productCount > 0
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }
                        >
                          {cat.productCount} {cat.productCount === 1 ? "product" : "products"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>
                            {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : "Default"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 text-xs">
                            <DropdownMenuItem onClick={() => openEdit(cat)} className="cursor-pointer">
                              <Edit className="h-3.5 w-3.5 mr-2 text-slate-500" />
                              Edit Category
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDelete(cat)}
                              className="text-rose-600 focus:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-500" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-200">
                <Tags className="h-4 w-4 text-emerald-700" />
              </div>
              Register New Category
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a retail category to organize catalog products, aisles, and POS filter chips.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Category Name *</Label>
              <Input
                placeholder="e.g. Dairy & Eggs, Fresh Produce, Beverages"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                className="text-xs border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Description / Aisle Location</Label>
              <Textarea
                placeholder="Optional description, supermarket aisle notes, or temperature requirements..."
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={3}
                className="text-xs border-slate-200 focus:border-emerald-600 focus:ring-emerald-600 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateOpen(false)}
                className="text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingCreate || !createName.trim()}
                className="bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-medium"
              >
                {submittingCreate ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Save Category
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit className="h-4 w-4 text-emerald-700" />
              Edit Category
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update category details. Note: Changing the category name will update display tags.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Category Name *</Label>
              <Input
                placeholder="Category name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="text-xs border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Description</Label>
              <Textarea
                placeholder="Category description..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="text-xs border-slate-200 focus:border-emerald-600 focus:ring-emerald-600 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(false)}
                className="text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingEdit || !editName.trim()}
                className="bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-medium"
              >
                {submittingEdit ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              Delete Category
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              Are you sure you want to delete{" "}
              <strong className="text-slate-900 font-semibold">{deletingCategory?.name}</strong>?
              {deletingCategory && deletingCategory.productCount > 0 ? (
                <span className="block mt-2 text-rose-600 font-medium bg-rose-50 p-2 rounded border border-rose-100">
                  This category currently has {deletingCategory.productCount} product(s) linked to it. You must reassign or remove them first.
                </span>
              ) : (
                <span className="block mt-2 text-slate-500">
                  This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              className="text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingDelete || (deletingCategory?.productCount || 0) > 0}
              onClick={handleDelete}
              className="text-xs bg-rose-600 hover:bg-rose-700"
            >
              {submittingDelete ? "Deleting..." : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
