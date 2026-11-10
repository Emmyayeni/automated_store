"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import {
  Boxes,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Building2,
  Layers,
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  Package,
  CreditCard,
  UserCheck,
  TrendingUp,
  Server
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const router = useRouter()

  const handleRoleSelect = (roleEmail: string, roleName: string) => {
    setEmail(roleEmail)
    setPassword("password123")
    setSelectedRole(roleName)
    toast.info(`Selected ${roleName} credentials`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (res?.ok) {
        toast.success("Welcome back! Redirecting to assigned portal...")
        router.push("/")
      } else {
        toast.error(res?.error || "Invalid credentials. Please verify email and password.")
      }
    } catch {
      toast.error("Network error. Unable to communicate with authentication server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0F172A] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#14532D]/30 blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/10 blur-[180px] pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* ───────────────── LEFT PANEL: ENTERPRISE SHOWCASE ───────────────── */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#062414] via-[#0E3D22] to-[#14532D] text-white p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle geometric pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            {/* Academic badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>B.Sc. Computer Science • NSUK 2026</span>
            </div>

            {/* Brand Logo & Title */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-900/40">
                  <Boxes className="h-5 w-5 text-emerald-950" />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">StockFlow</span>
              </div>
              <p className="text-emerald-100/90 text-sm font-normal leading-relaxed">
                Automated Inventory Control System for Multi-Branch Retail & Supermarket Networks.
              </p>
            </div>

            {/* Value Pillars List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <Building2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">3 Active Supermarket Hubs</h4>
                  <p className="text-[11px] text-emerald-200/70">Downtown Central, Westside Mall, Airport Plaza.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <ArrowLeftRight className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">4-Stage Transfer Custody</h4>
                  <p className="text-[11px] text-emerald-200/70">Requested $\rightarrow$ Approved $\rightarrow$ Dispatched $\rightarrow$ Received.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Zero-Negative Stock Guard</h4>
                  <p className="text-[11px] text-emerald-200/70">Atomic ACID transactions enforce balance consistency.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Candidate & System Status */}
          <div className="pt-8 border-t border-white/10 mt-6 relative z-10 text-xs text-emerald-200/80 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Owobi Ochechema Saviour</p>
              <p className="text-[10px] text-emerald-300/70">Matric: FT22CMP0003</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live v1.0</span>
            </div>
          </div>
        </div>

        {/* ───────────────── RIGHT PANEL: LOGIN & ONE-CLICK ROLES ───────────────── */}
        <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Sign In to Workstation</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select a role below or enter authorized employee credentials.</p>
              </div>
              <Badge variant="outline" className="border-emerald-200 text-emerald-800 bg-emerald-50 text-[10px] font-semibold hidden sm:flex items-center gap-1">
                <Server className="h-3 w-3" />
                PostgreSQL Connected
              </Badge>
            </div>

            {/* 1-Click Role Selection Pills */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Quick Role Auto-Fill (Demo):
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Password: password123</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("admin@retail.com", "Admin")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedRole === "Admin"
                      ? "border-[#14532D] bg-emerald-50 ring-2 ring-emerald-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <span>👑</span>
                    <span>Admin</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Executive All</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("manager@retail.com", "Manager")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedRole === "Manager"
                      ? "border-[#14532D] bg-emerald-50 ring-2 ring-emerald-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <span>🏢</span>
                    <span>Manager</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Downtown Hub</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("clerk@retail.com", "Clerk")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedRole === "Clerk"
                      ? "border-[#14532D] bg-emerald-50 ring-2 ring-emerald-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <span>📦</span>
                    <span>Clerk</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Stock Receipts</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("cashier@retail.com", "Cashier")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedRole === "Cashier"
                      ? "border-[#14532D] bg-emerald-50 ring-2 ring-emerald-600/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <span>💳</span>
                    <span>Cashier</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Front Register</p>
                </button>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Employee Email Address
                </Label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@supermarket.com"
                    className="h-10 pl-9 text-xs border-slate-200 focus-visible:ring-[#14532D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Security Password
                  </Label>
                  <span className="text-[11px] text-emerald-700 font-medium hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="h-10 pl-9 pr-9 text-xs border-slate-200 focus-visible:ring-[#14532D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-[#14532D] hover:bg-[#0f3e22] text-white font-semibold text-xs shadow-md shadow-emerald-950/20 transition-all mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Authenticating Credentials...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </Button>
            </form>
          </div>

          {/* Footer links */}
          <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between text-[11px] text-slate-400">
            <Link href="/" className="hover:text-emerald-700 transition-colors flex items-center gap-1 font-medium text-slate-600">
              ← Return to Public Showcase
            </Link>
            <span>Central Node: keffi-main-hub</span>
          </div>
        </div>

      </div>
    </div>
  )
}
