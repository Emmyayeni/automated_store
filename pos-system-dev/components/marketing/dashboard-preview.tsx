import React from "react"
import {
  Package,
  Building2,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  Layers,
  ArrowDownToLine,
  CheckCircle2,
  Store
} from "lucide-react"

export function DashboardPreview() {
  const sampleActivities = [
    {
      product: "Farm Fresh Whole Milk 1L",
      sku: "SKU-DRY-001",
      type: "STOCK_IN",
      typeLabel: "Stock In",
      quantity: "+120",
      branch: "Downtown Central Hub",
      price: "₦2,800.00",
      time: "10 mins ago",
    },
    {
      product: "Artisan Sourdough Loaf",
      sku: "SKU-BKY-002",
      type: "TRANSFER",
      typeLabel: "Dispatched",
      quantity: "30",
      branch: "Downtown → Westside",
      price: "₦3,200.00",
      time: "24 mins ago",
    },
    {
      product: "Organic Gala Apples (1kg)",
      sku: "SKU-PRD-003",
      type: "SALE",
      typeLabel: "POS Sale",
      quantity: "-4",
      branch: "Airport Plaza Branch",
      price: "₦5,500.00",
      time: "42 mins ago",
    },
    {
      product: "Extra Virgin Olive Oil 750ml",
      sku: "SKU-PAN-005",
      type: "RESTOCK",
      typeLabel: "Stock In",
      quantity: "+50",
      branch: "Downtown Central Hub",
      price: "₦18,500.00",
      time: "1 hour ago",
    },
  ]

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Decorative ambient underglow */}
      <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-tr from-[#174B37]/15 to-[#23865B]/15 blur-lg opacity-70" />

      {/* Main Preview Container */}
      <div className="relative rounded-2xl bg-white border border-[#172B24]/10 shadow-xl shadow-slate-900/5 overflow-hidden">
        
        {/* Mock Window Top Bar */}
        <div className="px-4 py-3 bg-[#F7F9F8] border-b border-[#172B24]/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            </div>
            <span className="ml-2 text-[11px] font-semibold text-[#172B24] flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-[#23865B]" />
              Downtown Central Hub
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#23865B]/10 text-[#174B37] text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#23865B] animate-pulse" />
            <span>3 Branches Synced</span>
          </div>
        </div>

        {/* Mock Content Area */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* 4 Illustrative Stat Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1 */}
            <div className="p-3 rounded-xl bg-[#F7F9F8] border border-[#172B24]/6">
              <div className="flex items-center justify-between text-[11px] text-[#66756D] font-medium">
                <span>Total Products</span>
                <Package className="h-3.5 w-3.5 text-[#23865B]" />
              </div>
              <div className="text-lg font-bold text-[#172B24] mt-1 font-mono">1,280</div>
              <p className="text-[10px] text-[#66756D] mt-0.5">Across 10 supermarket aisles</p>
            </div>

            {/* Card 2 */}
            <div className="p-3 rounded-xl bg-[#F7F9F8] border border-[#172B24]/6">
              <div className="flex items-center justify-between text-[11px] text-[#66756D] font-medium">
                <span>Total Branches</span>
                <Building2 className="h-3.5 w-3.5 text-[#174B37]" />
              </div>
              <div className="text-lg font-bold text-[#172B24] mt-1 font-mono">3 Hubs</div>
              <p className="text-[10px] text-[#66756D] mt-0.5">Downtown, Westside, Airport</p>
            </div>

            {/* Card 3 */}
            <div className="p-3 rounded-xl bg-[#F7F9F8] border border-[#172B24]/6">
              <div className="flex items-center justify-between text-[11px] text-[#66756D] font-medium">
                <span>Low-Stock Items</span>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="text-lg font-bold text-amber-700 mt-1 font-mono">8 Items</div>
              <p className="text-[10px] text-[#66756D] mt-0.5">Automated reorder alert</p>
            </div>

            {/* Card 4 */}
            <div className="p-3 rounded-xl bg-[#F7F9F8] border border-[#172B24]/6">
              <div className="flex items-center justify-between text-[11px] text-[#66756D] font-medium">
                <span>Pending Transfers</span>
                <ArrowLeftRight className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div className="text-lg font-bold text-[#172B24] mt-1 font-mono">4 In-Transit</div>
              <p className="text-[10px] text-[#66756D] mt-0.5">Inter-branch dispatch</p>
            </div>
          </div>

          {/* Recent Stock Activity Table Preview */}
          <div className="rounded-xl border border-[#172B24]/8 overflow-hidden bg-white">
            <div className="px-3 py-2 bg-[#F7F9F8] border-b border-[#172B24]/6 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#172B24] tracking-tight">
                Recent Stock Activity
              </span>
              <span className="text-[10px] font-medium text-[#66756D]">
                Real-Time Ledger
              </span>
            </div>

            <div className="divide-y divide-[#172B24]/5">
              {sampleActivities.map((act, i) => (
                <div key={i} className="px-3 py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-[#172B24] truncate text-[11px]">
                      {act.product}
                    </p>
                    <p className="text-[10px] text-[#66756D] truncate font-mono">
                      {act.branch} • {act.price}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        act.type === "STOCK_IN" || act.type === "RESTOCK"
                          ? "bg-emerald-50 text-emerald-800"
                          : act.type === "SALE"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {act.quantity}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">
                      {act.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Security / Trust Footer in Preview */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-[#66756D]">
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#23865B]" />
              Zero-negative stock balance enforcement
            </span>
            <span className="font-mono text-[10px] text-slate-400">PostgreSQL</span>
          </div>

        </div>
      </div>
    </div>
  )
}
