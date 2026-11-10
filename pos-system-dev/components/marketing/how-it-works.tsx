import React from "react"
import {
  FilePlus,
  Eye,
  ArrowRightLeft,
  FileSpreadsheet
} from "lucide-react"

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: FilePlus,
      title: "Register Products",
      description:
        "Define master items with standardized SKUs, barcodes, supermarket aisles, and retail unit pricing.",
    },
    {
      step: "02",
      icon: Eye,
      title: "Monitor Stock",
      description:
        "Track live physical inventory per branch and receive automated notifications at reorder thresholds.",
    },
    {
      step: "03",
      icon: ArrowRightLeft,
      title: "Manage Movements",
      description:
        "Record supplier stock-ins, log damaged or expired items, and dispatch branch transfers securely.",
    },
    {
      step: "04",
      icon: FileSpreadsheet,
      title: "Generate Reports",
      description:
        "Access immutable transaction audit trails, asset valuations, and CSV summaries for stakeholders.",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-white border-t border-[#172B24]/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#23865B]">
            STREAMLINED WORKFLOW
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#172B24]">
            Inventory Management Made Simple
          </h2>
          <p className="text-base text-[#66756D] leading-relaxed">
            Four intuitive steps to maintain absolute stock integrity and eliminate inventory discrepancies.
          </p>
        </div>

        {/* Steps: Horizontal on Desktop, Vertical on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          
          {/* Subtle connecting line across desktop */}
          <div className="hidden lg:block absolute top-7 left-12 right-12 h-[2px] bg-[#172B24]/10 -z-0" />

          {steps.map((item, idx) => {
            const Icon = item.icon
            return (
              <div key={idx} className="relative z-10 flex flex-col text-left group">
                {/* Step Circle & Icon */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-14 w-14 rounded-2xl bg-white border-2 border-[#174B37] text-[#174B37] font-mono font-bold text-sm flex items-center justify-center shadow-xs group-hover:bg-[#174B37] group-hover:text-white transition-colors duration-200">
                    {item.step}
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-[#23865B]/10 text-[#23865B] flex items-center justify-center lg:hidden">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-[#F7F9F8] rounded-xl p-5 border border-[#172B24]/6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#172B24] tracking-tight mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#66756D] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
