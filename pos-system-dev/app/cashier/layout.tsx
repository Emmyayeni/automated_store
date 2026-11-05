"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ShoppingCart,
  CreditCard,
  Receipt,
  Package,
  Clock,
  User,
  LogOut,
  Menu,
  X,
  Store,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react"
import { RoleBadge } from "@/components/ui/status-badge"

interface CashierLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  group: "checkout" | "records" | "register"
  badge?: string
}

export default function CashierLayout({ children }: CashierLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const sessionData = (session as any)?.data || session
  const cashierName = sessionData?.user?.name || "Cashier"
  const cashierEmail = sessionData?.user?.email || "cashier@retail.com"
  const locationId = sessionData?.user?.locationId || null
  const [storeName, setStoreName] = useState(
    sessionData?.user?.store?.name || sessionData?.user?.branchName || "Main Supermarket Branch"
  )
  const [hasActiveShift, setHasActiveShift] = useState(true)

  // Navigation items grouped cleanly
  const navigation: NavItem[] = [
    // CHECKOUT & TERMINAL
    {
      name: "Register & Sales",
      href: "/cashier",
      icon: ShoppingCart,
      group: "checkout",
    },
    {
      name: "Full POS Terminal",
      href: locationId ? `/cashier/pos/${locationId}` : "/pos",
      icon: CreditCard,
      group: "checkout",
    },
    // RECORDS & STOCK
    {
      name: "Shift Orders & Receipts",
      href: "/cashier/orders",
      icon: Receipt,
      group: "records",
    },
    {
      name: "Branch Stock Lookup",
      href: "/cashier/inventory",
      icon: Package,
      group: "records",
    },
    // REGISTER & SHIFT
    {
      name: "Cash Drawer & Shift",
      href: "/cashier/shift",
      icon: Clock,
      group: "register",
    },
    {
      name: "Cashier Profile",
      href: "/cashier/profile",
      icon: User,
      group: "register",
    },
  ]

  // Fetch branch details
  useEffect(() => {
    async function fetchStoreName() {
      if (!locationId) return
      try {
        const res = await fetch(`/api/store/${locationId}`)
        if (res.ok) {
          const data = await res.json()
          const name = data?.data?.name || data?.name
          if (name) setStoreName(name)
        }
      } catch {
        // keep fallback
      }
    }
    fetchStoreName()
  }, [locationId])

  // Close sidebar drawer when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const renderNavGroup = (title: string, groupKey: NavItem["group"]) => {
    const items = navigation.filter((item) => item.group === groupKey)
    if (items.length === 0) return null

    return (
      <div className="mb-6">
        <h3 className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">
          {title}
        </h3>
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === "/cashier"
                ? pathname === "/cashier"
                : pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#14532D] text-white shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-300" : "text-slate-400"}`} />
                <span className="truncate flex-1">{item.name}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col antialiased overflow-hidden">
      {/* ───────────────── TOP HEADER ───────────────── */}
      <header className="shrink-0 z-40 w-full h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Left: Mobile Menu Toggle & Brand / Context */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#14532D] text-white flex items-center justify-center font-bold shadow-xs">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                StockFlow POS
              </span>
              <span className="text-[10px] text-slate-500 font-medium block leading-tight">
                Cashier Sales Terminal
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-500">
            <Store className="h-3.5 w-3.5 text-emerald-700" />
            <span>Branch Terminal:</span>
            <span className="font-semibold text-slate-800">{storeName}</span>
          </div>
        </div>

        {/* Right: Shift Status & User Profile */}
        <div className="flex items-center gap-3">
          {/* Active Shift Indicator Pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>Shift Active</span>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-bold text-slate-900 leading-tight">{cashierName}</span>
            <RoleBadge role="CASHIER" />
          </div>

          <Avatar className="h-8 w-8 border border-slate-200">
            <AvatarFallback className="bg-[#14532D] text-white text-xs font-bold">
              {cashierName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="h-8 px-2.5 text-xs text-slate-600 hover:text-rose-600 hover:border-rose-200 border-slate-200"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* ───────────────── BODY (SIDEBAR + MAIN CONTENT) ───────────────── */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Persistent / Responsive Stationary Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0 h-full lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          {/* Mobile drawer header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-[#14532D] text-white flex items-center justify-center font-bold">
                <ShoppingCart className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-sm text-slate-900">Cashier Menu</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Nav Links Scroll Area */}
          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
            {renderNavGroup("Checkout & Terminal", "checkout")}
            {renderNavGroup("Orders & Stock", "records")}
            {renderNavGroup("Cash & Register", "register")}
          </nav>

          {/* Cashier Status Card at Bottom */}
          <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                Shift Drawer
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                OPEN
              </span>
            </div>
            <div className="flex items-center gap-2.5 pt-1">
              <Avatar className="h-7 w-7 border border-slate-200">
                <AvatarFallback className="bg-slate-800 text-white text-[11px] font-semibold">
                  {cashierName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{cashierName}</p>
                <p className="text-[10px] text-slate-500 truncate">{cashierEmail}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ───────────────── MAIN CONTENT AREA ───────────────── */}
        <main className="flex-1 w-full min-w-0 h-full overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
