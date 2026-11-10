"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Boxes,
  LayoutDashboard,
  Store,
  Users,
  Package,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Shield,
  CreditCard,
  Building2,
  FileSpreadsheet,
  Tags,
  History,
  ShieldAlert
} from "lucide-react"
import { RoleBadge } from "@/components/ui/status-badge"

interface AdminLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  group: "overview" | "inventory" | "operations" | "management"
  roles?: string[] // if undefined, visible to all authorized roles
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const sessionData = (session as any)?.data || session
  const user = {
    name: sessionData?.user?.name || "Administrator",
    email: sessionData?.user?.email || "admin@retail.com",
    role: (sessionData?.user?.role || "ADMIN").toUpperCase(),
    businessId: sessionData?.user?.businessId || null,
    branchName: sessionData?.user?.store?.name || sessionData?.user?.branchName || "Downtown Central Hub",
  }

  // Organized navigation groups
  const navigation: NavItem[] = [
    // OVERVIEW
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      group: "overview",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER"],
    },
    // INVENTORY
    {
      name: "Products",
      href: "/admin/products",
      icon: Package,
      group: "inventory",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER"],
    },
    {
      name: "Categories",
      href: "/admin/categories",
      icon: Tags,
      group: "inventory",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER"],
    },
    {
      name: "Stock Balances",
      href: "/admin/inventory",
      icon: Layers,
      group: "inventory",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER", "CLERK"],
    },
    {
      name: "Stock-In (Receive)",
      href: "/admin/stock-in",
      icon: ArrowDownToLine,
      group: "inventory",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER", "CLERK"],
    },
    {
      name: "Stock-Out (Deduct)",
      href: "/admin/stock-out",
      icon: ArrowUpFromLine,
      group: "inventory",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER", "CLERK"],
    },
    {
      name: "Stock Movements",
      href: "/admin/stock-movements",
      icon: History,
      group: "inventory",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER", "CLERK"],
    },
    // OPERATIONS
    {
      name: "Branches & Stores",
      href: "/admin/stores",
      icon: Building2,
      group: "operations",
      roles: ["ADMIN"],
    },
    {
      name: "Stock Transfers",
      href: "/admin/transfers",
      icon: ArrowLeftRight,
      group: "operations",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER", "CLERK"],
    },
    {
      name: "Low Stock Alerts",
      href: "/admin/low-stock",
      icon: AlertTriangle,
      group: "operations",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER", "CLERK"],
    },
    {
      name: "Cashier POS Terminal",
      href: "/pos",
      icon: CreditCard,
      group: "operations",
      roles: ["ADMIN", "CASHIER"],
    },
    // MANAGEMENT
    {
      name: "Reports & Valuation",
      href: "/admin/reports",
      icon: BarChart3,
      group: "management",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER"],
    },
    {
      name: "Users & Staff",
      href: "/admin/team",
      icon: Users,
      group: "management",
      roles: ["ADMIN", "BRANCH_MANAGER", "MANAGER"],
    },
    {
      name: "Audit Logs",
      href: "/admin/audit-logs",
      icon: ShieldAlert,
      group: "management",
      roles: ["ADMIN"],
    },
    {
      name: "System Settings",
      href: "/admin/settings",
      icon: Settings,
      group: "management",
      roles: ["ADMIN"],
    },
  ]

  // Filter navigation by current user's role
  const isAuthorized = (item: NavItem) => {
    if (!item.roles) return true
    return item.roles.includes(user.role)
  }

  // Close sidebar drawer when route changes
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const renderNavGroup = (title: string, groupKey: NavItem["group"]) => {
    const items = navigation.filter((item) => item.group === groupKey && isAuthorized(item))
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
              item.href === "/admin"
                ? pathname === "/admin"
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
                <span className="truncate">{item.name}</span>
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
              <Boxes className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                StockFlow
              </span>
              <span className="text-[10px] text-slate-500 font-medium block leading-tight">
                Automated Inventory System
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-500">
            <Store className="h-3.5 w-3.5 text-emerald-700" />
            <span>Branch Context:</span>
            <span className="font-semibold text-slate-800">
              {user.role === "ADMIN" ? "All Supermarket Branches (Central Hub)" : user.branchName}
            </span>
          </div>
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
            <RoleBadge role={user.role} />
          </div>

          <Avatar className="h-8 w-8 border border-slate-200">
            <AvatarFallback className="bg-[#14532D] text-white text-xs font-bold">
              {user.name.charAt(0)}
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

        {/* Persistent / Responsive Sidebar Drawer (Stationary, independent scroll) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0 h-full lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          {/* Mobile drawer header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-[#14532D] text-white flex items-center justify-center font-bold">
                <Boxes className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-sm text-slate-900">StockFlow Menu</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Nav Links Scroll Area */}
          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
            {renderNavGroup("Overview", "overview")}
            {renderNavGroup("Inventory Control", "inventory")}
            {renderNavGroup("Store Operations", "operations")}
            {renderNavGroup("System Management", "management")}
          </nav>

          {/* User Profile Card at Bottom */}
          <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 border border-slate-200">
                <AvatarFallback className="bg-slate-800 text-white text-xs font-semibold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
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
