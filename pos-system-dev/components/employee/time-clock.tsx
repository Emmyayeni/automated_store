"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, Play, Square } from "lucide-react"
import { formatTime as formatStandardTime, formatDisplayDate, formatDisplayDateTime } from "@/lib/standards/formatting"

interface TimeClockProps {
  userId: string
  userName: string
}

export default function TimeClock({ userId, userName }: TimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    fetchActiveEntry()
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const fetchActiveEntry = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/time-entries?userId=${userId}`)
      if (!response.ok) throw new Error("Failed to fetch time entries")
      const entries = await response.json()
      const active = Array.isArray(entries) ? entries.find((entry: any) => !entry.clockOut) : null
      setActiveEntry(active || null)
    } catch (error) {
      setActiveEntry(null)
      setError("Could not fetch time entries.")
      console.error("Error fetching active entry:", error)
    }
  }

  const handleClockAction = async (action: "clock_in" | "clock_out") => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action,
          notes,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        await fetchActiveEntry()
        setNotes("")
      } else {
        setError(data?.error || "Failed to process time entry.")
      }
    } catch (error) {
      setError("Network error. Please try again.")
      console.error("Error with clock action:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeWithSeconds = (date: Date) => {
    return formatStandardTime(date) + ":" + date.getSeconds().toString().padStart(2, "0")
  }

  const calculateHoursWorked = () => {
    if (!activeEntry?.clockIn) return "0:00"
    const start = new Date(activeEntry.clockIn)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}:${minutes.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Clock - {userName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold">{formatTimeWithSeconds(currentTime)}</div>
            <div className="text-sm text-gray-500">{formatDisplayDate(currentTime)}</div>
          </div>

          {error && (
            <div className="text-red-600 text-center font-medium">{error}</div>
          )}

          {activeEntry ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-green-800">Currently Clocked In</p>
                    <p className="text-sm text-green-600">
                      Since: {activeEntry.clockIn ? formatDisplayDateTime(activeEntry.clockIn) : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-800">{calculateHoursWorked()}</p>
                    <p className="text-sm text-green-600">Hours Worked</p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes for this shift..."
                  disabled={loading}
                />
              </div>

              <Button onClick={() => handleClockAction("clock_out")} disabled={loading} className="w-full" size="lg">
                <Square className="h-4 w-4 mr-2" />
                {loading ? "Clocking Out..." : "Clock Out"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Starting shift notes..."
                  disabled={loading}
                />
              </div>

              <Button onClick={() => handleClockAction("clock_in")} disabled={loading} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                {loading ? "Clocking In..." : "Clock In"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}