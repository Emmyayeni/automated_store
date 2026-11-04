"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Boxes,
  LayoutDashboard,
  Package,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Store
} from "lucide-react"
import { RoleBadge } from "@/components/ui/status-badge"

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const sessionData = (session as any)?.data || session
  const user = {
    name: sessionData?.user?.name || "Branch Manager",
    email: sessionData?.user?.email || "manager@retail.com",
    role: (sessionData?.user?.role || "BRANCH_MANAGER").toUpperCase(),
    branchName: sessionData?.user?.branchName || "Downtown Central Hub",
  }

  const isClerk = user.role === "CLERK"

  const navItems = [
    // Overview (hidden for clerk)
    ...(!isClerk
      ? [{ name: "Branch Dashboard", href: "/manager", icon: LayoutDashboard, group: "Overview" }]
      : []),
    // Inventory
    { name: "Products", href: "/manager/products", icon: Package, group: "Inventory" },
    { name: "Stock Balances", href: "/admin/inventory", icon: Layers, group: "Inventory" },
    { name: "Stock-In (Receive)", href: "/admin/stock-in", icon: ArrowDownToLine, group: "Inventory" },
    { name: "Stock-Out (Deduct)", href: "/admin/stock-out", icon: ArrowUpFromLine, group: "Inventory" },
    // Operations
    { name: "Stock Transfers", href: "/admin/transfers", icon: ArrowLeftRight, group: "Operations" },
    { name: "Low Stock Alerts", href: "/admin/low-stock", icon: AlertTriangle, group: "Operations" },
    // Management (Managers only)
    ...(!isClerk
      ? [
          { name: "Branch Reports", href: "/admin/reports", icon: BarChart3, group: "Management" },
          { name: "Staff & Team", href: "/manager/staff", icon: Users, group: "Management" },
          { name: "Settings", href: "/manager/settings", icon: Settings, group: "Management" },
        ]
      : []),
  ]

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const groups = Array.from(new Set(navItems.map((i) => i.group)))

  return (
    <div className="h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col antialiased overflow-hidden">
      {/* Top Header */}
      <header className="shrink-0 z-40 w-full h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
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
                Branch Management Portal
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200 text-xs text-slate-500">
            <Store className="h-3.5 w-3.5 text-emerald-700" />
            <span>Assigned Branch:</span>
            <span className="font-semibold text-slate-800">{user.branchName}</span>
          </div>
        </div>

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
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 flex flex-col shrink-0 h-full transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
            <span className="font-bold text-sm text-slate-900">Branch Navigation</span>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            {groups.map((grp) => {
              const items = navItems.filter((i) => i.group === grp)
              return (
                <div key={grp}>
                  <h3 className="px-3 text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">
                    {grp}
                  </h3>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
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
            })}
          </nav>

          <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 shrink-0">
            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.branchName}</p>
          </div>
        </aside>

        <main className="flex-1 w-full min-w-0 h-full overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
