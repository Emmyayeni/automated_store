"use client"

import { useSession } from "next-auth/react"
import CurrencySettings from "@/components/admin/currency-settings"

export default function CurrencySettingsPage() {
  const { data: session } = useSession()
  const sessionData = (session as any)?.data || session;
  const businessId = sessionData?.user?.businessId

  if (!businessId) {
    return <div>Loading...</div>
  }

  return <CurrencySettings businessId={businessId} />
}