"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Building2,
  Mail,
  Shield,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { RoleBadge } from "@/components/ui/status-badge"
import { toast } from "sonner"

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  locationId?: string
  branchName?: string
  isActive?: boolean
}

export default function BranchStaffPage() {
  const { data: session } = useSession()
  const sessionUser = (session as any)?.user
  const userRole = (sessionUser?.role || "BRANCH_MANAGER").toUpperCase()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
  const [currentBranch, setCurrentBranch] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Add Staff Modal
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("CASHIER")

  const fetchStaffData = async () => {
    setLoading(true)
    try {
      // 1. Fetch locations
      const locRes = await fetch("/api/locations")
      let branchList: Array<{ id: string; name: string }> = []
      if (locRes.ok) {
        const locData = await locRes.json()
        branchList = Array.isArray(locData) ? locData : locData.data || []
        setBranches(branchList)
      }

      // Determine active branch
      const assignedLocId = sessionUser?.locationId
      const targetBranch =
        branchList.find((b) => b.id === assignedLocId) || branchList[0] || null
      setCurrentBranch(targetBranch)

      // 2. Fetch staff members
      const userRes = await fetch("/api/admin/create-user")
      if (userRes.ok) {
        const users = await userRes.json()
        if (Array.isArray(users)) {
          // If branch manager, show staff of their branch or all retail staff
          setStaff(users)
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load staff")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffData()
  }, [])

  // Filter staff by search and branch
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      // Branch filter if manager is assigned
      if (currentBranch && s.locationId && s.locationId !== currentBranch.id && userRole !== "ADMIN") {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = s.name?.toLowerCase().includes(q)
        const matchEmail = s.email?.toLowerCase().includes(q)
        const matchRole = s.role?.toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchRole) return false
      }

      return true
    })
  }, [staff, currentBranch, searchQuery, userRole])

  // KPIs
  const totalStaff = filteredStaff.length
  const cashierCount = filteredStaff.filter((s) => s.role.toUpperCase() === "CASHIER").length
  const clerkCount = filteredStaff.filter((s) => s.role.toUpperCase() === "CLERK").length
  const activeCount = filteredStaff.filter((s) => s.isActive !== false).length

  // Add Staff Handler
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      toast.error("All fields are required")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          locationId: currentBranch?.id || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create staff member")
      }

      toast.success(`Staff member "${name}" added to ${currentBranch?.name || "branch"}`)
      setDialogOpen(false)
      setName("")
      setEmail("")
      setPassword("")
      setRole("CASHIER")
      fetchStaffData()
    } catch (err: any) {
      toast.error(err.message || "Failed to add staff member")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${currentBranch ? currentBranch.name : "Branch"} — Staff & Roster`}
        description="Branch staff members, assigned roles, register cashiers, and inventory clerks."
        breadcrumbs={[
          { label: "Branch", href: "/manager" },
          { label: "Staff & Team" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStaffData}
              disabled={loading}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Staff Member
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Branch Staff"
          value={totalStaff}
          description="Total active team members"
          icon={<Users className="h-5 w-5 text-emerald-700" />}
        />
        <StatCard
          title="Cashiers"
          value={cashierCount}
          description="Assigned to POS registers"
          icon={<UserCheck className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Inventory Clerks"
          value={clerkCount}
          description="Receiving & stock-out"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Active Accounts"
          value={activeCount}
          description="Verified staff credentials"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      {/* Table Card */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Branch Personnel Directory</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Manage accounts authorized for register checkout and inventory physical counts at this branch.
            </CardDescription>
          </div>
          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search staff name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mb-2" />
              <span>Loading staff directory...</span>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <Users className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">No staff members found</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {searchQuery
                  ? `No staff members matching "${searchQuery}".`
                  : "Add your first cashier or inventory clerk to start operations."}
              </p>
              {!searchQuery && (
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="mt-4 bg-[#14532D] text-white text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Staff Member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Staff Member</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Assigned Role</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Supermarket Branch</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-slate-200">
                            <AvatarFallback className="bg-[#14532D] text-white text-xs font-bold">
                              {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block leading-tight">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <RoleBadge role={member.role} />
                      </TableCell>

                      <TableCell className="text-xs text-slate-700 py-3.5">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{member.branchName || currentBranch?.name || "Main Supermarket Hub"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center py-3.5">
                        <Badge
                          variant="secondary"
                          className={
                            member.isActive !== false
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }
                        >
                          {member.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD STAFF MODAL */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-700" />
              Add Branch Staff Member
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a login account for a Cashier or Inventory Clerk at {currentBranch?.name || "this branch"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStaff} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Full Name *</Label>
              <Input
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Email Address *</Label>
              <Input
                type="email"
                placeholder="staff@supermarket.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-xs border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Temporary Password *</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-xs border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Operational Role *</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-200 text-xs text-slate-800 bg-white"
              >
                <option value="CASHIER">CASHIER — Operates POS register terminal</option>
                <option value="CLERK">CLERK — Records stock receiving & dispatch</option>
                <option value="BRANCH_MANAGER">BRANCH MANAGER — Approves transfers & reports</option>
              </select>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Assigned Branch: <strong>{currentBranch?.name || "Downtown Central Hub"}</strong></span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#14532D] hover:bg-[#14532D]/90 text-white text-xs font-medium"
              >
                {submitting ? "Creating..." : "Save Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
