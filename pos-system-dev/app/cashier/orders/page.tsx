"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Receipt,
  Search,
  Printer,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Banknote,
  ArrowLeft,
  Calendar,
  DollarSign,
  Package
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { toast } from "@/hooks/use-toast"

interface OrderTransaction {
  id: string
  date: string
  time: string
  items: number
  total: number
  paymentMethod: string
  status: string
}

export default function CashierOrdersPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const cashierName = session?.user?.name || "Cashier"
  const storeName = (session?.user as any)?.store?.name || (session?.user as any)?.branchName || "Main Supermarket Branch"

  const [transactions, setTransactions] = useState<OrderTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTxn, setSelectedTxn] = useState<OrderTransaction | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)

  const fetchTransactions = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?userId=${userId}`)
      if (res.ok) {
        const json = await res.json()
        const rawList = Array.isArray(json) ? json : json.data || []
        setTransactions(
          rawList.map((t: any) => ({
            id: t.id || t.transactionNumber || "TXN-000",
            date: t.date || new Date().toISOString().split("T")[0],
            time: t.time || "12:00 PM",
            items: t.items || 1,
            total: typeof t.total === "string" ? parseFloat(t.total.replace(/[^0-9.-]+/g, "")) : Number(t.total || 0),
            paymentMethod: t.paymentMethod || "cash",
            status: t.status || "Completed",
          }))
        )
      }
    } catch (error) {
      console.error("Error loading cashier transactions:", error)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [userId])

  const filtered = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.date.includes(searchQuery)
    )
  }, [transactions, searchQuery])

  const totalRevenue = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.total || 0), 0)
  }, [transactions])

  const totalItemsSold = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.items || 0), 0)
  }, [transactions])

  return (
    <div className="space-y-6">
      {/* ───────────────── PAGE HEADER ───────────────── */}
      <PageHeader
        title="Cashier Orders & Transaction History"
        description="Audit logs, receipts, and tender breakdown of sales completed at your register terminal."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactions}
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

      {/* ───────────────── KPI STAT CARDS ───────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Terminal Total Sales"
          value={`₦${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Lifetime register intake"
          icon={TrendingUp}
          iconColor="text-emerald-700"
        />

        <StatCard
          title="Completed Transactions"
          value={transactions.length}
          subtitle="Receipts issued"
          icon={Receipt}
          iconColor="text-blue-600"
        />

        <StatCard
          title="Total Units Sold"
          value={totalItemsSold}
          subtitle="Items scanned & deducted"
          icon={Package}
          iconColor="text-slate-700"
        />

        <StatCard
          title="Average Basket Size"
          value={
            transactions.length > 0
              ? `₦${(totalRevenue / transactions.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "₦0.00"
          }
          subtitle="Avg sale per customer"
          icon={DollarSign}
          iconColor="text-amber-600"
        />
      </div>

      {/* ───────────────── ORDERS DATA TABLE ───────────────── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#14532D]" />
            Transaction Register Ledger
          </CardTitle>

          <div className="w-full sm:w-64 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by Txn ID, tender..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs border-slate-300"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Transaction ID</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4 text-center">Items</th>
                  <th className="py-2.5 px-4">Tender Method</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-700" />
                      Loading transactions...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No transactions found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{t.id}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {t.date} <span className="text-[11px] text-slate-400">({t.time})</span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-semibold text-slate-800">
                        {t.items}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {t.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-[#14532D]">
                        ₦{t.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTxn(t)
                            setShowReceipt(true)
                          }}
                          className="h-7 px-2 text-xs text-emerald-800 hover:text-emerald-900 hover:bg-emerald-50"
                        >
                          <Printer className="h-3.5 w-3.5 mr-1" />
                          Receipt
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ───────────────── RECEIPT REPRINT MODAL ───────────────── */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm bg-white p-6">
          {selectedTxn && (
            <div className="space-y-4 text-xs font-mono">
              <div className="text-center space-y-1">
                <h3 className="font-black text-sm uppercase text-slate-900">STOCKFLOW SUPERMARKET</h3>
                <p className="text-[10px] text-slate-500">{storeName}</p>
                <p className="text-[10px] text-slate-400">Cash Register Customer Receipt</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Txn No:</span>
                  <span className="font-bold">{selectedTxn.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span>{selectedTxn.date} {selectedTxn.time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span>{cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment:</span>
                  <span className="uppercase font-bold">{selectedTxn.paymentMethod}</span>
                </div>
              </div>

              <div className="py-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Items Total ({selectedTxn.items} units):</span>
                  <span>₦{(selectedTxn.total * 0.92).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Tax (8%):</span>
                  <span>₦{(selectedTxn.total * 0.08).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL PAID:</span>
                  <span>₦{selectedTxn.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-2">
                <p>Thank you for shopping at StockFlow!</p>
              </div>

              <div className="flex gap-2 pt-2 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 text-xs"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="flex-1 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
