"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { 
  Download, 
  FileText, 
  Table, 
  FileSpreadsheet, 
  Calendar,
  Filter,
  Settings,
  CheckCircle,
  Clock,
  Database,
  Mail
} from "lucide-react"
import { formatDisplayDateTime } from "@/lib/standards/formatting"

interface ExportDashboardProps {
  businessId: string
  locations: Array<{
    id: string
    name: string
  }>
}

interface ExportTemplate {
  id: string
  name: string
  description: string
  type: 'csv' | 'excel' | 'pdf'
  category: string
  fields: string[]
  filters: Record<string, any>
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    recipients: string[]
  }
}

interface ExportJob {
  id: string
  templateName: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  createdAt: string
  downloadUrl?: string
  fileSize?: number
  recordCount?: number
  error?: string
}

export default function ExportDashboard({ businessId, locations }: ExportDashboardProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("quick")
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Predefined export templates
  const templates: ExportTemplate[] = [
    {
      id: "daily-sales",
      name: "Daily Sales Summary",
      description: "Complete daily sales data with transactions, payments, and staff performance",
      type: "excel",
      category: "Sales",
      fields: ["date", "location", "staff", "transactions", "revenue", "payment_methods", "discounts"],
      filters: { dateRange: "today" }
    },
    {
      id: "shift-variances",
      name: "Cash Variance Report",
      description: "Detailed cash variance analysis for accounting reconciliation",
      type: "csv",
      category: "Finance",
      fields: ["shift_id", "staff", "location", "expected_cash", "actual_cash", "variance", "notes"],
      filters: { hasVariance: true }
    },
    {
      id: "inventory-movement",
      name: "Inventory Movement",
      description: "Product sales, stock adjustments, and inventory changes",
      type: "excel",
      category: "Inventory",
      fields: ["product", "sku", "location", "opening_stock", "sold", "adjustments", "closing_stock"],
      filters: { includeZeroMovement: false }
    },
    {
      id: "tax-report",
      name: "Tax Summary",
      description: "GST/VAT calculations and tax liability summary",
      type: "pdf",
      category: "Compliance",
      fields: ["date", "location", "gross_sales", "tax_exempt", "gst_amount", "total_tax"],
      filters: { groupByTaxRate: true }
    },
    {
      id: "staff-performance",
      name: "Staff Performance Analytics",
      description: "Individual and team performance metrics for HR review",
      type: "excel",
      category: "HR",
      fields: ["staff_name", "shifts_worked", "avg_transaction_value", "efficiency_score", "customer_satisfaction"],
      filters: { includeRatings: true }
    }
  ]

  const quickExportOptions = [
    { id: "today-sales", name: "Today's Sales", icon: Calendar, type: "csv" },
    { id: "current-shift", name: "Current Shift Data", icon: Clock, type: "excel" },
    { id: "weekly-summary", name: "Weekly Summary", icon: Table, type: "pdf" },
    { id: "inventory-snapshot", name: "Inventory Snapshot", icon: Database, type: "excel" }
  ]

  const handleQuickExport = async (exportId: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/exports/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          exportType: exportId,
          locations: locations.map(l => l.id)
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Add to export jobs
        const newJob: ExportJob = {
          id: result.jobId,
          templateName: quickExportOptions.find(opt => opt.id === exportId)?.name || exportId,
          status: "processing",
          progress: 0,
          createdAt: new Date().toISOString()
        }
        
        setExportJobs(prev => [newJob, ...prev])
        
        // Start polling for job status
        pollJobStatus(result.jobId)
        
        toast({
          title: "Export Started",
          description: "Your export is being processed. You'll be notified when it's ready."
        })
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error starting the export. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateExport = async (template: ExportTemplate, customFilters?: Record<string, any>) => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/exports/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          templateId: template.id,
          filters: { ...template.filters, ...customFilters },
          locations: locations.map(l => l.id)
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        const newJob: ExportJob = {
          id: result.jobId,
          templateName: template.name,
          status: "processing",
          progress: 0,
          createdAt: new Date().toISOString()
        }
        
        setExportJobs(prev => [newJob, ...prev])
        pollJobStatus(result.jobId)
        
        toast({
          title: "Export Started",
          description: `${template.name} export is being processed.`
        })
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error processing the export template.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/admin/exports/status/${jobId}`)
        if (response.ok) {
          const jobStatus = await response.json()
          
          setExportJobs(prev => prev.map(job => 
            job.id === jobId ? { ...job, ...jobStatus } : job
          ))
          
          if (jobStatus.status === 'completed') {
            toast({
              title: "Export Ready",
              description: "Your export has been completed and is ready for download."
            })
          } else if (jobStatus.status === 'failed') {
            toast({
              title: "Export Failed",
              description: jobStatus.error || "The export could not be completed.",
              variant: "destructive"
            })
          } else if (jobStatus.status === 'processing') {
            // Continue polling
            setTimeout(checkStatus, 2000)
          }
        }
      } catch (error) {
        console.error("Error checking export status:", error)
      }
    }
    
    checkStatus()
  }

  const downloadExport = async (job: ExportJob) => {
    if (!job.downloadUrl) return
    
    try {
      const response = await fetch(job.downloadUrl)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${job.templateName}_${new Date().toISOString().split('T')[0]}.${getFileExtension(job.downloadUrl)}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error downloading the file.",
        variant: "destructive"
      })
    }
  }

  const getFileExtension = (url: string) => {
    const extension = url.split('.').pop()
    return extension || 'csv'
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${Number(mb.toFixed(2))} MB`
  }

  const getStatusBadge = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick">Quick Export</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="history">Export History</TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Data Exports</CardTitle>
              <p className="text-sm text-muted-foreground">
                One-click exports for common data needs
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickExportOptions.map((option) => (
                  <Card key={option.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <option.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <h3 className="font-medium mb-1">{option.name}</h3>
                      <Badge variant="outline" className="mb-3">{option.type.toUpperCase()}</Badge>
                      <Button 
                        onClick={() => handleQuickExport(option.id)}
                        disabled={loading}
                        className="w-full"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Export Templates</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pre-configured exports for specific business needs
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{template.category}</Badge>
                          <Badge variant="secondary">{template.type.toUpperCase()}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.fields.slice(0, 4).map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field.replace('_', ' ')}
                          </Badge>
                        ))}
                        {template.fields.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.fields.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Template Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configure Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">{selectedTemplate.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {selectedTemplate.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>Date Range</Label>
                        <Select defaultValue="last-7-days">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                            <SelectItem value="this-month">This Month</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Locations</Label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Locations</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Additional Options</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="include-void" />
                            <Label htmlFor="include-void" className="text-sm">Include voided transactions</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="detailed-breakdown" />
                            <Label htmlFor="detailed-breakdown" className="text-sm">Detailed breakdown</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="include-notes" />
                            <Label htmlFor="include-notes" className="text-sm">Include notes and comments</Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleTemplateExport(selectedTemplate)}
                      disabled={loading}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Generate Export
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a template to configure and export</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Exports
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Automated exports sent to your team on a regular schedule
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Scheduled Exports Coming Soon</h3>
                <p className="mb-4">
                  Automatically generate and email reports on a daily, weekly, or monthly basis.
                </p>
                <Button variant="outline">
                  Request Early Access
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track and download previous exports
              </p>
            </CardHeader>
            <CardContent>
              {exportJobs.length > 0 ? (
                <div className="space-y-4">
                  {exportJobs.map((job) => (
                    <div key={job.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{job.templateName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDisplayDateTime(job.createdAt)}
                          </p>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>

                      {job.status === 'processing' && (
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span>Processing...</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>
                      )}

                      {job.status === 'completed' && (
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            {job.recordCount && `${new Intl.NumberFormat('en-SL').format(job.recordCount)} records`} •{' '}
                            {formatFileSize(job.fileSize)}
                          </div>
                          <Button 
                            onClick={() => downloadExport(job)}
                            size="sm"
                            variant="outline"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      )}

                      {job.status === 'failed' && job.error && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {job.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Export History</h3>
                  <p>Your export history will appear here once you generate reports.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}