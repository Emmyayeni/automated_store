import React from "react"
import {
  Package,
  Layers,
  Building2,
  ArrowDownToLine,
  ArrowLeftRight,
  BarChart3
} from "lucide-react"

export function FeatureSection() {
  const features = [
    {
      icon: Package,
      title: "Product Management",
      description:
        "Centralized product master registry with standardized SKUs, supermarket aisle categorization, and barcode scanning support.",
    },
    {
      icon: Layers,
      title: "Inventory Tracking",
      description:
        "Real-time physical stock monitoring per branch with automatic threshold alerts when stock approaches reorder levels.",
    },
    {
      icon: Building2,
      title: "Branch Management",
      description:
        "Multi-branch administrative visibility across all retail locations with role-based permissions for managers, clerks, and cashiers.",
    },
    {
      icon: ArrowDownToLine,
      title: "Stock-In and Stock-Out",
      description:
        "Structured receiving of supplier purchase orders alongside auditable deduction logs for shrinkage, damage, and expiry.",
    },
    {
      icon: ArrowLeftRight,
      title: "Stock Transfers",
      description:
        "End-to-end 4-stage custody protocol (Requested, Approved, In-Transit, Received) guaranteeing atomic balance updates with zero loss.",
    },
    {
      icon: BarChart3,
      title: "Reports and Analytics",
      description:
        "Instant inventory asset valuation, movement ledger history, exportable CSV audit records, and cashier register reconciliation.",
    },
  ]

  return (
    <section id="features" className="py-20 lg:py-28 bg-[#F7F9F8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#23865B]">
            CORE CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#172B24]">
            Everything You Need to Manage Your Inventory
          </h2>
          <p className="text-base text-[#66756D] leading-relaxed">
            Engineered for modern retail supermarkets, delivering complete control over stock balances, staff workflows, and multi-location logistics.
          </p>
        </div>

        {/* 6 Feature Items (3x2 Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#172B24]/8 p-7 shadow-xs hover:shadow-md hover:border-[#172B24]/15 transition-all duration-200 group text-left flex flex-col justify-between"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-[#23865B]/10 text-[#174B37] flex items-center justify-center mb-5 group-hover:bg-[#174B37] group-hover:text-white transition-colors duration-200">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#172B24] tracking-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#66756D] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
