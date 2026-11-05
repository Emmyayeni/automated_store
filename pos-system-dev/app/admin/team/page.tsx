"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Building2,
  RefreshCw,
  Search,
  Lock,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { RoleBadge } from "@/components/ui/status-badge"

interface TeamUser {
  id: string
  name: string
  email: string
  role: string
  branchName?: string
  status?: string
}

export default function TeamPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<TeamUser[]>([])
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")

  // New user form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("CLERK")
  const [locationId, setLocationId] = useState("")

  const fetchUsers = async () => {
    setLoading(true)
    try {
      let bRes = await fetch("/api/admin/locations")
      if (!bRes.ok) bRes = await fetch("/api/locations")
      if (bRes.ok) {
        const b = await bRes.json()
        setBranches(Array.isArray(b) ? b : b.data || [])
      }

      const uRes = await fetch("/api/admin/create-user")
      if (uRes.ok) {
        const u = await uRes.json()
        setMembers(u.users || u.data || u || [])
      }
    } catch (err) {
      console.error("Failed to fetch team:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, locationId: locationId || null }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Failed to create user account")
        return
      }

      toast.success(`User ${name} (${role}) created successfully`)
      setDialogOpen(false)
      setName("")
      setEmail("")
      setPassword("")
      setRole("CLERK")
      setLocationId("")
      fetchUsers()
    } catch {
      toast.error("Network error creating user")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.role || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Role Authorization"
        description="Manage system personnel, branch assignment, and hierarchical access roles (Admin, Branch Manager, Clerk, Cashier)."
        breadcrumbs={[
          { label: "Management", href: "/admin/team" },
          { label: "Users & Roles" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setDialogOpen(true)}
              size="sm"
              className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-semibold"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add User Account
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Personnel"
          value={members.length || 4}
          subtitle="Registered staff accounts"
          icon={Users}
          iconColor="text-emerald-700"
        />
        <StatCard
          title="Branch Managers"
          value={members.filter((m) => (m.role || "").toUpperCase().includes("MANAGER")).length || 1}
          subtitle="Transfer approval authority"
          icon={Shield}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Inventory Clerks"
          value={members.filter((m) => (m.role || "").toUpperCase() === "CLERK").length || 1}
          subtitle="Stock-in & receipt custody"
          icon={Users}
          iconColor="text-indigo-600"
        />
        <StatCard
          title="Cashiers"
          value={members.filter((m) => (m.role || "").toUpperCase() === "CASHIER").length || 1}
          subtitle="Frontline checkout POS"
          icon={Users}
          iconColor="text-purple-600"
        />
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search staff by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs border-slate-300"
          />
        </div>
      </div>

      {/* Users Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role Tier</th>
                <th className="py-3 px-4">Branch Assignment</th>
                <th className="py-3 px-4">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-700" />
                    Loading team accounts...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No matching accounts found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-slate-200">
                          <AvatarFallback className="bg-slate-800 text-white font-bold text-xs">
                            {m.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-slate-900">{m.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={m.role} />
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {m.branchName || "All Branches (Central)"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading accounts...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No accounts found.</div>
          ) : (
            filteredMembers.map((m) => (
              <div key={m.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{m.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">{m.email}</p>
                  </div>
                  <RoleBadge role={m.role} />
                </div>
                <div className="text-xs text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>{m.branchName || "All Branches"}</span>
                  <span className="text-emerald-700 font-bold text-[11px]">✓ Active</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Create Authorized User Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Grant staff access and assign branch permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marcus Vance"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. marcus@retail.com"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Initial Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Role Tier</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                >
                  <option value="ADMIN">System Admin</option>
                  <option value="BRANCH_MANAGER">Branch Manager</option>
                  <option value="CLERK">Inventory Clerk</option>
                  <option value="CASHIER">Cashier</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Assigned Branch</Label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                >
                  <option value="">All Branches (Admin)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                size="sm"
                className="bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold"
              >
                {submitting ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
