import React from "react"
import {
  Database,
  Layers,
  ArrowLeftRight,
  BarChart3
} from "lucide-react"

export function CapabilityStrip() {
  const capabilities = [
    {
      icon: Database,
      title: "Centralized Management",
      description: "One unified catalog and pricing master across all store locations.",
    },
    {
      icon: Layers,
      title: "Real-Time Stock Tracking",
      description: "Live quantity balances updated synchronously with cashier registers.",
    },
    {
      icon: ArrowLeftRight,
      title: "Branch Coordination",
      description: "Structured 4-stage transfer custody between warehouse and retail hubs.",
    },
    {
      icon: BarChart3,
      title: "Inventory Reporting",
      description: "Comprehensive holding valuations and transaction ledgers.",
    },
  ]

  return (
    <section className="bg-white border-y border-[#172B24]/8 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon
            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 group text-left"
              >
                <div className="p-2.5 rounded-xl bg-[#23865B]/10 text-[#174B37] shrink-0 group-hover:bg-[#174B37] group-hover:text-white transition-colors duration-200">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172B24] tracking-tight">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-[#66756D] mt-1 leading-relaxed">
                    {cap.description}
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
