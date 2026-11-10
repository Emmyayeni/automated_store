"use client"

import React, { useState, useEffect, useMemo } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Building2,
  User,
  Activity,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react"
import { toast } from "sonner"

interface AuditLogItem {
  id: string
  type: string
  action: string
  entity: string
  recordId?: string
  userName: string
  userEmail?: string
  locationName: string
  details?: any
  ipAddress: string
  createdAt: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("ALL")

  // Detail Modal State
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeLog, setActiveLog] = useState<AuditLogItem | null>(null)

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/audit-logs?limit=100")
      if (res.ok) {
        const data = await res.json()
        setLogs(Array.isArray(data) ? data : [])
      } else {
        throw new Error("Failed to load audit logs")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== "ALL" && !log.action.includes(actionFilter)) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchUser = log.userName?.toLowerCase().includes(q)
        const matchAction = log.action?.toLowerCase().includes(q)
        const matchEntity = log.entity?.toLowerCase().includes(q)
        const matchIp = log.ipAddress?.toLowerCase().includes(q)
        const matchLoc = log.locationName?.toLowerCase().includes(q)
        if (!matchUser && !matchAction && !matchEntity && !matchIp && !matchLoc) {
          return false
        }
      }

      return true
    })
  }, [logs, actionFilter, searchQuery])

  // KPIs
  const totalEvents = logs.length
  const createsCount = logs.filter((l) => l.action.includes("CREATE")).length
  const updatesCount = logs.filter((l) => l.action.includes("UPDATE") || l.action.includes("ADJUST")).length
  const inventoryEvents = logs.filter((l) => l.type === "INVENTORY").length

  // CSV Export
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No audit logs to export")
      return
    }

    const headers = ["Timestamp", "Action", "Entity", "User", "Branch", "IP Address", "Record ID"]
    const rows = filteredLogs.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.action,
      l.entity,
      `"${l.userName}"`,
      `"${l.locationName}"`,
      l.ipAddress,
      l.recordId || "N/A",
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Audit trail exported to CSV")
  }

  const openDetails = (log: AuditLogItem) => {
    setActiveLog(log)
    setDetailOpen(true)
  }

  const getActionBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("IN")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200"
    }
    if (action.includes("DELETE") || action.includes("REJECT") || action.includes("VOID")) {
      return "bg-rose-50 text-rose-800 border-rose-200"
    }
    if (action.includes("UPDATE") || action.includes("ADJUST") || action.includes("OUT")) {
      return "bg-amber-50 text-amber-800 border-amber-200"
    }
    return "bg-blue-50 text-blue-800 border-blue-200"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Audit Trail & Security Logs"
        description="Immutable record of security events, administrative adjustments, user role revisions, and operational transactions."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Audit Logs" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditLogs}
              disabled={loading}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Audit Events"
          value={totalEvents}
          description="Logged system operations"
          icon={<ShieldAlert className="h-5 w-5 text-emerald-700" />}
        />
        <StatCard
          title="Entity Creations"
          value={createsCount}
          description="New products, branches & users"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Modifications & Deltas"
          value={updatesCount}
          description="Stock adjustments & updates"
          icon={<Activity className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Inventory Events"
          value={inventoryEvents}
          description="Physical stock activity"
          icon={<Lock className="h-5 w-5 text-blue-600" />}
        />
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Security & Activity Feed</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Showing {filteredLogs.length} verified audit records
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-64 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search actor, action, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {["ALL", "CREATE", "UPDATE", "DELETE", "STOCK"].map((filter) => (
                <Button
                  key={filter}
                  variant={actionFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActionFilter(filter)}
                  className={`h-8 px-2.5 text-[11px] font-semibold transition-all ${
                    actionFilter === filter
                      ? "bg-[#14532D] text-white hover:bg-[#14532D]/90"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {filter === "ALL" ? "All Logs" : filter}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600 mb-2" />
              <span>Loading audit logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center">
              <ShieldCheck className="h-10 w-10 text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700">No audit events match your filter</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {searchQuery || actionFilter !== "ALL"
                  ? "Try resetting your search query or action filter."
                  : "All system activities, administrative adjustments, and logins will be listed here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-200">
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Timestamp</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Action</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Entity</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">User / Actor</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">Branch Location</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3">IP Address</TableHead>
                    <TableHead className="font-semibold text-xs text-slate-700 py-3 text-right">Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                      <TableCell className="text-xs text-slate-600 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                          <span className="text-slate-400 text-[11px]">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <Badge variant="outline" className={`font-mono text-[10px] font-bold ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-slate-900 py-3.5">
                        {log.entity}
                      </TableCell>

                      <TableCell className="text-xs text-slate-800 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium">{log.userName}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 py-3.5">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{log.locationName}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-500 py-3.5">
                        {log.ipAddress}
                      </TableCell>

                      <TableCell className="text-right py-3.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(log)}
                          className="h-7 px-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                        >
                          <FileCode className="h-3 w-3 mr-1 text-emerald-700" />
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* INSPECT LOG PAYLOAD MODAL */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-emerald-700" />
              Audit Event Payload
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Detailed machine trace and field states captured during this operation.
            </DialogDescription>
          </DialogHeader>

          {activeLog && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Event ID</span>
                  <span className="font-mono text-slate-800 truncate block">{activeLog.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Action</span>
                  <span className="font-mono font-bold text-slate-900">{activeLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Entity</span>
                  <span className="font-medium text-slate-800">{activeLog.entity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Operator</span>
                  <span className="font-medium text-slate-800">{activeLog.userName}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">State Data (JSON Payload)</Label>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {JSON.stringify(activeLog.details || { message: "No supplementary payload stored." }, null, 2)}
                </pre>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailOpen(false)}
                  className="text-xs border-slate-200"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
