"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import CashierInventoryView from "@/components/inventory/cashier-inventory-view"

export default function CashierInventoryPage() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Loading...</p>
      </div>
    )
  }

  if (!session) {
    redirect("/login")
  }

  // Get location ID from session or use default
  const locationId = session.user?.locationId || "default-location"

  return (
    <div className="container mx-auto p-6">
      <CashierInventoryView locationId={locationId} />
    </div>
  )
}