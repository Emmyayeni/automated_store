"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{ email?: string; role?: string } | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState("")

  // Fetch invite info using the token
  useEffect(() => {
    if (!token) return
    const fetchInvite = async () => {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`/api/accept-invite?token=${token}`)
        const data = await res.json()
        if (!res.ok) {
          const errorMessage = data.error || "Invalid or expired invite link."
          setError(errorMessage)
          toast.error(errorMessage)
        } else {
          setInviteInfo(data)
          setEmail(data.email)
        }
      } catch {
        const errorMessage = "Failed to load invite."
        setError(errorMessage)
        toast.error(errorMessage)
      }
      setLoading(false)
    }
    fetchInvite()
  }, [token])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errorMessage = data.error || "Failed to accept invite."
        setError(errorMessage)
        toast.error(errorMessage)
      } else {
        setAccepted(true)
        toast.success("Account created! You can now log in.")
      }
    } catch {
      const errorMessage = "Failed to accept invite."
      setError(errorMessage)
      toast.error(errorMessage)
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Invite</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Missing or invalid invite token.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card>
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Your account has been created. You can now log in.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <Card>
        <CardHeader>
          <CardTitle>Accept Team Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 text-red-500">{error}</div>}
          {inviteInfo ? (
            <form className="space-y-4" onSubmit={handleAccept}>
              <div>
                <label className="block mb-1 font-medium">Email</label>
                <Input value={email} disabled />
              </div>
              <div>
                <label className="block mb-1 font-medium">Role</label>
                <Input value={inviteInfo.role} disabled />
              </div>
              <div>
                <label className="block mb-1 font-medium">Full Name</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Accepting..." : "Accept Invite"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">{loading ? "Loading..." : "Invite not found."}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="max-w-md mx-auto mt-20">
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading invite information...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInviteContent />
    </Suspense>
  )
}