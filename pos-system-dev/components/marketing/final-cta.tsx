import React from "react"
import Link from "next/link"
import { ArrowRight, ShieldCheck, Boxes } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FinalCTA() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-[#174B37] rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
          {/* Subtle geometric pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#23865b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            {/* Small icon badge */}
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-white/10 text-white backdrop-blur-xs border border-white/15">
              <Boxes className="h-6 w-6 text-emerald-200" />
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Bring Every Branch Into One Inventory System.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed max-w-xl mx-auto">
              Simplify inventory operations and gain better visibility into stock across your supermarket branches.
            </p>

            {/* CTA Button */}
            <div className="pt-2">
              <Button
                asChild
                className="bg-white hover:bg-slate-100 text-[#174B37] font-bold text-sm h-12 px-8 rounded-lg shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <span>Access Your Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Trust badge */}
            <div className="pt-4 flex items-center justify-center gap-2 text-xs text-emerald-200/80">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>Multi-Role Access: Administrator • Branch Manager • Clerk • Cashier</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
