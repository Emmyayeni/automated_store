"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { RefreshCw, CreditCard, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function POSRedirectPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/login")
      return
    }

    const resolveAndRedirect = async () => {
      let locId = session.user?.locationId

      // If user has no assigned location (e.g. Admin or central staff), fetch the first supermarket branch
      if (!locId) {
        try {
          const res = await fetch("/api/locations")
          if (res.ok) {
            const data = await res.json()
            const list = Array.isArray(data) ? data : data.data || []
            if (list.length > 0 && list[0].id) {
              locId = list[0].id
            }
          }
        } catch (err) {
          console.error("Error finding default branch for POS:", err)
        }
      }

      const destination = locId ? `/cashier/pos/${locId}` : "/cashier"
      setTargetUrl(destination)
      router.push(destination)
    }

    resolveAndRedirect()
  }, [session, status, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="h-12 w-12 rounded-xl bg-[#14532D] text-white flex items-center justify-center mx-auto shadow-xs">
          <CreditCard className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Launching StockFlow POS Terminal</h2>
          <p className="text-xs text-slate-500 mt-1">Connecting to branch cash register workstation...</p>
        </div>
        <div className="flex items-center justify-center py-2 text-emerald-700">
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
        {targetUrl && (
          <div className="pt-2">
            <Button asChild className="w-full bg-[#14532D] hover:bg-[#0f3e22] text-white text-xs font-bold">
              <Link href={targetUrl}>
                Click here if not redirected automatically
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
