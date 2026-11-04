import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { exportJobs } from "@/lib/export-jobs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    const job = exportJobs.get(jobId)

    if (!job) {
      return NextResponse.json({ error: "Export job not found" }, { status: 404 })
    }

    // Return job status without sensitive internal data
    const publicJobData = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      recordCount: job.recordCount,
      fileSize: job.fileSize,
      downloadUrl: job.downloadUrl,
      fileName: job.fileName,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }

    return NextResponse.json(publicJobData)

  } catch (error) {
    console.error("Error fetching export status:", error)
    return NextResponse.json(
      { error: "Failed to fetch export status" },
      { status: 500 }
    )
  }
}