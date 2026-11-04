"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Star, Mail, Phone, Search, UserPlus } from "lucide-react"

import type { Customer } from "@/lib/types"

// Extended customer interface for UI-specific fields
interface ExtendedCustomer extends Customer {
  totalSpent: number
  totalOrders?: number
  segment?: "frequent" | "regular" | "inactive"
  lastOrder?: string
  avatar?: string
  createdAt?: string
}

export default function CustomersPage() {
  const { data: session } = useSession()
  const sessionData = (session as any)?.data || session;
  const businessId = sessionData?.user?.businessId
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [segmentFilter, setSegmentFilter] = useState("all")

  // Add Customer Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  })

  // Fetch customers from API
  useEffect(() => {
    if (!businessId) return
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`/api/customers?businessId=${businessId}`)
        const data = await res.json()
        setCustomers(data)
      } catch {
        setCustomers([])
      }
    }
    fetchCustomers()
  }, [businessId])

  // Add customer handler
  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email || !businessId) return
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCustomer, businessId }),
      })
      if (res.ok) {
        const created = await res.json()
        setCustomers([created, ...customers])
        setIsAddDialogOpen(false)
        setNewCustomer({ name: "", email: "", phone: "" })
      }
    } catch {}
  }

  // You may want to compute segment, totalOrders, lastOrder here if not in DB
  const customersWithSegments = customers.map((c) => ({
    ...c,
    segment:
      c.loyaltyPoints > 100
        ? "frequent"
        : c.loyaltyPoints > 0
        ? "regular"
        : "inactive",
    totalOrders: c.totalOrders ?? Math.floor(Math.random() * 10) + 1, // fallback for demo
    lastOrder: c.lastOrder ?? c.createdAt,
  }))

  const filteredCustomers = customersWithSegments.filter((customer) => {
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSegment = segmentFilter === "all" || customer.segment === segmentFilter
    return matchesSearch && matchesSegment
  })

  const getSegmentColor = (segment: string | undefined) => {
    switch (segment) {
      case "frequent":
        return "default"
      case "regular":
        return "secondary"
      case "inactive":
        return "outline"
      default:
        return "outline"
    }
  }

  const totalCustomers = customers.length
  const frequentCustomers = customersWithSegments.filter((c) => c.segment === "frequent").length
  const totalRevenue = customers.reduce((sum, c) => sum + Number(c.totalSpent), 0)
  const totalOrders = customersWithSegments.reduce((sum, c) => sum + (c.totalOrders || 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">Manage your customer relationships and loyalty program</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Add Customer Dialog */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Add Customer</h2>
            <Input
              placeholder="Name"
              value={newCustomer.name}
              onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={newCustomer.email}
              onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
            />
            <Input
              placeholder="Phone"
              value={newCustomer.phone}
              onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCustomer}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frequent Customers</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{frequentCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {totalCustomers > 0 ? ((frequentCustomers / totalCustomers) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From customer purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="frequent">Frequent</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Segments */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Frequent Customers</CardTitle>
            <CardDescription>High-value repeat customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customersWithSegments
                .filter((c) => c.segment === "frequent")
                .slice(0, 3)
                .map((customer) => (
                  <div key={customer.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={customer.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{(customer.name || "C").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{customer.name || "Customer"}</p>
                      <p className="text-xs text-muted-foreground">${Number(customer.totalSpent).toLocaleString()} spent</p>
                    </div>
                    <Badge variant="default">{customer.loyaltyPoints} pts</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regular Customers</CardTitle>
            <CardDescription>Steady customer base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customersWithSegments
                .filter((c) => c.segment === "regular")
                .slice(0, 3)
                .map((customer) => (
                  <div key={customer.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={customer.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{(customer.name || "C").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{customer.name || "Customer"}</p>
                      <p className="text-xs text-muted-foreground">{customer.totalOrders} orders</p>
                    </div>
                    <Badge variant="secondary">{customer.loyaltyPoints} pts</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inactive Customers</CardTitle>
            <CardDescription>Need re-engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customersWithSegments
                .filter((c) => c.segment === "inactive")
                .slice(0, 3)
                .map((customer) => (
                  <div key={customer.id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={customer.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{(customer.name || "C").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{customer.name || "Customer"}</p>
                      <p className="text-xs text-muted-foreground">Last: {customer.lastOrder && new Date(customer.lastOrder).toLocaleDateString()}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>Complete customer database</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Last Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={customer.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{(customer.name || "C").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{customer.name || "Customer"}</div>
                        <div className="text-sm text-muted-foreground">
                          Member since {customer.createdAt && new Date(customer.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="mr-1 h-3 w-3" />
                        {customer.email}
                      </div>
                      <div className="flex items-center text-sm">
                        <Phone className="mr-1 h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{customer.totalOrders}</TableCell>
                  <TableCell className="font-medium">${Number(customer.totalSpent).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.loyaltyPoints} points</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSegmentColor(customer.segment)}>{customer.segment}</Badge>
                  </TableCell>
                  <TableCell>{customer.lastOrder && new Date(customer.lastOrder).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}