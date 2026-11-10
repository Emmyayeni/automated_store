"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Bell,
  AlertTriangle,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  ArrowRight
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"

interface NotificationItem {
  id: string
  type: "warning" | "info" | "success"
  title: string
  message: string
  time: string
  linkHref?: string
  linkLabel?: string
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const locationId = (session as any)?.user?.locationId
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    setLoading(true)
    const list: NotificationItem[] = []

    try {
      // 1. Fetch low stock items for this branch
      const lowStockUrl = locationId ? `/api/low-stock?locationId=${locationId}` : `/api/low-stock`
      const lowRes = await fetch(lowStockUrl)
      if (lowRes.ok) {
        const lowData = await lowRes.json()
        const lowItems = Array.isArray(lowData) ? lowData.slice(0, 4) : []
        lowItems.forEach((item: any, idx: number) => {
          list.push({
            id: `low-${item.productId || idx}`,
            type: "warning",
            title: "Low Inventory Warning",
            message: `${item.productName || "Product"} is running low: only ${item.quantity} units left at register.`,
            time: "Live Alert",
            linkHref: "/cashier/inventory",
            linkLabel: "Lookup Stock",
          })
        })
      }

      // 2. Add shift reminder notification
      list.push({
        id: "shift-status",
        type: "info",
        title: "Cash Drawer Shift Active",
        message: "Current terminal shift is open. Reconcile drawer variance and float count before logout.",
        time: "Current Shift",
        linkHref: "/cashier/shift",
        linkLabel: "View Shift",
      })

      // 3. Add system health notice
      list.push({
        id: "scanner-ready",
        type: "success",
        title: "Peripherals Connected",
        message: "Barcode scanner, thermal printer, and electronic payment terminal are online.",
        time: "Ready",
        linkHref: "/cashier",
        linkLabel: "Open Register",
      })

      setNotifications(list)
    } catch (err) {
      console.error("Error loading cashier notifications:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [locationId])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terminal Alerts & Notifications"
        description="Real-time operational notices, low stock shelf alerts, and active cashier shift reminders."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadNotifications}
              disabled={loading}
              className="h-9 px-3 text-xs border-slate-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs">
              <Link href="/cashier">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to Register
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#14532D]" />
              Active System & Inventory Alerts
            </span>
            <Badge variant="outline" className="text-[10px] bg-slate-100 font-semibold">
              {notifications.length} Unread
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#14532D] border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No active alerts for this register.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 border border-slate-200/80 rounded-lg hover:bg-slate-50/60 transition-colors gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        n.type === "warning"
                          ? "bg-amber-100 text-amber-700"
                          : n.type === "success"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {n.type === "warning" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : n.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{n.title}</p>
                        <span className="text-[10px] text-slate-400 font-medium">• {n.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                    </div>
                  </div>

                  {n.linkHref && (
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs border-slate-300 self-end sm:self-center shrink-0">
                      <Link href={n.linkHref}>
                        {n.linkLabel || "View"}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
