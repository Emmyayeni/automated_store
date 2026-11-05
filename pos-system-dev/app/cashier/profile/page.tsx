"use client"

import React, { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  User,
  Shield,
  Store,
  Mail,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Clock
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { RoleBadge } from "@/components/ui/status-badge"
import { toast } from "@/hooks/use-toast"

export default function CashierProfilePage() {
  const { data: session } = useSession()
  const sessionUser = (session as any)?.user
  const cashierName = sessionUser?.name || "Cashier User"
  const cashierEmail = sessionUser?.email || "cashier@retail.com"
  const storeName = sessionUser?.store?.name || sessionUser?.branchName || "Main Supermarket Branch"

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      })

      if (res.ok) {
        toast({
          title: "Password Updated",
          description: "Your terminal security password has been changed.",
        })
        setOldPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        const err = await res.json().catch(() => null)
        toast({
          title: "Update Failed",
          description: err?.error || "Unable to update password.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Network Error",
        description: "Unable to reach authentication server.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ───────────────── PAGE HEADER ───────────────── */}
      <PageHeader
        title="Cashier Profile & Terminal Security"
        description="View your active staff credentials, branch assignment, and update login credentials."
        actions={
          <Button asChild size="sm" className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs">
            <Link href="/cashier">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Register
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-4xl">
        {/* User Card */}
        <div className="md:col-span-5 space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-[#14532D]" />
                Staff Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 bg-[#14532D] text-white text-xl font-bold rounded-full mx-auto mb-3 flex items-center justify-center shadow-xs">
                  {cashierName.charAt(0)}
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">{cashierName}</h3>
                <div className="mt-1 flex justify-center">
                  <RoleBadge role="CASHIER" />
                </div>
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{cashierEmail}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">{storeName}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 font-bold">Register Shift Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-7 space-y-4">
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#14532D]" />
                Update Cashier Passcode / Password
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleUpdatePassword} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Current Password</Label>
                  <Input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="h-9 text-xs border-slate-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    className="h-9 text-xs border-slate-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="h-9 text-xs border-slate-300"
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold"
                  >
                    {loading ? "Updating..." : "Save Password Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
