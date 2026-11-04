import { NextRequest, NextResponse } from "next/server";

// POST /api/printer/thermal - Send data to thermal printer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, printerName } = body;

    if (!type || !data) {
      return NextResponse.json({ error: "Type and data are required" }, { status: 400 });
    }

    // Format receipt based on type
    let receiptContent = "";
    
    if (type === "shift_summary") {
      receiptContent = formatShiftSummaryReceipt(data);
    } else if (type === "transaction") {
      receiptContent = formatTransactionReceipt(data);
    } else {
      return NextResponse.json({ error: "Invalid receipt type" }, { status: 400 });
    }

    // In a real implementation, you would send to an actual thermal printer
    // For now, we'll return the formatted content and success status
    
    // Simulate printing success/failure
    const printSuccess = Math.random() > 0.1; // 90% success rate
    
    if (printSuccess) {
      return NextResponse.json({ 
        success: true, 
        message: "Receipt printed successfully",
        content: receiptContent 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Printer communication error" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Printer error:", error);
    return NextResponse.json({ error: "Failed to print receipt" }, { status: 500 });
  }
}

function formatShiftSummaryReceipt(data: any): string {
  const { shift, summary, paymentBreakdown, topProducts } = data;
  
  let receipt = `
================================
        SHIFT SUMMARY
================================
Cashier: ${shift.userName}
Location: ${shift.locationName}
Shift Start: ${new Date(shift.openedAt).toLocaleString()}
Shift End: ${shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'OPEN'}
Duration: ${calculateDuration(shift.openedAt, shift.closedAt)}

================================
        SALES SUMMARY
================================
Total Transactions: ${summary.totalTransactions}
Gross Sales: $${summary.totalSales.toFixed(2)}
Tax Collected: $${summary.totalTax.toFixed(2)}
Discounts Given: $${summary.totalDiscount.toFixed(2)}
Net Sales: $${(summary.totalSales - summary.totalDiscount).toFixed(2)}

================================
      PAYMENT BREAKDOWN
================================`;

  paymentBreakdown.forEach((payment: any) => {
    receipt += `\n${payment.paymentMethod.toUpperCase()}: ${payment.count} transactions - $${payment.total.toFixed(2)}`;
  });

  if (summary.cashVariance !== null) {
    receipt += `\n\n================================
        CASH RECONCILIATION
================================
Opening Cash: $${shift.openingCash?.toFixed(2) || '0.00'}
Closing Cash: $${shift.closingCash?.toFixed(2) || '0.00'}
Cash Variance: $${summary.cashVariance.toFixed(2)}
Status: ${Math.abs(summary.cashVariance) < 0.01 ? 'BALANCED' : 'VARIANCE DETECTED'}`;
  }

  receipt += `\n\n================================
        TOP PRODUCTS
================================`;

  topProducts.slice(0, 5).forEach((product: any, index: number) => {
    receipt += `\n${index + 1}. ${product.productName}`;
    receipt += `\n   Qty: ${product.quantitySold} | Revenue: $${product.revenue.toFixed(2)}`;
  });

  receipt += `\n\n================================
Generated: ${new Date().toLocaleString()}
System: Hardy POS
================================\n\n\n`;

  return receipt;
}

function formatTransactionReceipt(data: any): string {
  let receipt = `
================================
        TRANSACTION RECEIPT
================================
Transaction #: ${data.transactionNumber}
Date: ${data.date}
Cashier: ${data.cashierName}

================================
           ITEMS
================================`;

  data.items.forEach((item: any) => {
    receipt += `\n${item.name}`;
    receipt += `\n  ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`;
  });

  receipt += `\n\n================================
Subtotal: $${data.subtotal.toFixed(2)}
Tax: $${data.taxAmount.toFixed(2)}
Total: $${data.totalAmount.toFixed(2)}
Payment: ${data.paymentMethod.toUpperCase()}
================================\n\n\n`;

  return receipt;
}

function calculateDuration(start: string, end: string | null): string {
  const startTime = new Date(start);
  const endTime = end ? new Date(end) : new Date();
  const diffMs = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
