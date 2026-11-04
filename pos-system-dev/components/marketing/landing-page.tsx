"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Boxes,
  ArrowRight,
  ShieldCheck,
  Layers,
  ArrowLeftRight,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  TrendingUp,
  Package,
  Store,
  Clock,
  ChevronRight,
  Database,
  Lock,
  ArrowUpRight,
  BarChart3,
  Search,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function LandingPage() {
  const [selectedBranch, setSelectedBranch] = useState("Downtown Central Hub")
  const [activeTab, setActiveTab] = useState<"all" | "low">("all")

  const previewProducts = [
    {
      sku: "SKU-GROC-001",
      name: "Golden Grain Basmati Rice (5kg)",
      category: "Grains & Rice",
      branch: "Downtown Central Hub",
      stock: 140,
      reorder: 30,
      status: "IN_STOCK",
      percentage: 85,
    },
    {
      sku: "SKU-BEV-001",
      name: "Cold-Pressed Valencia Orange Juice (1L)",
      category: "Beverages",
      branch: "Westside Mall Branch",
      stock: 22,
      reorder: 35,
      status: "LOW_STOCK",
      percentage: 28,
    },
    {
      sku: "SKU-DAIR-001",
      name: "Farm Fresh Pasteurized Whole Milk (1 Gal)",
      category: "Dairy & Eggs",
      branch: "Airport Plaza Branch",
      stock: 6,
      reorder: 25,
      status: "CRITICAL",
      percentage: 12,
    },
    {
      sku: "SKU-BAKE-001",
      name: "Artisanal Sourdough Sandwich Loaf",
      category: "Bakery",
      branch: "Downtown Central Hub",
      stock: 75,
      reorder: 20,
      status: "IN_STOCK",
      percentage: 78,
    },
    {
      sku: "SKU-PROD-001",
      name: "Crisp Washington Gala Apples (1kg bag)",
      category: "Fresh Produce",
      branch: "Westside Mall Branch",
      stock: 94,
      reorder: 25,
      status: "IN_STOCK",
      percentage: 90,
    },
  ]

  const filteredProducts = previewProducts.filter((p) => {
    if (activeTab === "low") return p.status === "LOW_STOCK" || p.status === "CRITICAL"
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* ───────────────── SECTION 1: NAVIGATION ───────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Product Name */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#14532D] text-white flex items-center justify-center shadow-sm">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-[#0F172A]">StockFlow</span>
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                  Enterprise
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#system" className="hover:text-emerald-700 transition-colors">
              System
            </a>
            <a href="#features" className="hover:text-emerald-700 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-emerald-700 transition-colors">
              How It Works
            </a>
            <a href="#benefits" className="hover:text-emerald-700 transition-colors">
              Why StockFlow
            </a>
            <a href="#demo-accounts" className="hover:text-emerald-700 transition-colors">
              Demo Access
            </a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="bg-[#14532D] hover:bg-[#0f3e22] text-white shadow-sm font-medium text-sm px-4 py-2 h-9 rounded-md transition-all"
            >
              <Link href="/login" className="flex items-center gap-1.5">
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ───────────────── SECTION 2: HERO SECTION ───────────────── */}
      <section id="system" className="relative pt-16 pb-20 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-50/50 via-slate-50 to-transparent pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6 mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              MULTI-BRANCH INVENTORY MANAGEMENT
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.12]">
              Take Control of Your Inventory.{" "}
              <span className="text-[#14532D] block sm:inline">Across Every Branch.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
              A centralized inventory management system that helps supermarkets monitor stock,
              manage branch operations, track stock movements, and make better inventory decisions.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-[#14532D] hover:bg-[#0f3e22] text-white shadow-sm font-semibold h-11 px-6 text-sm rounded-md"
              >
                <Link href="/login" className="flex items-center justify-center gap-2">
                  <span>Access Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold h-11 px-6 text-sm rounded-md"
              >
                <a href="#features">Explore Features</a>
              </Button>
            </div>

            {/* Architecture Highlights Pill Row */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Rule-Based Automation
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Zero Negative Stock
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Neon PostgreSQL Hub
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                4-Tier Role Authorization
              </span>
            </div>
          </div>

          {/* ───────────────── DASHBOARD PREVIEW UI ───────────────── */}
          <div className="relative mx-auto max-w-5xl rounded-xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Window bar */}
            <div className="bg-slate-900 text-slate-300 px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-medium text-slate-400 font-mono">
                  stockflow.retail.internal / admin / inventory
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
                <span className="text-slate-500 hidden sm:inline">Central Hub (BRN-001)</span>
              </div>
            </div>

            {/* Dashboard Inner Container */}
            <div className="p-4 sm:p-6 space-y-6 bg-slate-50/50">
              {/* Header inside preview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Apex Supermarket Inventory Overview
                  </h2>
                  <p className="text-xs text-slate-500">
                    Consolidated multi-branch stock levels and movement audit ledger
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="text-xs font-medium bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="All Branches">All Branches (3 Locations)</option>
                    <option value="Downtown Central Hub">Downtown Central Hub (BRN-001)</option>
                    <option value="Westside Mall Branch">Westside Mall (BRN-002)</option>
                    <option value="Airport Plaza Branch">Airport Plaza (BRN-003)</option>
                  </select>
                </div>
              </div>

              {/* 4 Metric KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Total Valuation</span>
                    <BarChart3 className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">$148,920</div>
                  <div className="mt-1 flex items-center text-[11px] text-emerald-700 font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" /> +4.2% healthy turnover
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Active Branches</span>
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">3 Locations</div>
                  <div className="mt-1 text-[11px] text-slate-500">Downtown, Westside, Airport</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Pending Transfers</span>
                    <ArrowLeftRight className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">1 In-Transit</div>
                  <div className="mt-1 text-[11px] text-purple-700 font-medium">TR-20261104-0001</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Reorder Alerts</span>
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-bold text-slate-900">2 Items</div>
                  <div className="mt-1 text-[11px] text-amber-700 font-medium">Below branch minimum</div>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                        activeTab === "all"
                          ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All SKU Balances
                    </button>
                    <button
                      onClick={() => setActiveTab("low")}
                      className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                        activeTab === "low"
                          ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Low Stock Alerts (2)
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 hidden sm:inline">Showing 5 of 24 SKUs</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">SKU / Code</th>
                        <th className="py-2.5 px-4">Product Name</th>
                        <th className="py-2.5 px-4 hidden sm:table-cell">Category</th>
                        <th className="py-2.5 px-4">Available Qty</th>
                        <th className="py-2.5 px-4 hidden md:table-cell">Reorder Level</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => (
                        <tr key={p.sku} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-700">
                            {p.sku}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {p.name}
                            <span className="block text-[11px] text-slate-400 font-normal sm:hidden">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 hidden sm:table-cell">
                            {p.category}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{p.stock} units</span>
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 hidden lg:block overflow-hidden">
                                <div
                                  className={`h-full ${
                                    p.status === "CRITICAL"
                                      ? "bg-rose-500"
                                      : p.status === "LOW_STOCK"
                                      ? "bg-amber-500"
                                      : "bg-emerald-600"
                                  }`}
                                  style={{ width: `${Math.min(100, p.percentage)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                            {p.reorder} units
                          </td>
                          <td className="py-3 px-4">
                            {p.status === "IN_STOCK" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                In Stock
                              </span>
                            )}
                            {p.status === "LOW_STOCK" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Low Stock
                              </span>
                            )}
                            {p.status === "CRITICAL" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                                Critical Alert
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>Hub Database: Neon PostgreSQL (Serverless)</span>
                  <Link
                    href="/login"
                    className="font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                  >
                    View full ledger in system <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── SECTION 3: KEY CAPABILITIES ───────────────── */}
      <section id="features" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <h2 className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
              Core Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
              Engineered for Multi-Branch Supermarket Operations
            </p>
            <p className="text-base sm:text-lg text-slate-600">
              Predefined business rules and transactional database operations handle stock-in,
              stock-out, and transfers without reliance on black-box AI models.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-[#F8FAFC] p-6 rounded-lg border border-slate-200 hover:border-emerald-600/50 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mb-4 group-hover:bg-[#14532D] group-hover:text-white transition-colors">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Centralized Stock Tracking</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Single source of truth across all supermarket branches. Real-time balance queries
                prevent phantom inventory and stock discrepancies.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#F8FAFC] p-6 rounded-lg border border-slate-200 hover:border-emerald-600/50 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mb-4 group-hover:bg-[#14532D] group-hover:text-white transition-colors">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Multi-Branch Management</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Hierarchical role authorization. Head office admins see every location, while branch
                managers and clerks operate safely within their assigned facility.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#F8FAFC] p-6 rounded-lg border border-slate-200 hover:border-emerald-600/50 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mb-4 group-hover:bg-[#14532D] group-hover:text-white transition-colors">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Stock-In & Stock-Out Automation
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Transactional row locking (<code className="text-xs bg-slate-200 px-1 py-0.5 rounded font-mono">FOR UPDATE</code>)
                guarantees stock calculations are atomic and strictly enforces zero negative stock balance.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#F8FAFC] p-6 rounded-lg border border-slate-200 hover:border-emerald-600/50 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mb-4 group-hover:bg-[#14532D] group-hover:text-white transition-colors">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Stock Transfer Management</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                4-state custody workflow: Request → Manager Approval → In-Transit → Receive. Includes
                discrepancy reconciliation for lost or damaged in-transit goods.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#F8FAFC] p-6 rounded-lg border border-slate-200 hover:border-emerald-600/50 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mb-4 group-hover:bg-[#14532D] group-hover:text-white transition-colors">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Low-Stock & Reorder Alerts</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Dynamic threshold monitoring triggers automatic alerts the moment stock reaches the
                branch reorder point, preventing costly stockouts before peak shopping hours.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#F8FAFC] p-6 rounded-lg border border-slate-200 hover:border-emerald-600/50 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mb-4 group-hover:bg-[#14532D] group-hover:text-white transition-colors">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Inventory Audit Reports</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Detailed transaction histories, stock movement ledgers, valuation summaries, and CSV
                data exports for executive review and administrative accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── SECTION 4: HOW IT WORKS ───────────────── */}
      <section id="how-it-works" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
            <h2 className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
              System Architecture
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
              How the Automated System Operates
            </p>
            <p className="text-base sm:text-lg text-slate-600">
              A robust hub-and-spoke model connecting multiple branch client terminals to a single
              central PostgreSQL database.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-lg border border-slate-200 relative shadow-xs">
              <div className="text-4xl font-black text-slate-200 font-mono mb-4">01</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Centralized Management</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                All branch terminals communicate with one central cloud database over secure HTTPS.
                Eliminates detached desktop spreadsheets and fragmented inventory siloes.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Database className="h-4 w-4 text-emerald-700" />
                PostgreSQL + Drizzle ORM
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-lg border border-slate-200 relative shadow-xs">
              <div className="text-4xl font-black text-slate-200 font-mono mb-4">02</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Automated Stock Updates</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                When clerks record goods received or dispatch transfers, the system executes atomic
                database transactions, updating balances and writing immutable movement logs.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Lock className="h-4 w-4 text-emerald-700" />
                ACID Transactions & Row Locking
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-lg border border-slate-200 relative shadow-xs">
              <div className="text-4xl font-black text-slate-200 font-mono mb-4">03</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Reports and Visibility</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Corporate administrators and branch managers instantly review low-stock dashboards,
                evaluate transfer discrepancies, and download verified inventory reports.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <BarChart3 className="h-4 w-4 text-emerald-700" />
                Real-Time Ledger & Valuation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── SECTION 5: WHY THE SYSTEM MATTERS ───────────────── */}
      <section id="benefits" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase">
                Problem Statement & Solution
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A]">
                Solving the Inventory Crisis in Multi-Branch Retail
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Traditional retail chains suffer from fragmented record-keeping, slow inter-branch
                transfers, and undetected shrinkage. StockFlow replaces manual friction with rule-based
                automation.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Reduces errors associated with manual stock records
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Barcode-ready SKU lookups and automated math eliminate double-entry mistakes and calculation slip-ups.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Improves visibility of inventory across branches
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Managers check nearby store stock in seconds before placing new supplier orders, saving capital.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Helps identify low-stock products in real-time
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Reorder thresholds proactively notify management before supermarket shelves empty out.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Improves coordination and accountability for transfers
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sender, transit, and receiver quantities are cross-referenced with mandatory discrepancy logging.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Box */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3">
                System Comparison
              </h3>

              <div className="space-y-4">
                <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-lg">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                    Manual Spreadsheets & Paper
                  </span>
                  <ul className="mt-1 text-xs text-rose-950 space-y-1 list-disc list-inside">
                    <li>Discrepancies discovered weeks late during audits</li>
                    <li>No inter-branch visibility without phone calls</li>
                    <li>Vulnerable to accidental cell overrides and omissions</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    StockFlow Automated Control
                  </span>
                  <ul className="mt-1 text-xs text-emerald-950 space-y-1 list-disc list-inside">
                    <li>Instant live inventory ledger per branch location</li>
                    <li>Chain-of-custody tracking on all inter-branch stock transfers</li>
                    <li>Guaranteed zero negative balance via DB-level constraints</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <Button asChild className="w-full bg-[#14532D] hover:bg-[#0f3e22] text-white font-semibold">
                  <Link href="/login">Launch System Dashboard →</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── SECTION 6: DEMO CREDENTIALS & CALL TO ACTION ───────────────── */}
      <section id="demo-accounts" className="py-20 bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Manage Every Branch. From One Place.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Simplify inventory operations with centralized stock management, automated movement
              ledgers, and real-time branch visibility.
            </p>
          </div>

          {/* Quick Demo Access Box for Project Evaluators / Assessors */}
          <div className="max-w-3xl mx-auto bg-slate-800/90 border border-slate-700 rounded-xl p-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/80 gap-2">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Academic Project Evaluation Accounts
                </span>
                <p className="text-xs text-slate-400">
                  Default password for all demo accounts:{" "}
                  <code className="bg-slate-900 text-emerald-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                    password123
                  </code>
                </p>
              </div>
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60">
                <div className="text-[11px] font-bold text-amber-400 uppercase">System Admin</div>
                <div className="text-xs font-mono text-slate-200 mt-1 truncate">admin@retail.com</div>
                <div className="text-[10px] text-slate-400 mt-1">All branches, config, users</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60">
                <div className="text-[11px] font-bold text-blue-400 uppercase">Branch Manager</div>
                <div className="text-xs font-mono text-slate-200 mt-1 truncate">manager@retail.com</div>
                <div className="text-[10px] text-slate-400 mt-1">Approvals, reports, branch</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60">
                <div className="text-[11px] font-bold text-emerald-400 uppercase">Inventory Clerk</div>
                <div className="text-xs font-mono text-slate-200 mt-1 truncate">clerk@retail.com</div>
                <div className="text-[10px] text-slate-400 mt-1">Stock-in, stock-out, transfer</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60">
                <div className="text-[11px] font-bold text-purple-400 uppercase">Cashier</div>
                <div className="text-xs font-mono text-slate-200 mt-1 truncate">cashier@retail.com</div>
                <div className="text-[10px] text-slate-400 mt-1">Sales POS & availability</div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              asChild
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-8 text-base shadow-lg shadow-emerald-950/50"
            >
              <Link href="/login" className="flex items-center gap-2">
                <span>Sign in to your account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───────────────── FOOTER ───────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#14532D] text-white flex items-center justify-center font-bold">
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 text-sm">StockFlow</span>
                <span className="text-slate-400 text-xs block">
                  Automated Inventory Control System for Multi-Branch Retail & Supermarket
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-slate-400">
              <a href="#system" className="hover:text-white transition-colors">
                System
              </a>
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                Architecture
              </a>
              <Link href="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400">
            <p>
              Academic Software Project: Development of an Automated Inventory Control System for a Multi-Branch Retail and Supermarket.
            </p>
            <p className="font-mono text-[11px] text-slate-400">
              &copy; 2026 StockFlow · All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
