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
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (res?.ok) {
        toast.success("Welcome back! Redirecting to workstation...")
        router.push("/")
      } else {
        toast.error(res?.error || "Invalid email or password. Please verify your credentials.")
      }
    } catch {
      toast.error("Network error. Unable to communicate with authentication server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 relative antialiased">
      {/* Subtle modern background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Centered Authentication Card */}
      <div className="w-full max-w-[420px] relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-[#14532D] text-white shadow-lg shadow-emerald-950/20 mb-4 transition-transform hover:scale-105 duration-200">
            <Boxes className="h-6 w-6 text-emerald-200" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            StockFlow
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            Multi-Branch Supermarket Automated Inventory Control
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your employee credentials to access your terminal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@retail.com"
                  className="h-10 pl-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white focus-visible:ring-2 focus-visible:ring-[#14532D] focus-visible:border-transparent transition-all rounded-lg"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => toast.info("Please contact your store administrator to reset your password.")}
                  className="text-[11px] font-medium text-emerald-800 hover:text-emerald-950 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="h-10 pl-9 pr-10 text-xs border-slate-200 bg-slate-50/50 focus:bg-white focus-visible:ring-2 focus-visible:ring-[#14532D] focus-visible:border-transparent transition-all rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-hidden transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-[#14532D] focus:ring-[#14532D] cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-slate-600 font-medium cursor-pointer select-none">
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#14532D] hover:bg-[#0f3e22] text-white font-semibold text-xs shadow-md shadow-emerald-950/20 transition-all rounded-lg mt-2 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </Button>
          </form>

          {/* Security Assurance Badge */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>256-bit Encrypted Session Security</span>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="text-center mt-6 text-[11px] text-slate-400">
          <p>© 2026 StockFlow Supermarket System • All Rights Reserved</p>
        </div>

      </div>
    </div>
  )
}
