"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ManagerInventoryRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/inventory")
  }, [router])

  return (
    <div className="flex items-center justify-center h-72">
      <div className="text-center space-y-2">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#14532D] border-t-transparent" />
        <p className="text-sm font-medium text-slate-600">Loading branch inventory balances...</p>
      </div>
    </div>
  )
}
