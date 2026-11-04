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

    if (job.status !== "completed") {
      return NextResponse.json({ error: "Export not ready for download" }, { status: 400 })
    }

    // Generate mock file content based on export type
    let content = ""
    let contentType = "text/csv"
    let fileExtension = "csv"

    if (job.fileName?.endsWith('.xlsx')) {
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      fileExtension = "xlsx"
      content = "Mock Excel file content" // In real implementation, generate actual Excel file
    } else if (job.fileName?.endsWith('.pdf')) {
      contentType = "application/pdf"
      fileExtension = "pdf"
      content = "Mock PDF file content" // In real implementation, generate actual PDF file
    } else {
      // CSV format
      content = generateMockCSVContent(job.exportType, job.recordCount || 100)
    }

    const fileName = job.fileName || `export_${jobId}.${fileExtension}`

    // Set appropriate headers for file download
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`)
    headers.set('Content-Length', content.length.toString())

    return new Response(content, { headers })

  } catch (error) {
    console.error("Error downloading export:", error)
    return NextResponse.json(
      { error: "Failed to download export" },
      { status: 500 }
    )
  }
}

function generateMockCSVContent(exportType: string, recordCount: number): string {
  let headers = ""
  let rows = ""

  switch (exportType) {
    case "today-sales":
      headers = "Transaction ID,Date,Time,Staff,Location,Total,Payment Method,Items"
      for (let i = 1; i <= recordCount; i++) {
        const transactionId = `TXN${String(i).padStart(6, '0')}`
        const date = new Date().toISOString().split('T')[0]
        const time = `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
        const staff = `Staff ${Math.floor(Math.random() * 10) + 1}`
        const location = `Location ${Math.floor(Math.random() * 3) + 1}`
        const total = (Math.random() * 100 + 10).toFixed(2)
        const paymentMethod = Math.random() > 0.5 ? "Cash" : "Card"
        const items = Math.floor(Math.random() * 5) + 1
        
        rows += `\n${transactionId},${date},${time},${staff},${location},${total},${paymentMethod},${items}`
      }
      break

    case "current-shift":
      headers = "Shift ID,Staff,Location,Start Time,End Time,Sales,Transactions,Cash Variance"
      for (let i = 1; i <= recordCount; i++) {
        const shiftId = `SHF${String(i).padStart(6, '0')}`
        const staff = `Staff ${Math.floor(Math.random() * 10) + 1}`
        const location = `Location ${Math.floor(Math.random() * 3) + 1}`
        const startTime = new Date().toISOString()
        const endTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        const sales = (Math.random() * 1000 + 100).toFixed(2)
        const transactions = Math.floor(Math.random() * 50) + 10
        const variance = (Math.random() * 20 - 10).toFixed(2)
        
        rows += `\n${shiftId},${staff},${location},${startTime},${endTime},${sales},${transactions},${variance}`
      }
      break

    case "inventory-snapshot":
      headers = "SKU,Product Name,Location,Current Stock,Unit Price,Total Value,Last Updated"
      for (let i = 1; i <= recordCount; i++) {
        const sku = `SKU${String(i).padStart(6, '0')}`
        const productName = `Product ${i}`
        const location = `Location ${Math.floor(Math.random() * 3) + 1}`
        const stock = Math.floor(Math.random() * 200)
        const unitPrice = (Math.random() * 50 + 5).toFixed(2)
        const totalValue = (stock * parseFloat(unitPrice)).toFixed(2)
        const lastUpdated = new Date().toISOString().split('T')[0]
        
        rows += `\n${sku},"${productName}",${location},${stock},${unitPrice},${totalValue},${lastUpdated}`
      }
      break

    default:
      headers = "ID,Date,Description,Amount"
      for (let i = 1; i <= recordCount; i++) {
        const id = i
        const date = new Date().toISOString().split('T')[0]
        const description = `Record ${i}`
        const amount = (Math.random() * 100).toFixed(2)
        
        rows += `\n${id},${date},"${description}",${amount}`
      }
  }

  return headers + rows
}