import React from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardPreview } from "./dashboard-preview"

export function Hero() {
  const supportingBenefits = [
    "Centralized inventory.",
    "Multi-branch visibility.",
    "Smarter stock control.",
  ]

  return (
    <section id="home" className="relative pt-8 pb-16 lg:pt-16 lg:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            {/* Small Label */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#23865B]/10 border border-[#23865B]/20 text-[#174B37] text-xs font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#23865B]" />
              <span>SMART INVENTORY MANAGEMENT</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-[#172B24] leading-[1.12]">
              Take Control of Your Inventory. Across Every Branch.
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#66756D] leading-relaxed max-w-xl">
              Manage products, monitor stock levels, track inventory movements and coordinate stock transfers across all your supermarket branches from one centralized platform.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button
                asChild
                className="bg-[#174B37] hover:bg-[#123d2c] text-white text-sm font-semibold h-12 px-7 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <Link href="/login" className="flex items-center justify-center gap-2">
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-[#172B24]/15 hover:border-[#172B24]/30 bg-white hover:bg-[#F7F9F8] text-[#172B24] text-sm font-semibold h-12 px-6 rounded-lg transition-all duration-200"
              >
                <a href="#features">
                  Explore Features
                </a>
              </Button>
            </div>

            {/* Three Supporting Benefits */}
            <div className="pt-4 border-t border-[#172B24]/8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs text-[#66756D] font-medium">
              {supportingBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#23865B] shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column: Dashboard Preview */}
          <div className="lg:col-span-6 w-full">
            <DashboardPreview />
          </div>

        </div>
      </div>
    </section>
  )
}
