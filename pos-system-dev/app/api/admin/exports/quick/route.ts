import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { exportJobs } from "@/lib/export-jobs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can generate exports
    const userRole = (session.user as any).role
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, exportType, locations } = body

    if (!businessId || !exportType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate unique job ID
    const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create export job
    const exportJob = {
      id: jobId,
      businessId,
      exportType,
      locations: locations || [],
      status: "pending",
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    exportJobs.set(jobId, exportJob)

    // Simulate async processing
    setTimeout(() => {
      processQuickExport(jobId, exportType)
    }, 1000)

    return NextResponse.json({ 
      jobId,
      status: "pending",
      message: "Export job created successfully"
    })

  } catch (error) {
    console.error("Error creating quick export:", error)
    return NextResponse.json(
      { error: "Failed to create export" },
      { status: 500 }
    )
  }
}

async function processQuickExport(jobId: string, exportType: string) {
  const job = exportJobs.get(jobId)
  if (!job) return

  try {
    // Update job status to processing
    job.status = "processing"
    job.progress = 10
    job.updatedAt = new Date().toISOString()
    exportJobs.set(jobId, job)

    // Simulate data processing based on export type
    let recordCount = 0
    let fileSize = 0
    let fileName = ""

    switch (exportType) {
      case "today-sales":
        recordCount = Math.floor(Math.random() * 500) + 100
        fileSize = recordCount * 150 // Approximate bytes per record
        fileName = `today_sales_${new Date().toISOString().split('T')[0]}.csv`
        break

      case "current-shift":
        recordCount = Math.floor(Math.random() * 50) + 10
        fileSize = recordCount * 300
        fileName = `current_shift_${new Date().toISOString().split('T')[0]}.xlsx`
        break

      case "weekly-summary":
        recordCount = Math.floor(Math.random() * 200) + 50
        fileSize = recordCount * 400
        fileName = `weekly_summary_${new Date().toISOString().split('T')[0]}.pdf`
        break

      case "inventory-snapshot":
        recordCount = Math.floor(Math.random() * 1000) + 200
        fileSize = recordCount * 200
        fileName = `inventory_snapshot_${new Date().toISOString().split('T')[0]}.xlsx`
        break

      default:
        recordCount = 100
        fileSize = 20000
        fileName = `export_${new Date().toISOString().split('T')[0]}.csv`
    }

    // Simulate processing time with progress updates
    const progressSteps = [25, 50, 75, 90, 100]
    for (const progress of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 500))
      job.progress = progress
      job.updatedAt = new Date().toISOString()
      exportJobs.set(jobId, job)
    }

    // Complete the job
    job.status = "completed"
    job.progress = 100
    job.recordCount = recordCount
    job.fileSize = fileSize
    job.downloadUrl = `/api/admin/exports/download/${jobId}`
    job.fileName = fileName
    job.updatedAt = new Date().toISOString()
    exportJobs.set(jobId, job)

  } catch (error) {
    console.error("Error processing export:", error)
    job.status = "failed"
    job.error = "Processing failed due to an internal error"
    job.updatedAt = new Date().toISOString()
    exportJobs.set(jobId, job)
  }
}