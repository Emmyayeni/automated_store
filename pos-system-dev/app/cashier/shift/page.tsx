"use client"

import React from "react"
import Link from "next/link"
import ShiftManagement from "@/components/cashier/shift-management"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock } from "lucide-react"

export default function ShiftPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Drawer & Shift Management"
        description="Open shifts, count initial float cash, record reconciliation variances, and generate shift audit summaries."
        actions={
          <Button asChild size="sm" className="h-9 bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs">
            <Link href="/cashier">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Register
            </Link>
          </Button>
        }
      />
      <ShiftManagement />
    </div>
  )
}
