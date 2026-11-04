"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    console.log("=== Login Debug ===");
    console.log("Attempting login with:", email);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    console.log("SignIn result:", res);

    if (res?.ok) {
      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      })
      console.log("Login successful, redirecting to root page for role-based routing");
      // Redirect to root page which will handle role-based routing
      router.push("/")
    } else {
      console.log("Login failed:", res?.error);
      toast({
        title: "Login Failed",
        description: res?.error || "Invalid credentials",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <Card className="w-full max-w-md shadow-lg border border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              Academic Software Demonstration
            </span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            StockFlow
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Automated Inventory Control System for Multi-Branch Supermarket
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="e.g. admin@retail.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="password123"
              />
            </div>
            <Button type="submit" className="w-full bg-[#14532D] hover:bg-[#0f3e22] text-white font-medium" disabled={loading}>
              {loading ? "Signing in..." : "Sign In to System"}
            </Button>
          </form>

          {/* Quick Demo Credentials Panel for Project Defense / Examiners */}
          <div className="rounded-lg border bg-slate-50 p-3 text-xs space-y-2">
            <p className="font-semibold text-slate-800">Demo Role Credentials (Password: <code className="font-mono bg-white px-1 rounded border">password123</code>):</p>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => { setEmail('admin@retail.com'); setPassword('password123'); }}
                className="text-left px-2 py-1 rounded bg-white hover:bg-blue-50 border text-blue-700 font-medium transition-colors"
              >
                👑 Admin<br/><span className="text-muted-foreground text-[10px]">admin@retail.com</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('manager@retail.com'); setPassword('password123'); }}
                className="text-left px-2 py-1 rounded bg-white hover:bg-green-50 border text-green-700 font-medium transition-colors"
              >
                🏢 Manager<br/><span className="text-muted-foreground text-[10px]">manager@retail.com</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('clerk@retail.com'); setPassword('password123'); }}
                className="text-left px-2 py-1 rounded bg-white hover:bg-amber-50 border text-amber-700 font-medium transition-colors"
              >
                📦 Clerk<br/><span className="text-muted-foreground text-[10px]">clerk@retail.com</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('cashier@retail.com'); setPassword('password123'); }}
                className="text-left px-2 py-1 rounded bg-white hover:bg-purple-50 border text-purple-700 font-medium transition-colors"
              >
                💳 Cashier<br/><span className="text-muted-foreground text-[10px]">cashier@retail.com</span>
              </button>
            </div>
          </div>
          
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              Multi-Branch Architecture: Downtown Central, Westside, Airport
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}