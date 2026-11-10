"use client"

import React from "react"
import { Navbar } from "./navbar"
import { Hero } from "./hero"
import { CapabilityStrip } from "./capability-strip"
import { FeatureSection } from "./feature-section"
import { HowItWorks } from "./how-it-works"
import { BenefitsSection } from "./benefits-section"
import { FinalCTA } from "./final-cta"
import { Footer } from "./footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#172B24] font-sans antialiased selection:bg-[#23865B]/15 selection:text-[#174B37] overflow-x-hidden scroll-smooth">
      {/* A. Navigation */}
      <Navbar />

      <main>
        {/* B. Hero with Supporting Benefits & Static Dashboard Preview */}
        <Hero />

        {/* C. Capability Strip */}
        <CapabilityStrip />

        {/* D. Features (6 Items) */}
        <FeatureSection />

        {/* E. How It Works (4 Steps) */}
        <HowItWorks />

        {/* F. Benefits / About (6 Business Advantages) */}
        <BenefitsSection />

        {/* G. Final CTA */}
        <FinalCTA />
      </main>

      {/* H. Footer */}
      <Footer />
    </div>
  )
}
