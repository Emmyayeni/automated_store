"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Percent, DollarSign, Gift } from "lucide-react"
import { formatDisplayDate, formatPrice } from "@/lib/standards/formatting"

interface PromotionManagerProps {
  locationId: string
}

export default function PromotionManager({ locationId }: PromotionManagerProps) {
  const [promotions, setPromotions] = useState<any[]>([])
  const [showCreatePromotion, setShowCreatePromotion] = useState(false)
  const [newPromotion, setNewPromotion] = useState({
    name: "",
    description: "",
    promotionType: "percentage",
    discountValue: "",
    minPurchaseAmount: "",
    startDate: "",
    endDate: "",
    usageLimit: "",
  })

  useEffect(() => {
    fetchPromotions()
  }, [locationId])

  const fetchPromotions = async () => {
    try {
      const response = await fetch(`/api/promotions?locationId=${locationId}`)
      const data = await response.json()
      setPromotions(data)
    } catch (error) {
      console.error("Error fetching promotions:", error)
    }
  }

  const handleCreatePromotion = async () => {
    try {
      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPromotion,
          locationId,
          discountValue: Number.parseFloat(newPromotion.discountValue),
          minPurchaseAmount: newPromotion.minPurchaseAmount ? Number.parseFloat(newPromotion.minPurchaseAmount) : null,
          usageLimit: newPromotion.usageLimit ? Number.parseInt(newPromotion.usageLimit) : null,
        }),
      })

      if (response.ok) {
        fetchPromotions()
        setShowCreatePromotion(false)
        setNewPromotion({
          name: "",
          description: "",
          promotionType: "percentage",
          discountValue: "",
          minPurchaseAmount: "",
          startDate: "",
          endDate: "",
          usageLimit: "",
        })
      }
    } catch (error) {
      console.error("Error creating promotion:", error)
    }
  }

  const getPromotionIcon = (type: string) => {
    switch (type) {
      case "percentage":
        return <Percent className="h-4 w-4" />
      case "fixed_amount":
        return <DollarSign className="h-4 w-4" />
      default:
        return <Gift className="h-4 w-4" />
    }
  }

  const getPromotionStatus = (promotion: any) => {
    const now = new Date()
    const start = new Date(promotion.startDate)
    const end = new Date(promotion.endDate)

    if (now < start) return { status: "scheduled", color: "bg-blue-100 text-blue-800" }
    if (now > end) return { status: "expired", color: "bg-gray-100 text-gray-800" }
    if (!promotion.isActive) return { status: "inactive", color: "bg-red-100 text-red-800" }
    return { status: "active", color: "bg-green-100 text-green-800" }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Promotions & Discounts</h2>
        <Dialog open={showCreatePromotion} onOpenChange={setShowCreatePromotion}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Promotion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Promotion Name</Label>
                <Input
                  id="name"
                  value={newPromotion.name}
                  onChange={(e) => setNewPromotion({ ...newPromotion, name: e.target.value })}
                  placeholder="Summer Sale"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newPromotion.description}
                  onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                  placeholder="Get 20% off all items"
                />
              </div>

              <div>
                <Label htmlFor="type">Promotion Type</Label>
                <select
                  id="type"
                  value={newPromotion.promotionType}
                  onChange={(e) => setNewPromotion({ ...newPromotion, promotionType: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed_amount">Fixed Amount Discount</option>
                  <option value="buy_x_get_y">Buy X Get Y</option>
                </select>
              </div>

              <div>
                <Label htmlFor="discount-value">
                  {newPromotion.promotionType === "percentage" ? "Discount Percentage" : "Discount Amount"}
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  step="0.01"
                  value={newPromotion.discountValue}
                  onChange={(e) => setNewPromotion({ ...newPromotion, discountValue: e.target.value })}
                  placeholder={newPromotion.promotionType === "percentage" ? "20" : "10.00"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={newPromotion.startDate}
                    onChange={(e) => setNewPromotion({ ...newPromotion, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={newPromotion.endDate}
                    onChange={(e) => setNewPromotion({ ...newPromotion, endDate: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleCreatePromotion} className="w-full">
                Create Promotion
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promotions.map((promotion) => {
          const status = getPromotionStatus(promotion)
          return (
            <Card key={promotion.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPromotionIcon(promotion.promotionType)}
                    {promotion.name}
                  </div>
                  <Badge className={status.color}>{status.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{promotion.description}</p>
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span className="font-medium">
                      {promotion.promotionType === "percentage"
                        ? `${promotion.discountValue}%`
                        : formatPrice(promotion.discountValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Usage:</span>
                    <span>
                      {promotion.usageCount} / {promotion.usageLimit || "∞"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    <p>
                      {formatDisplayDate(promotion.startDate)} -{" "}
                      {formatDisplayDate(promotion.endDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
