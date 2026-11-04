"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  ArrowUpFromLine,
  AlertTriangle,
  Clock,
  Layers,
  Building2,
  Package,
  ShieldAlert,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/ui/page-header"

const REASONS = [
  { value: "DAMAGED", label: "Damaged Goods / Spoilage" },
  { value: "EXPIRED", label: "Expired Products" },
  { value: "SALE", label: "Manual Direct Sale" },
  { value: "INTERNAL_USE", label: "Store Consumption / Internal Use" },
  { value: "ADJUSTMENT", label: "Audit Recount Adjustment" },
  { value: "OTHER", label: "Other Authorized Reason" },
]

const schema = z.object({
  productId: z.string().min(1, "Product selection is required"),
  locationId: z.string().min(1, "Branch selection is required"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
  reason: z.enum(["SALE", "DAMAGED", "EXPIRED", "INTERNAL_USE", "ADJUSTMENT", "OTHER"]),
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
  quantity: number
  newQuantity?: number
  reason?: string
  referenceNumber?: string
  createdAt: string
}

export default function StockOutPage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const [products, setProducts] = useState<ProductOption[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [availableStock, setAvailableStock] = useState<number | null>(null)
  const [checkingStock, setCheckingStock] = useState(false)
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
      reason: "DAMAGED",
      reference: "",
      notes: "",
    },
  })

  const selectedProductId = watch("productId")
  const selectedLocationId = watch("locationId")
  const enteredQuantity = watch("quantity")
  const selectedReason = watch("reason")

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const selectedBranch = branches.find((b) => b.id === selectedLocationId)

  // Load products and branches
  useEffect(() => {
    async function loadOptions() {
      try {
        const [prodRes, locRes, movRes] = await Promise.all([
          fetch("/api/admin/products"),
          fetch("/api/admin/locations"),
          fetch("/api/stock-movements?type=STOCK_OUT&limit=5"),
        ])

        if (prodRes.ok) {
          const p = await prodRes.json()
          setProducts(p.data || p || [])
        }
        if (locRes.ok) {
          const l = await locRes.json()
          const bList = l.data || l || []
          setBranches(bList)
          if (user?.locationId) {
            setValue("locationId", user.locationId)
          } else if (bList.length > 0) {
            setValue("locationId", bList[0].id)
          }
        }
        if (movRes.ok) {
          const m = await movRes.json()
          setRecentMovements(m || [])
        }
      } catch (err) {
        console.error("Error loading stock-out options:", err)
      }
    }
    loadOptions()
  }, [])

  // Check live stock when product or branch changes
  useEffect(() => {
    if (!selectedProductId || !selectedLocationId) {
      setAvailableStock(null)
      return
    }

    async function checkStock() {
      setCheckingStock(true)
      try {
        const res = await fetch(`/api/inventory?locationId=${selectedLocationId}`)
        if (res.ok) {
          const data = await res.json()
          const match = (data.items || []).find((i: any) => i.productId === selectedProductId)
          setAvailableStock(match ? match.quantity : 0)
        }
      } catch (err) {
        setAvailableStock(null)
      } finally {
        setCheckingStock(false)
      }
    }

    checkStock()
  }, [selectedProductId, selectedLocationId])

  const isInsufficient =
    availableStock !== null && enteredQuantity !== undefined && enteredQuantity > availableStock

  const onSubmit = async (data: FormData) => {
    if (isInsufficient) {
      toast.error(
        `Insufficient stock! Branch only holds ${availableStock} units. Cannot deduct ${data.quantity}.`
      )
      return
    }

    setSubmitting(true)
    setSuccessInfo(null)
    try {
      const res = await fetch("/api/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Failed to record stock-out")
        return
      }

      toast.success(
        `Deducted ${data.quantity} units of ${selectedProduct?.name || "product"} from ${
          selectedBranch?.name || "branch"
        }`
      )
      setSuccessInfo(
        `Deducted -${data.quantity} units. New available balance: ${json.newQuantity} units.`
      )

      reset({
        productId: "",
        locationId: data.locationId,
        quantity: 1,
        reason: "DAMAGED",
        reference: "",
        notes: "",
      })
      setAvailableStock(null)

      const movRes = await fetch("/api/stock-movements?type=STOCK_OUT&limit=5")
      if (movRes.ok) setRecentMovements(await movRes.json())
    } catch (err) {
      toast.error("Network error recording stock-out")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Record Stock-Out (Inventory Deduction)"
        description="Record inventory reductions for damages, expirations, shrinkage, or audit corrections. Strictly rejects negative stock (Rule BR-06)."
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Stock-Out" },
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
        {/* Form Container */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Deduction Details</h2>
            <p className="text-xs text-slate-500">
              Provide product, branch, reduction reason, and authorization remarks
            </p>
          </div>

          {successInfo && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Deduction Confirmed</p>
                <p>{successInfo}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Branch Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="locationId" className="text-xs font-bold text-slate-700">
                Source Branch Location <span className="text-rose-500">*</span>
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
                <option value="">Select product to deduct...</option>
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

            {/* Live Available Stock Badge */}
            {selectedProductId && selectedLocationId && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  availableStock === 0
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : (availableStock || 0) < 10
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <span className="font-medium">Current Branch Balance:</span>
                <span className="font-mono font-bold text-sm">
                  {checkingStock ? "Verifying..." : `${availableStock ?? "0"} units available`}
                </span>
              </div>
            )}

            {/* Quantity & Reason (2 cols on desktop) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-xs font-bold text-slate-700">
                  Deduction Quantity <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={availableStock ?? undefined}
                  step="1"
                  {...register("quantity")}
                  className={`h-10 text-xs font-mono font-bold ${
                    isInsufficient ? "border-rose-500 text-rose-600 bg-rose-50" : ""
                  }`}
                  placeholder="e.g. 5"
                />
                {isInsufficient && (
                  <p className="text-[11px] text-rose-600 font-semibold">
                    Exceeds available stock ({availableStock} units max).
                  </p>
                )}
                {errors.quantity && (
                  <p className="text-[11px] text-rose-600">{errors.quantity.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-xs font-bold text-slate-700">
                  Deduction Reason <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="reason"
                  {...register("reason")}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <Label htmlFor="reference" className="text-xs font-bold text-slate-700">
                Incident / Disposal Reference Number
              </Label>
              <Input
                id="reference"
                {...register("reference")}
                className="h-10 text-xs font-mono"
                placeholder="e.g. DISP-2026-0012"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold text-slate-700">
                Reason Description & Audit Notes
              </Label>
              <Textarea
                id="notes"
                {...register("notes")}
                rows={2}
                className="text-xs"
                placeholder="Describe circumstances, damaged carton count, expiration stamp, or inspector initials..."
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || isInsufficient || checkingStock}
              className="w-full bg-[#14532D] hover:bg-[#0f3e22] text-white font-bold h-11 text-xs"
            >
              {submitting ? "Processing Atomic Deduction..." : "Confirm & Commit Stock-Out"}
            </Button>
          </form>
        </div>

        {/* Live Calculation Preview & Ledger */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Negative-Stock Guard (BR-06)
              </span>
              <span className="text-[10px] font-mono text-slate-400">Strict Validation</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Branch:</span>
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
                <span className="text-slate-400">Deduction Qty:</span>
                <span className="font-mono font-bold text-rose-400">
                  -{enteredQuantity || 0} units
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Reason Category:</span>
                <span className="font-bold text-slate-200">{selectedReason}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Stock-out operations write an immutable movement log and recalculate status. If remaining
              balance drops below reorder point, an automated low-stock alert is raised.
            </p>
          </div>

          {/* Recent Stock-Out Ledger */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Recent Deductions & Disposals
            </h3>
            <div className="space-y-2.5">
              {recentMovements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No recent stock-out events recorded.
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
                        {m.reason || "Deduction"} ·{" "}
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-rose-600">-{m.quantity}</span>
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
