"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Boxes, Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "About", href: "#about" },
  ]

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? "bg-[#FFFFFF]/95 backdrop-blur-md shadow-xs border-b border-[#172B24]/10"
          : "bg-[#F7F9F8]/80 backdrop-blur-xs border-b border-[#172B24]/5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Name */}
          <Link href="#home" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-[#174B37] text-white flex items-center justify-center shadow-sm group-hover:bg-[#23865B] transition-colors duration-200">
              <Boxes className="h-5 w-5 text-emerald-200" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-[#172B24] tracking-tight leading-none group-hover:text-[#174B37] transition-colors">
                StockFlow
              </span>
              <span className="text-[11px] font-medium text-[#66756D] tracking-wide mt-1">
                Automated Inventory Control
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-[#66756D] hover:text-[#174B37] transition-colors duration-150 relative py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action: Login */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              asChild
              className="bg-[#174B37] hover:bg-[#123d2c] text-white text-xs font-semibold px-5 h-10 rounded-lg shadow-sm transition-all duration-200 hover:shadow hover:-translate-y-0.5"
            >
              <Link href="/login" className="flex items-center gap-1.5">
                <span>Sign In</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              asChild
              size="sm"
              className="bg-[#174B37] hover:bg-[#123d2c] text-white text-xs font-medium px-3.5 h-9 rounded-lg"
            >
              <Link href="/login">Login</Link>
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#172B24] hover:bg-[#172B24]/5 focus:outline-hidden"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#172B24]/10 shadow-lg px-4 pt-3 pb-6 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-[#172B24] hover:text-[#23865B] px-3 py-2 rounded-lg hover:bg-[#F7F9F8] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 border-t border-[#172B24]/10">
              <Button
                asChild
                className="w-full bg-[#174B37] hover:bg-[#123d2c] text-white text-xs font-semibold h-10 rounded-lg shadow-xs"
              >
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2">
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
