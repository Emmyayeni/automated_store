"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Users, Clock, Star, Calendar } from "lucide-react"
import { useSession } from "next-auth/react"

interface StaffMember {
  id: string
  name: string
  role: string
  email: string
  phone: string
  status: "active" | "inactive" | "on-break"
  todayHours: number
  weeklyHours: number
  performance: number
  lastShift: string
  avatar?: string
}

export default function StaffPage() {
  const { data: session } = useSession()
  const locationId = session?.user?.locationId

  const [staff, setStaff] = useState<StaffMember[]>([])

  useEffect(() => {
    if (!locationId) return
    fetch(`/api/staff?locationId=${locationId}&role=CASHIER`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStaff(
            data.map((item: any) => ({
              id: item.id,
              name: [item.firstName, item.lastName].filter(Boolean).join(" "),
              role: item.role?.toLowerCase() || "cashier",
              email: item.email || "",
              phone: item.phone || "",
              status: item.status?.toLowerCase() || "active",
              todayHours: item.todayHours ?? 0,
              weeklyHours: item.weeklyHours ?? 0,
              performance: item.performance ?? 90,
              lastShift: item.lastShift || "",
              avatar: item.avatar || "",
            }))
          )
        }
      })
      .catch(() => setStaff([]))
  }, [locationId])

  const activeStaff = staff.filter((s) => s.status === "active").length
  const totalHoursToday = staff.reduce((sum, s) => sum + s.todayHours, 0)
  const avgPerformance = staff.length > 0 ? staff.reduce((sum, s) => sum + s.performance, 0) / staff.length : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "on-break":
        return "secondary"
      case "inactive":
        return "outline"
      default:
        return "outline"
    }
  }

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return "text-green-600"
    if (performance >= 80) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
        <p className="text-muted-foreground">Monitor your team's performance and schedules</p>
      </div>

      {/* Staff Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStaff}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
            <p className="text-xs text-muted-foreground">Team members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHoursToday}</div>
            <p className="text-xs text-muted-foreground">Total worked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerformance.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Current Shifts</CardTitle>
          <CardDescription>Staff currently on duty</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {staff
              .filter((member) => member.status === "active" || member.status === "on-break")
              .map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={member.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{member.todayHours}h today</p>
                      <p className="text-xs text-muted-foreground">{member.weeklyHours}h this week</p>
                    </div>
                    <Badge variant={getStatusColor(member.status)}>{member.status}</Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Individual staff performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {staff.map((member) => (
              <div key={member.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.weeklyHours}h this week</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${getPerformanceColor(member.performance)}`}>
                      {member.performance}%
                    </span>
                    <Badge variant={getStatusColor(member.status)}>{member.status}</Badge>
                  </div>
                </div>
                <Progress value={member.performance} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Staff Members</CardTitle>
          <CardDescription>Complete staff directory and details</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Today's Hours</TableHead>
                <TableHead>Weekly Hours</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{member.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{member.email}</div>
                      <div className="text-sm text-muted-foreground">{member.phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(member.status)}>{member.status}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{member.todayHours}h</TableCell>
                  <TableCell className="font-medium">{member.weeklyHours}h</TableCell>
                  <TableCell>
                    <span className={`font-medium ${getPerformanceColor(member.performance)}`}>
                      {member.performance}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline">
                        <Calendar className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Clock className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}