"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Plus, Users, Phone, Mail, MapPin } from "lucide-react"
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/standards/formatting"
import { CommonValidators, validateForm } from "@/lib/standards/validation"
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages"
import type { Customer, FormData, FormErrors } from "@/lib/types"

interface CustomerManagementProps {
  businessId: string
}

type CustomerFormData = FormData<Customer>

export default function CustomerManagement({ businessId }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    businessId,
  })
  const [formErrors, setFormErrors] = useState<FormErrors<CustomerFormData>>({})

  useEffect(() => {
    fetchCustomers()
  }, [businessId])

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/customers?businessId=${businessId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.success ? data.data : [])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    } finally {
      setLoading(false)
    }
  }

  const validateCustomerForm = (data: CustomerFormData) => {
    const validators = {
      name: CommonValidators.name("Customer name", true),
      email: CommonValidators.email(false),
      phone: CommonValidators.phone(false),
    }

    return validateForm(data, validators)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validateCustomerForm(formData)
    if (!validation.isValid) {
      const errors: FormErrors<CustomerFormData> = {}
      validation.errors.forEach(error => {
        const field = error.toLowerCase().includes('name') ? 'name' :
                     error.toLowerCase().includes('email') ? 'email' :
                     error.toLowerCase().includes('phone') ? 'phone' : 'name'
        errors[field as keyof CustomerFormData] = error
      })
      setFormErrors(errors)
      return
    }

    setLoading(true)
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers'
      const method = editingCustomer ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchCustomers()
        handleCloseDialog()
      }
    } catch (error) {
      console.error("Error saving customer:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseDialog = () => {
    setShowAddCustomer(false)
    setEditingCustomer(null)
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      businessId,
    })
    setFormErrors({})
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      businessId: customer.businessId,
    })
    setShowAddCustomer(true)
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  )

  const getCustomerStatus = (customer: Customer) => {
    const isActive = customer.isActive ?? true
    return isActive ? 
      { label: "Active", variant: "default" as const } : 
      { label: "Inactive", variant: "secondary" as const }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Customer Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage customer information and relationships
          </p>
        </div>
        <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter customer name"
                />
                {formErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@example.com"
                />
                {formErrors.email && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+232 XX XXX XXXX"
                />
                {formErrors.phone && (
                  <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Customer address"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : editingCustomer ? 'Update' : 'Add'} Customer
                </Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No customers found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search criteria' : 'Add your first customer to get started'}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const status = getCustomerStatus(customer)
            return (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-2">
                    Added: {formatDisplayDate(customer.createdAt)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditCustomer(customer)}
                    className="w-full mt-2"
                  >
                    Edit Customer
                  </Button>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}