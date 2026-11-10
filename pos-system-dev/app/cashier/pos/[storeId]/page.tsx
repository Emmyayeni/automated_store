"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import {
  ShoppingCart,
  Search,
  Scan,
  CreditCard,
  Banknote,
  Smartphone,
  Plus,
  Minus,
  Trash2,
  Receipt,
  ArrowLeft,
  RefreshCw,
  Clock,
  DollarSign,
  Package,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Play,
  Printer,
  ChevronRight,
  ExternalLink,
  Wifi,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import SplitPaymentModal from "@/components/payments/split-payment-modal"
import CashDrawerModal from "@/components/pos/cash-drawer-modal"

interface Product {
  id: string
  name: string
  sku: string
  barcode?: string
  price: number
  cost?: number
  stock: number
  category: string
  image?: string
}

interface CartItem {
  id: string
  name: string
  sku: string
  price: number
  quantity: number
  stock: number
}

interface CompletedSale {
  transactionNumber: string
  time: string
  itemsCount: number
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  items: CartItem[]
  cashierName: string
  cashTendered?: number
  changeDue?: number
}

interface HeldOrder {
  id: string
  items: CartItem[]
  time: string
  reason?: string
}

const safeParsePrice = (val: any): number => {
  if (typeof val === "number") return isNaN(val) ? 0 : val
  if (!val) return 0
  if (typeof val === "string") {
    const cleaned = val.replace(/[^0-9.-]+/g, "")
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export default function StorePOSPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.storeId as string
  const { data: session, status } = useSession()

  const sessionUser = (session as any)?.user
  const userId = sessionUser?.id || "cashier-user"
  const cashierName = sessionUser?.name || "Cashier"
  const userLocationId = sessionUser?.locationId

  // Terminal state
  const [storeName, setStoreName] = useState("Downtown Central Hub")
  const [taxRate, setTaxRate] = useState(0.08)
  const [currentTime, setCurrentTime] = useState("")

  // Products & search
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Cart & Orders
  const [cart, setCart] = useState<CartItem[]>([])
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([])
  const [showHeldDialog, setShowHeldDialog] = useState(false)

  // Modals & Payments
  const [showTenderModal, setShowTenderModal] = useState(false)
  const [tenderMethod, setTenderMethod] = useState<"cash" | "card" | "transfer">("cash")
  const [cashTendered, setCashTendered] = useState("")
  const [showSplitPayment, setShowSplitPayment] = useState(false)
  const [showCashDrawer, setShowCashDrawer] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [activeReceipt, setActiveReceipt] = useState<CompletedSale | null>(null)
  const [processing, setProcessing] = useState(false)

  // Live system clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Authentication check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Fetch store details
  useEffect(() => {
    if (!storeId) return

    const userRole = (sessionUser?.role || "").toUpperCase()
    const isElevated = ["ADMIN", "MANAGER", "BRANCH_MANAGER"].includes(userRole)

    if (!isElevated && userLocationId && userLocationId !== storeId) {
      router.push(`/cashier/pos/${userLocationId}`)
      return
    }

    fetch(`/api/store/${storeId}`)
      .then((res) => res.json())
      .then((data) => {
        const storeData = data?.data || data
        if (storeData && storeData.name) {
          setStoreName(storeData.name)
          if (storeData.taxRate) setTaxRate(parseFloat(storeData.taxRate))
        }
      })
      .catch((err) => {
        console.warn("Store lookup fallback:", err)
      })
  }, [storeId, userLocationId, sessionUser, router])

  // Fetch product catalog
  const loadProducts = async () => {
    setLoading(true)
    try {
      const url = storeId ? `/api/products?locationId=${storeId}` : `/api/products`
      let res = await fetch(url)
      if (!res.ok) {
        res = await fetch("/api/admin/products")
      }
      const data = await res.json()
      const rawList = Array.isArray(data) ? data : data.data || []

      setProducts(
        rawList.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || p.barcode || "SKU-" + p.id.slice(0, 5),
          barcode: p.barcode || p.sku || "",
          price: safeParsePrice(p.price ?? p.rawPrice),
          stock: typeof p.stock === "number" ? p.stock : (p.inventory?.[0]?.quantity ?? 25),
          category: p.category || "General",
        }))
      )
    } catch (err) {
      console.error("Error loading POS products:", err)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [storeId])

  // Extract categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ["ALL", ...Array.from(set)]
  }, [products])

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery))
      const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  // Barcode scanner trigger
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    const code = barcodeInput.trim().toLowerCase()
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code) ||
        (p.sku && p.sku.toLowerCase() === code) ||
        p.name.toLowerCase().includes(code)
    )

    if (found) {
      addToCart(found)
      toast({
        title: "Barcode Scanned",
        description: `Added "${found.name}" to cart.`,
      })
      setBarcodeInput("")
    } else {
      toast({
        title: "Product Not Found",
        description: `No SKU or barcode matching "${barcodeInput}".`,
        variant: "destructive",
      })
    }
  }

  // Cart actions
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock.`,
        variant: "destructive",
      })
      return
    }

    const existing = cart.find((i) => i.id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast({
          title: "Stock Limit",
          description: `Cannot exceed available shelf stock (${product.stock} units).`,
          variant: "destructive",
        })
        return
      }
      setCart(cart.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)))
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
          stock: product.stock,
        },
      ])
    }
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta
            if (nextQty > item.stock) {
              toast({
                title: "Stock Limit",
                description: `Only ${item.stock} units available in inventory.`,
                variant: "destructive",
              })
              return item
            }
            return nextQty > 0 ? { ...item, quantity: nextQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter((i) => i.id !== id))
  }

  const clearCart = () => {
    setCart([])
  }

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, i) => acc + i.price * i.quantity, 0)
  }, [cart])

  const taxAmount = useMemo(() => {
    return subtotal * taxRate
  }, [subtotal, taxRate])

  const totalAmount = useMemo(() => {
    return subtotal + taxAmount
  }, [subtotal, taxAmount])

  // Hold / Resume Order
  const handleHoldOrder = () => {
    if (cart.length === 0) return
    const newHeld: HeldOrder = {
      id: "HOLD-" + Math.floor(1000 + Math.random() * 9000),
      items: [...cart],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setHeldOrders([newHeld, ...heldOrders])
    setCart([])
    toast({
      title: "Order Parked / Held",
      description: `Held order #${newHeld.id} saved. You can resume it anytime.`,
    })
  }

  const handleResumeOrder = (held: HeldOrder) => {
    if (cart.length > 0) {
      toast({
        title: "Cart In Use",
        description: "Please complete or clear the active cart before resuming a parked order.",
        variant: "destructive",
      })
      return
    }
    setCart(held.items)
    setHeldOrders(heldOrders.filter((h) => h.id !== held.id))
    setShowHeldDialog(false)
    toast({
      title: "Order Resumed",
      description: `Restored ${held.items.length} items from #${held.id}.`,
    })
  }

  // Initiate Settlement Tender
  const openTender = (method: "cash" | "card" | "transfer") => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add products to the register before settling.",
        variant: "destructive",
      })
      return
    }
    setTenderMethod(method)
    setCashTendered(totalAmount.toFixed(2))
    setShowTenderModal(true)
  }

  // Finalize Sale & Emit Receipt
  const executePayment = async () => {
    setProcessing(true)
    try {
      const numericTendered = parseFloat(cashTendered) || totalAmount
      const changeDue = Math.max(0, numericTendered - totalAmount)

      const payload = {
        customerId: null,
        userId,
        locationId: storeId,
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
        paymentMethod: tenderMethod,
        taxRate,
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      let txnNumber = "TXN-" + Math.floor(100000 + Math.random() * 900000)
      if (res.ok) {
        const json = await res.json()
        if (json?.data?.transaction?.transactionNumber) {
          txnNumber = json.data.transaction.transactionNumber
        }
      }

      const receipt: CompletedSale = {
        transactionNumber: txnNumber,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        itemsCount: cart.reduce((s, i) => s + i.quantity, 0),
        subtotal,
        taxAmount,
        totalAmount,
        paymentMethod: tenderMethod,
        items: [...cart],
        cashierName,
        cashTendered: numericTendered,
        changeDue: tenderMethod === "cash" ? changeDue : 0,
      }

      setActiveReceipt(receipt)
      setShowTenderModal(false)
      setShowReceiptModal(true)
      setCart([])

      // Deduct local product stock
      setProducts((prev) =>
        prev.map((p) => {
          const itemInCart = receipt.items.find((i) => i.id === p.id)
          return itemInCart ? { ...p, stock: Math.max(0, p.stock - itemInCart.quantity) } : p
        })
      )

      toast({
        title: "Checkout Finalized!",
        description: `Receipt ${txnNumber} issued successfully.`,
      })
    } catch (err) {
      toast({
        title: "Payment Error",
        description: "Failed to finalize sale. Please verify network.",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col antialiased overflow-hidden select-none">
      {/* ───────────────── TOP POS COMMAND HEADER ───────────────── */}
      <header className="shrink-0 h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shadow-xs z-30">
        {/* Left: Exit & Brand */}
        <div className="flex items-center gap-3">
          <Link href="/cashier">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Exit POS
            </Button>
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#14532D] text-white flex items-center justify-center font-black shadow-xs">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">
                  {storeName}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Terminal 01
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block leading-tight">
                StockFlow Supermarket POS Workstation
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Barcode & Fast Scanner Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <form onSubmit={handleBarcodeSubmit} className="w-full relative">
            <Scan className="absolute left-3 top-2.5 h-4 w-4 text-emerald-700" />
            <Input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan barcode or enter SKU and press Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="pl-9 pr-16 h-9 text-xs bg-slate-50 border-slate-300 focus-visible:ring-[#14532D] font-mono"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1 h-7 px-2.5 text-[11px] bg-[#14532D] hover:bg-[#0f3e22] text-white font-bold"
            >
              Scan
            </Button>
          </form>
        </div>

        {/* Right: Actions, Clock & Cashier */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Held Orders Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHeldDialog(true)}
            className="h-9 text-xs font-semibold border-slate-300 relative"
          >
            <Pause className="h-3.5 w-3.5 mr-1 text-amber-600" />
            <span className="hidden sm:inline">Parked</span>
            {heldOrders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {heldOrders.length}
              </span>
            )}
          </Button>

          {/* Cash Drawer Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCashDrawer(true)}
            className="h-9 text-xs font-semibold border-slate-300"
          >
            <DollarSign className="h-3.5 w-3.5 mr-1 text-emerald-700" />
            <span className="hidden sm:inline">Drawer</span>
          </Button>

          {/* Clock Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-xs font-mono font-bold text-slate-700 border border-slate-200">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>{currentTime}</span>
          </div>

          {/* Cashier Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
              {cashierName.charAt(0)}
            </div>
            <div className="hidden xl:block text-left">
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {cashierName}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold block leading-tight">
                Register Clerk
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ───────────────── MAIN TWO-COLUMN SPLIT ───────────────── */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        {/* LEFT COLUMN: PRODUCT CATALOG & FAST LOOKUP (62% width) */}
        <div className="flex-[3] flex flex-col min-w-0 border-r border-slate-200 bg-white">
          {/* Subheader: Search input & Category Chips */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 space-y-3 shrink-0">
            {/* Mobile Scan Bar */}
            <form onSubmit={handleBarcodeSubmit} className="md:hidden flex gap-2">
              <div className="relative flex-1">
                <Scan className="absolute left-3 top-2.5 h-4 w-4 text-emerald-700" />
                <Input
                  placeholder="Scan barcode or SKU..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-300 font-mono"
                />
              </div>
              <Button type="submit" size="sm" className="h-9 bg-[#14532D] text-white">
                Scan
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search products by title, SKU, or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white border-slate-300 focus-visible:ring-[#14532D]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadProducts}
                disabled={loading}
                className="h-9 px-2.5 border-slate-300 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-700" : ""}`} />
              </Button>
            </div>

            {/* Category Chips Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-[#14532D] text-white shadow-xs font-bold"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin text-[#14532D] mb-2" />
                <p className="text-xs font-bold text-slate-600">Loading supermarket shelf catalog...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-slate-400">
                <Package className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">No products found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust your search query or select another category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const isOut = product.stock <= 0
                  const isLow = !isOut && product.stock <= 5

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOut && addToCart(product)}
                      className={`group relative flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-white transition-all text-left ${
                        isOut
                          ? "opacity-40 cursor-not-allowed bg-slate-50"
                          : "hover:border-[#14532D] hover:shadow-md cursor-pointer active:scale-[0.98]"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                            {product.category}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              isOut
                                ? "bg-rose-100 text-rose-800"
                                : isLow
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {isOut ? "OUT" : `${product.stock} left`}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#14532D] transition-colors line-clamp-2 leading-snug">
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {product.sku || product.barcode}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="text-sm font-black text-[#14532D]">
                          ${product.price.toFixed(2)}
                        </span>
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                            isOut
                              ? "bg-slate-100 text-slate-300"
                              : "bg-slate-100 group-hover:bg-[#14532D] text-slate-700 group-hover:text-white shadow-2xs"
                          }`}
                        >
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REGISTER CART & INSTANT TENDER (38% width) */}
        <div className="flex-[2] flex flex-col min-w-0 bg-white">
          {/* Cart Header */}
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-[#14532D] text-white flex items-center justify-center">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">Current Sale</h3>
              <Badge className="bg-[#14532D] text-white text-[11px] font-bold px-2 py-0.2">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </Badge>
            </div>

            {cart.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHoldOrder}
                  className="h-7 px-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                  title="Park order for later"
                >
                  <Pause className="h-3.5 w-3.5 mr-1" />
                  Park
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="h-7 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 text-center">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-300">
                  <ShoppingCart className="h-7 w-7" />
                </div>
                <p className="text-sm font-bold text-slate-700">Register cart is empty</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Click on catalog items or scan barcode with scanner to add products.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all text-xs shadow-2xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-extrabold text-slate-900 truncate leading-snug">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      ${item.price.toFixed(2)} each
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="h-7 w-7 text-slate-600 border-slate-300 hover:bg-slate-100"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-7 text-center font-black text-slate-800 text-xs">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-7 w-7 text-slate-600 border-slate-300 hover:bg-slate-100"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFromCart(item.id)}
                      className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Line Total */}
                  <div className="w-16 text-right font-black text-slate-900 text-sm shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bill Summary & Tender Bar (Pinned at Bottom) */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/90 shrink-0 space-y-3">
            {/* Calculation Lines */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span className="font-semibold text-slate-900">${taxAmount.toFixed(2)}</span>
              </div>
              <Separator className="bg-slate-200 my-1" />
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-extrabold text-slate-900">Total Payable</span>
                <span className="text-2xl font-black text-[#14532D]">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Tender Method Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => openTender("cash")}
                  disabled={cart.length === 0}
                  className="h-13 flex-col gap-1 bg-[#14532D] hover:bg-[#0f3e22] text-white shadow-xs font-bold"
                >
                  <Banknote className="h-4 w-4" />
                  <span className="text-xs">Cash</span>
                </Button>

                <Button
                  onClick={() => openTender("card")}
                  disabled={cart.length === 0}
                  className="h-13 flex-col gap-1 bg-slate-800 hover:bg-slate-900 text-white shadow-xs font-bold"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs">Card POS</span>
                </Button>

                <Button
                  onClick={() => setShowSplitPayment(true)}
                  disabled={cart.length === 0}
                  className="h-13 flex-col gap-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs font-bold"
                >
                  <Smartphone className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs">Split Pay</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────── CASH TENDER & CHANGE DUE DIALOG ───────────────── */}
      <Dialog open={showTenderModal} onOpenChange={setShowTenderModal}>
        <DialogContent className="max-w-md bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#14532D]" />
              Confirm {tenderMethod.toUpperCase()} Settlement
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Process customer tender and generate store receipt invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-xs font-bold text-emerald-900 block">Total Due</span>
              <span className="text-3xl font-black text-[#14532D] block mt-0.5">
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            {tenderMethod === "cash" && (
              <div className="space-y-3">
                <label className="text-xs font-extrabold text-slate-800">
                  Cash Amount Tendered ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="font-mono text-lg font-black text-slate-900 h-11"
                  autoFocus
                />

                {/* Preset Cash Bills */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    Math.ceil(totalAmount),
                    Math.ceil(totalAmount / 10) * 10 || 10,
                    20,
                    50,
                  ].map((preset, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCashTendered(preset.toFixed(2))}
                      className="text-xs font-extrabold border-slate-300 h-9"
                    >
                      ${preset}
                    </Button>
                  ))}
                </div>

                {parseFloat(cashTendered) >= totalAmount && (
                  <div className="p-3 rounded-lg bg-emerald-100/70 border border-emerald-300 flex justify-between items-center text-xs">
                    <span className="font-extrabold text-emerald-900">Change Due to Customer:</span>
                    <span className="font-black text-emerald-800 text-base">
                      ${(parseFloat(cashTendered) - totalAmount).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {tenderMethod === "card" && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
                <CreditCard className="h-8 w-8 mx-auto text-slate-600 animate-pulse" />
                <p className="text-sm font-extrabold text-slate-800">Pinpad Terminal Ready</p>
                <p className="text-xs text-slate-500">
                  Tap, insert, or swipe card for ${totalAmount.toFixed(2)}
                </p>
              </div>
            )}

            {tenderMethod === "transfer" && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
                <Smartphone className="h-8 w-8 mx-auto text-emerald-700" />
                <p className="text-sm font-extrabold text-slate-800">Bank Transfer / QR Pay</p>
                <p className="text-xs text-slate-500">
                  Verify notification credit of ${totalAmount.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTenderModal(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={executePayment}
              disabled={
                processing ||
                (tenderMethod === "cash" && parseFloat(cashTendered) < totalAmount)
              }
              className="bg-[#14532D] hover:bg-[#0f3e22] text-white font-bold h-9 px-4"
            >
              {processing ? "Finalizing..." : "Finalize & Print Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────── HELD / PARKED TRANSACTIONS DIALOG ───────────────── */}
      <Dialog open={showHeldDialog} onOpenChange={setShowHeldDialog}>
        <DialogContent className="max-w-md bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Pause className="h-5 w-5 text-amber-600" />
              Parked / Held Customer Orders ({heldOrders.length})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Resume a previously parked order into the live register cart.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-72 overflow-y-auto py-2">
            {heldOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Pause className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No parked orders</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use the "Park" button in the cart to temporarily hold an order.
                </p>
              </div>
            ) : (
              heldOrders.map((held) => (
                <div
                  key={held.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/70"
                >
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-900 block">
                      {held.id}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      {held.items.length} items • Parked at {held.time}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleResumeOrder(held)}
                    className="h-8 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold"
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Resume
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ───────────────── FULL SUPERMARKET RECEIPT MODAL ───────────────── */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-sm bg-white p-6">
          {activeReceipt && (
            <div className="space-y-4 text-xs font-mono">
              <div className="text-center space-y-1">
                <h3 className="font-black text-sm tracking-tight uppercase text-slate-900">
                  STOCKFLOW SUPERMARKET
                </h3>
                <p className="text-[10px] text-slate-500">{storeName}</p>
                <p className="text-[10px] text-slate-400">Tax Invoice & Customer Receipt</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Txn No:</span>
                  <span className="font-bold">{activeReceipt.transactionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{activeReceipt.time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{activeReceipt.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="uppercase font-bold">{activeReceipt.paymentMethod}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1 text-[11px] max-h-48 overflow-y-auto">
                {activeReceipt.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="truncate flex-1 pr-2">
                      {item.name} x{item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${activeReceipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax (8%):</span>
                  <span>${activeReceipt.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span>${activeReceipt.totalAmount.toFixed(2)}</span>
                </div>
                {activeReceipt.cashTendered && activeReceipt.paymentMethod === "cash" && (
                  <>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Tendered:</span>
                      <span>${activeReceipt.cashTendered.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-emerald-800">
                      <span>Change:</span>
                      <span>${(activeReceipt.changeDue || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-2">
                <p>Thank you for shopping at StockFlow!</p>
                <p>Retain receipt for returns and exchanges.</p>
              </div>

              <div className="flex gap-2 pt-2 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 text-xs"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="flex-1 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs flex items-center justify-center gap-1.5 font-bold"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cash Drawer Modal */}
      <CashDrawerModal
        isOpen={showCashDrawer}
        onClose={() => setShowCashDrawer(false)}
        userId={userId}
      />

      {/* Split Payment Modal */}
      <SplitPaymentModal
        isOpen={showSplitPayment}
        onClose={() => setShowSplitPayment(false)}
        totalAmount={totalAmount}
        onProcessPayment={async () => {
          await executePayment()
          setShowSplitPayment(false)
        }}
      />
    </div>
  )
}
