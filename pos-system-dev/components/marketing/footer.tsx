import React from "react"
import Link from "next/link"
import { Boxes } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#F7F9F8] border-t border-[#172B24]/10 text-left text-xs text-[#66756D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Col 1: Brand Logo & Description */}
          <div className="md:col-span-6 space-y-3">
            <Link href="#home" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-[#174B37] text-white flex items-center justify-center shadow-xs">
                <Boxes className="h-4 w-4 text-emerald-200" />
              </div>
              <span className="font-bold text-base text-[#172B24] tracking-tight">
                StockFlow
              </span>
            </Link>
            <p className="text-xs text-[#66756D] leading-relaxed max-w-sm">
              Automated multi-branch inventory control system for supermarkets and modern retail networks. Centralizing product catalogs, stock balances, and inter-branch transfers.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="md:col-span-6 flex flex-wrap items-center justify-start md:justify-end gap-6 sm:gap-8 pt-2">
            <a href="#home" className="hover:text-[#174B37] transition-colors font-medium">
              Home
            </a>
            <a href="#features" className="hover:text-[#174B37] transition-colors font-medium">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#174B37] transition-colors font-medium">
              How It Works
            </a>
            <a href="#about" className="hover:text-[#174B37] transition-colors font-medium">
              About
            </a>
            <Link href="/login" className="text-[#174B37] hover:underline font-bold">
              Login
            </Link>
          </div>

        </div>

        {/* Bottom divider & Copyright */}
        <div className="mt-10 pt-6 border-t border-[#172B24]/8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p>© 2026 StockFlow Automated Inventory Control System. All rights reserved.</p>
          <p className="text-center sm:text-right">
            B.Sc. Computer Science Thesis • Nasarawa State University, Keffi (2026)
          </p>
        </div>

      </div>
    </footer>
  )
}
