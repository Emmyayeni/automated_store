import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, transactionItems, products } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { adjustInventoryWithLog } from "@/lib/inventory-utils";
import { 
  createSuccessResponse, 
  createValidationErrorResponse,
  createNotFoundResponse 
} from "@/lib/standards/api-responses";
import { 
  handleApiError, 
  createErrorContext, 
  ValidationError,
  BusinessLogicError,
  NotFoundError 
} from "@/lib/standards/error-handling";
import { 
  validateSession, 
  createAuthenticationErrorResponse 
} from "@/lib/standards/auth-patterns";
import { VALIDATION_MESSAGES } from "@/lib/constants/validation-messages";
import { formatPrice } from "@/lib/price-utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: transactionId } = await params;
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    
    if (!body) {
      throw new ValidationError("Invalid JSON in request body", "body");
    }

    const { reason, refundAmount } = body;

    // Validate required fields
    const validationErrors = [];
    
    if (!transactionId) {
      validationErrors.push({
        field: "id",
        message: VALIDATION_MESSAGES.REQUIRED("Transaction ID"),
        value: transactionId
      });
    }
    
    if (!refundAmount || refundAmount <= 0) {
      validationErrors.push({
        field: "refundAmount",
        message: VALIDATION_MESSAGES.POSITIVE_NUMBER("Refund amount"),
        value: refundAmount
      });
    }

    if (validationErrors.length > 0) {
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Get original transaction
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundError("Transaction", context);
    }

    // Validate refund amount doesn't exceed original total
    const originalTotal = typeof transaction.total === "string" ? parseFloat(transaction.total) : transaction.total;
    if (refundAmount > originalTotal) {
      throw new BusinessLogicError("Refund amount cannot exceed original transaction total", context);
    }

    // Create refund transaction
    const refundTransactionNumber = `REF-${Date.now()}`;
    const refundTaxAmount = refundAmount * 0.08; // Calculate proportional tax
    
    const [refund] = await db
      .insert(transactions)
      .values({
        transactionNumber: refundTransactionNumber,
        locationId: transaction.locationId,
        cashierId: validation.user.id,
        customerId: transaction.customerId,
        subtotal: (-Math.abs(refundAmount - refundTaxAmount)).toString(),
        taxAmount: (-Math.abs(refundTaxAmount)).toString(),
        total: (-Math.abs(refundAmount)).toString(),
        paymentMethod: transaction.paymentMethod,
        status: "refunded",
        notes: `Refund for transaction ${transaction.transactionNumber}. Reason: ${reason || 'No reason provided'}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Get original transaction items to restore inventory
    const items = await db
      .select()
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, transactionId));

    // Restore inventory for refunded items with proper logging
    const restoredItems = [];
    for (const item of items) {
      try {
        await adjustInventoryWithLog({
          locationId: transaction.locationId,
          productId: item.productId,
          adjustmentType: 'return',
          adjustmentQuantity: item.quantity, // Positive for return
          reason: `Refund - ${reason || 'No reason provided'}`,
          adjustedBy: validation.user.id,
          referenceId: refund.id,
          referenceType: 'refund',
          notes: `Restocked ${item.quantity} units from refund of transaction ${transaction.transactionNumber}`,
        });
        
        restoredItems.push({
          productId: item.productId,
          quantity: item.quantity,
          restored: true
        });
      } catch (error) {
        console.error(`Error adjusting inventory for product ${item.productId} during refund:`, error);
        restoredItems.push({
          productId: item.productId,
          quantity: item.quantity,
          restored: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Mark original transaction as refunded
    await db
      .update(transactions)
      .set({ 
        status: "refunded",
        updatedAt: new Date()
      })
      .where(eq(transactions.id, params.id));

    const responseData = {
      refund: {
        id: refund.id,
        transactionNumber: refund.transactionNumber,
        refundAmount: formatPrice(refundAmount),
        subtotal: formatPrice(Math.abs(refundAmount - refundTaxAmount)),
        taxAmount: formatPrice(refundTaxAmount),
        total: formatPrice(refundAmount),
        paymentMethod: refund.paymentMethod,
        status: refund.status,
        notes: refund.notes,
        createdAt: refund.createdAt,
      },
      originalTransaction: {
        id: transaction.id,
        transactionNumber: transaction.transactionNumber,
        status: "refunded"
      },
      restoredItems,
      message: "Refund processed successfully",
      processedBy: validation.user.name || validation.user.email,
      processedAt: new Date().toISOString()
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 201 });

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}