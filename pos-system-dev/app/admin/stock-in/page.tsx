"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  ArrowDownToLine,
  CheckCircle2,
  Clock,
  Package,
  Building2,
  FileText,
  Layers,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"

const schema = z.object({
  productId: z.string().min(1, "Product selection is required"),
  locationId: z.string().min(1, "Branch selection is required"),
  quantity: z.coerce.number().int().positive("Received quantity must be a positive number"),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ProductOption {
  id: string
  name: string
  sku: string
}

interface BranchOption {
  id: string
  name: string
}

interface RecentMovement {
  id: string
  productName: string
  productSku?: string
  quantity: number
  newQuantity?: number
  referenceNumber?: string
  locationName?: string
  createdAt: string
}

export default function StockInPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [products, setProducts] = useState<ProductOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [successInfo, setSuccessInfo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: "",
      locationId: "",
      quantity: 1,
      reference: "",
      notes: "",
    },
  })

  const selectedProductId = watch("productId")
  const selectedLocationId = watch("locationId")
  const enteredQuantity = watch("quantity")

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const selectedBranch = branches.find((b) => b.id === selectedLocationId)

  // Load products, branches, and recent stock-in records
  useEffect(() => {
    async function loadOptions() {
      try {
        let prodRes = await fetch("/api/admin/products")
        if (!prodRes.ok) prodRes = await fetch("/api/products")
        if (prodRes.ok) {
          const p = await prodRes.json()
          setProducts(Array.isArray(p) ? p : p.data || [])
        }

        let locRes = await fetch("/api/admin/locations")
        if (!locRes.ok) locRes = await fetch("/api/locations")
        if (locRes.ok) {
          const l = await locRes.json()
          const bList = Array.isArray(l) ? l : l.data || []
          setBranches(bList)
          // Default branch if user is scoped
          if (user?.locationId) {
            setValue("locationId", user.locationId)
          } else if (bList.length > 0) {
            setValue("locationId", bList[0].id)
          }
        }

        const movRes = await fetch("/api/stock-movements?type=STOCK_IN&limit=5")
        if (movRes.ok) {
          const m = await movRes.json()
          setRecentMovements(Array.isArray(m) ? m : m.data || [])
        }
      } catch (err) {
        console.error("Error loading stock-in options:", err)
      }
    }
    loadOptions()
  }, [])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setSuccessInfo(null)
    try {
      const res = await fetch("/api/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Failed to record stock-in")
        return
      }

      toast.success(
        `Received ${data.quantity} units of ${selectedProduct?.name || "product"} into ${
          selectedBranch?.name || "branch"
        }`
      )
      setSuccessInfo(
        `Successfully logged +${data.quantity} units. New available balance: ${json.newQuantity} units.`
      )

      reset({
        productId: "",
        locationId: data.locationId,
        quantity: 1,
        reference: "",
        notes: "",
      })

      // Refresh recent movements ledger
      const movRes = await fetch("/api/stock-movements?type=STOCK_IN&limit=5")
      if (movRes.ok) setRecentMovements(await movRes.json())
    } catch (err) {
      toast.error("Network error recording stock-in")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record Stock-In (Goods Receipt)"
        description="Receive incoming shipments and inventory deliveries into a supermarket branch. Executes an atomic transaction updating branch stock balance."
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Stock-In" },
        ]}
        actions={
          <Button asChild variant="outline" size="sm" className="h-9 text-xs border-slate-300">
            <Link href="/admin/inventory">
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              View Stock Balances
            </Link>
          </Button>
        }
      />

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Form Container (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Receipt Details</h2>
            <p className="text-xs text-slate-500">Provide product, branch, and quantity details</p>
          </div>

          {successInfo && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Transaction Recorded</p>
                <p>{successInfo}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Branch Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="locationId" className="text-xs font-bold text-slate-700">
                Receiving Branch Location <span className="text-rose-500">*</span>
              </Label>
              <select
                id="locationId"
                {...register("locationId")}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              >
                <option value="">Select branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.locationId && (
                <p className="text-[11px] text-rose-600">{errors.locationId.message}</p>
              )}
            </div>

            {/* Product Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="productId" className="text-xs font-bold text-slate-700">
                Product / SKU <span className="text-rose-500">*</span>
              </Label>
              <select
                id="productId"
                {...register("productId")}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              >
                <option value="">Select registered product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              {errors.productId && (
                <p className="text-[11px] text-rose-600">{errors.productId.message}</p>
              )}
            </div>

            {/* Quantity & Reference (2 cols on desktop) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-xs font-bold text-slate-700">
                  Received Quantity <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  {...register("quantity")}
                  className="h-10 text-xs font-mono font-bold"
                  placeholder="e.g. 100"
                />
                {errors.quantity && (
                  <p className="text-[11px] text-rose-600">{errors.quantity.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference" className="text-xs font-bold text-slate-700">
                  PO / Waybill Number
                </Label>
                <Input
                  id="reference"
                  {...register("reference")}
                  className="h-10 text-xs font-mono"
                  placeholder="e.g. PO-2026-0042"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold text-slate-700">
                Operational Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                {...register("notes")}
                rows={2}
                className="text-xs"
                placeholder="Supplier name, delivery vehicle tag, batch code, or condition remarks..."
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#14532D] hover:bg-[#0f3e22] text-white font-bold h-11 text-xs"
            >
              {submitting ? "Executing Stock-In Transaction..." : "Confirm & Commit Stock-In"}
            </Button>
          </form>
        </div>

        {/* Live Calculation Preview & Ledger (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Summary Preview Box */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Transaction Preview
              </span>
              <span className="text-[10px] font-mono text-slate-400">Rule BR-04 Enforcement</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Receiving Branch:</span>
                <span className="font-bold text-slate-200">
                  {selectedBranch?.name || "Not selected"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Product SKU:</span>
                <span className="font-mono text-slate-200">
                  {selectedProduct?.sku || "Not selected"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Quantity Addition:</span>
                <span className="font-mono font-bold text-emerald-400">
                  +{enteredQuantity || 0} units
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Once submitted, the system atomically increments branch stock and creates an immutable
              audit record with your user credentials.
            </p>
          </div>

          {/* Recent Stock-In Ledger */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Recent Goods Received
            </h3>
            <div className="space-y-2.5">
              {recentMovements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No recent stock-in events recorded.
                </p>
              ) : (
                recentMovements.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{m.productName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {m.referenceNumber || "Direct Receipt"} ·{" "}
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">+{m.quantity}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
