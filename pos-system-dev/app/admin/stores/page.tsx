"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Users
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface Store {
  id: string
  name: string
  address?: string
  phone?: string
  branchCode?: string
  status?: string
}

export default function StoresPage() {
  const { data: session } = useSession()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")

  const fetchStores = async () => {
    setLoading(true)
    try {
      let res = await fetch("/api/admin/locations")
      if (!res.ok) {
        res = await fetch("/api/locations")
      }
      if (res.ok) {
        const json = await res.json()
        setStores(json.data || json || [])
      }
    } catch (err) {
      console.error("Failed to fetch stores:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Branch name is required")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone }),
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Failed to create branch")
        return
      }

      toast.success(`Branch "${name}" added to supermarket network`)
      setDialogOpen(false)
      setName("")
      setAddress("")
      setPhone("")
      fetchStores()
    } catch {
      toast.error("Network error creating branch")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supermarket Branch Network"
        description="Multi-branch physical locations, terminal configuration, and local inventory hubs."
        breadcrumbs={[
          { label: "Operations", href: "/admin/stores" },
          { label: "Branches & Stores" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStores}
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
              <Plus className="h-4 w-4 mr-1.5" />
              Register Branch
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Active Supermarket Branches"
          value={stores.length || 3}
          subtitle="Operating retail facilities"
          icon={Building2}
          iconColor="text-emerald-700"
        />
        <StatCard
          title="Central Distribution Hub"
          value="Downtown Central"
          subtitle="Primary fulfillment facility (BRN-001)"
          icon={MapPin}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Inter-Branch Routing"
          value="Enabled"
          subtitle="Automated transfers active"
          icon={Layers}
          iconColor="text-purple-600"
        />
      </div>

      {/* Branch Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-700" />
            Loading supermarket branches...
          </div>
        ) : stores.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No branches found in network.
          </div>
        ) : (
          stores.map((s, idx) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      BRN-00{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{s.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Online
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{s.address || "Central Commercial District"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{s.phone || "+1 (555) 234-5678"}</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs font-semibold text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                >
                  <Link href={`/admin/inventory?locationId=${s.id}`}>
                    <Layers className="h-3.5 w-3.5 mr-1.5" />
                    View Branch Stock →
                  </Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Register Branch Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Register Supermarket Branch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a new branch location to the central inventory database.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Branch Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Uptown Metro Branch"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Physical Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 742 Evergreen Terrace, Sector 4"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Contact Telephone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 019-2831"
                className="h-9 text-xs"
              />
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
                {submitting ? "Registering..." : "Register Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
