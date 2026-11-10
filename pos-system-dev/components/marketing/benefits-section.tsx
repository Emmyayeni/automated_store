import React from "react"
import { CheckCircle2, Shield, TrendingUp, Sparkles } from "lucide-react"

export function BenefitsSection() {
  const benefits = [
    {
      title: "Centralized inventory records.",
      description:
        "Maintain a single, authoritative catalog database for products, SKUs, and pricing across every supermarket location.",
    },
    {
      title: "Better visibility into stock levels.",
      description:
        "Eliminate inventory blind spots, prevent stockouts during peak retail hours, and stop costly over-purchasing.",
    },
    {
      title: "Organized stock movement history.",
      description:
        "Every receipt, dispatch, shrinkage write-off, and customer tender is permanently logged in an immutable ledger.",
    },
    {
      title: "Improved accountability.",
      description:
        "Granular role-based controls separate executive admin oversight from manager approvals and cashier registers.",
    },
    {
      title: "Easier access to reports.",
      description:
        "Generate asset valuations, category breakdowns, and transaction summaries instantly with one-click export.",
    },
    {
      title: "Consistent branch inventory processes.",
      description:
        "Enforce standardized operational procedures across Downtown Central Hub, Westside Mall, and Airport Plaza.",
    },
  ]

  return (
    <section id="about" className="py-20 lg:py-28 bg-[#F7F9F8] border-t border-[#172B24]/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#23865B]">
            BUSINESS ADVANTAGES
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#172B24]">
            A Smarter Way to Manage Multiple Branches
          </h2>
          <p className="text-base text-[#66756D] leading-relaxed">
            Designed to replace fragmented spreadsheets and manual counts with automated accuracy, transparency, and operational control.
          </p>
        </div>

        {/* 6 Benefit Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#172B24]/8 p-6 shadow-xs hover:border-[#172B24]/15 transition-all text-left flex items-start gap-4"
            >
              <div className="h-9 w-9 rounded-xl bg-[#23865B]/10 text-[#23865B] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#172B24] tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#66756D] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
