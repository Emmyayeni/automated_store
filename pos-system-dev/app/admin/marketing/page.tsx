"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Mail, Plus, Send, CalendarIcon, Users, Eye, BarChart3 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Campaign {
  id: string
  name: string
  subject: string
  segment: string
  status: "draft" | "scheduled" | "sent"
  scheduledDate?: Date
  sentDate?: Date
  recipients: number
  openRate: number
  clickRate: number
}

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    name: "Spring Sale 2024",
    subject: "🌸 Spring Sale - 20% Off Everything!",
    segment: "frequent",
    status: "sent",
    sentDate: new Date("2024-03-01"),
    recipients: 245,
    openRate: 32.5,
    clickRate: 8.2,
  },
  {
    id: "2",
    name: "New Product Launch",
    subject: "Introducing Our New Coffee Blend",
    segment: "all",
    status: "scheduled",
    scheduledDate: new Date("2024-03-15"),
    recipients: 1234,
    openRate: 0,
    clickRate: 0,
  },
  {
    id: "3",
    name: "Win-Back Campaign",
    subject: "We Miss You! Come Back for 15% Off",
    segment: "inactive",
    status: "draft",
    recipients: 89,
    openRate: 0,
    clickRate: 0,
  },
]

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    subject: "",
    content: "",
    segment: "",
    scheduledDate: undefined as Date | undefined,
  })

  const handleCreateCampaign = () => {
    const campaign: Campaign = {
      id: Date.now().toString(),
      name: newCampaign.name,
      subject: newCampaign.subject,
      segment: newCampaign.segment,
      status: newCampaign.scheduledDate ? "scheduled" : "draft",
      scheduledDate: newCampaign.scheduledDate,
      recipients: getRecipientCount(newCampaign.segment),
      openRate: 0,
      clickRate: 0,
    }
    setCampaigns([...campaigns, campaign])
    setNewCampaign({
      name: "",
      subject: "",
      content: "",
      segment: "",
      scheduledDate: undefined,
    })
    setIsCreateDialogOpen(false)
    toast.success("Campaign created successfully!")
  }

  const getRecipientCount = (segment: string) => {
    const counts = {
      all: 1234,
      frequent: 245,
      regular: 567,
      inactive: 89,
    }
    return counts[segment as keyof typeof counts] || 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "default"
      case "scheduled":
        return "secondary"
      case "draft":
        return "outline"
      default:
        return "outline"
    }
  }

  const totalCampaigns = campaigns.length
  const sentCampaigns = campaigns.filter((c) => c.status === "sent").length
  const avgOpenRate =
    campaigns.filter((c) => c.status === "sent").reduce((sum, c) => sum + c.openRate, 0) / sentCampaigns || 0
  const avgClickRate =
    campaigns.filter((c) => c.status === "sent").reduce((sum, c) => sum + c.clickRate, 0) / sentCampaigns || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Campaigns</h1>
          <p className="text-muted-foreground">Create and manage email marketing campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
              <DialogDescription>Design and schedule your marketing campaign.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Spring Sale 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  placeholder="🌸 Spring Sale - 20% Off Everything!"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment">Target Segment</Label>
                <Select
                  value={newCampaign.segment}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, segment: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers (1,234)</SelectItem>
                    <SelectItem value="frequent">Frequent Customers (245)</SelectItem>
                    <SelectItem value="regular">Regular Customers (567)</SelectItem>
                    <SelectItem value="inactive">Inactive Customers (89)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Email Content</Label>
                <Textarea
                  id="content"
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                  placeholder="Write your email content here..."
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Schedule (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newCampaign.scheduledDate ? format(newCampaign.scheduledDate, "PPP") : "Send immediately"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newCampaign.scheduledDate}
                      onSelect={(date) => setNewCampaign({ ...newCampaign, scheduledDate: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>Create Campaign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Marketing Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">{sentCampaigns} sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Email opens</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgClickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Link clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.recipients, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Emails sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>Manage your email marketing campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Open Rate</TableHead>
                <TableHead>Click Rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground">{campaign.subject}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {campaign.segment}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.recipients.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(campaign.status)}>{campaign.status}</Badge>
                  </TableCell>
                  <TableCell>{campaign.status === "sent" ? `${campaign.openRate}%` : "-"}</TableCell>
                  <TableCell>{campaign.status === "sent" ? `${campaign.clickRate}%` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {campaign.status === "draft" && (
                        <Button size="sm" variant="outline">
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <Eye className="h-3 w-3" />
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
