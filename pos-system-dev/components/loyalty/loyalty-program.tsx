"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Star, Gift, Award, Search } from "lucide-react"
import { formatDisplayDate } from "@/lib/standards/formatting"
import { CommonValidators } from "@/lib/standards/validation"
import type { Customer } from "@/lib/types"

interface LoyaltyProgramProps {
  customerId?: string
}

export default function LoyaltyProgram({ customerId }: LoyaltyProgramProps) {
  const [customerData, setCustomerData] = useState<Customer | null>(null)
  const [searchCustomer, setSearchCustomer] = useState("")
  const [rewards, setRewards] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRewards()
    if (customerId) {
      fetchCustomerLoyalty(customerId)
    }
  }, [customerId])

  const fetchCustomerLoyalty = async (id: string) => {
    try {
      const response = await fetch(`/api/loyalty/points?customerId=${id}`)
      const data = await response.json()
      setCustomerData(data)
    } catch (error) {
      console.error("Error fetching customer loyalty:", error)
    }
  }

  const fetchRewards = async () => {
    try {
      const response = await fetch("/api/loyalty/rewards")
      const data = await response.json()
      setRewards(data)
    } catch (error) {
      console.error("Error fetching rewards:", error)
    }
  }

  const searchCustomerByPhone = async () => {
    if (!searchCustomer) return

    setLoading(true)
    try {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchCustomer)}`)
      const customers = await response.json()
      if (customers.length > 0) {
        fetchCustomerLoyalty(customers[0].id)
      }
    } catch (error) {
      console.error("Error searching customer:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTierInfo = (points: number) => {
    if (points >= 2500) return { name: "Platinum", color: "bg-purple-100 text-purple-800", multiplier: "2x" }
    if (points >= 1000) return { name: "Gold", color: "bg-yellow-100 text-yellow-800", multiplier: "1.5x" }
    if (points >= 500) return { name: "Silver", color: "bg-gray-100 text-gray-800", multiplier: "1.2x" }
    return { name: "Bronze", color: "bg-orange-100 text-orange-800", multiplier: "1x" }
  }

  const currentPoints = customerData?.currentPoints ?? customerData?.loyaltyPoints ?? 0

  const redeemReward = async (rewardId: string, pointsRequired: number) => {
    if (!customerData || currentPoints < pointsRequired) return

    try {
      const response = await fetch("/api/loyalty/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId,
          points: pointsRequired,
          transactionType: "redeem",
          description: "Reward redemption",
        }),
      })

      if (response.ok) {
        fetchCustomerLoyalty(customerId!)
      }
    } catch (error) {
      console.error("Error redeeming reward:", error)
    }
  }

  return (
    <div className="space-y-6">
      {!customerId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Search by phone or email..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
              />
              <Button onClick={searchCustomerByPhone} disabled={loading}>
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {customerData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Loyalty Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold">{currentPoints}</p>
                    <p className="text-sm text-gray-500">Available Points</p>
                  </div>
                  <Badge className={getTierInfo(currentPoints).color}>
                    <Award className="h-3 w-3 mr-1" />
                    {getTierInfo(currentPoints).name}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Points Multiplier:</span>
                    <span className="font-medium">{getTierInfo(currentPoints).multiplier}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((currentPoints % 500) / 5, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {500 - (currentPoints % 500)} points to next tier
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Available Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rewards.map((reward) => (
                  <div key={reward.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <h4 className="font-medium">{reward.name}</h4>
                      <p className="text-sm text-gray-500">{reward.description}</p>
                      <p className="text-sm font-medium text-blue-600">{reward.pointsRequired} points</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={currentPoints < reward.pointsRequired}
                      onClick={() => redeemReward(reward.id, reward.pointsRequired)}
                    >
                      Redeem
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {customerData.transactions?.slice(0, 5).map((transaction: any) => (
                  <div key={transaction.id} className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="text-sm font-medium capitalize">{transaction.transactionType}</p>
                      <p className="text-xs text-gray-500">{transaction.description}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${transaction.transactionType === "earn" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.transactionType === "earn" ? "+" : "-"}
                        {transaction.points}
                      </p>
                      <p className="text-xs text-gray-500">{formatDisplayDate(transaction.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
