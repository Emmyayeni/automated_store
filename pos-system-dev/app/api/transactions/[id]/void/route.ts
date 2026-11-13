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

    const { reason } = body;

    // Validate transaction ID
    if (!transactionId) {
      const validationErrors = [{
        field: "id",
        message: VALIDATION_MESSAGES.REQUIRED("Transaction ID"),
        value: transactionId
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Get original transaction details
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundError("Transaction", context);
    }

    if (transaction.status === "void") {
      throw new BusinessLogicError("Transaction is already voided", context);
    }

    // Update transaction status to voided
    const [voidedTransaction] = await db
      .update(transactions)
      .set({ 
        status: "void",
        notes: `Voided by ${validation.user.name || validation.user.email}. Reason: ${reason || 'No reason provided'}`,
      })
      .where(eq(transactions.id, transactionId))
      .returning();

    // Get transaction items to restore inventory
    const items = await db
      .select()
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, transactionId));

    // Restore inventory with proper logging
    const restoredItems = [];
    for (const item of items) {
      try {
        await adjustInventoryWithLog({
          locationId: transaction.locationId,
          productId: item.productId,
          adjustmentType: 'return',
          adjustmentQuantity: item.quantity, // Positive for restoration
          reason: `Transaction Void - ${reason || 'No reason provided'}`,
          adjustedBy: validation.user.id,
          referenceId: transaction.id,
          referenceType: 'void',
          notes: `Restocked ${item.quantity} units from voided transaction ${transaction.transactionNumber}`,
        });
        
        restoredItems.push({
          productId: item.productId,
          quantity: item.quantity,
          restored: true
        });
      } catch (error) {
        console.error(`Error adjusting inventory for product ${item.productId} during void:`, error);
        restoredItems.push({
          productId: item.productId,
          quantity: item.quantity,
          restored: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const responseData = {
      transaction: {
        id: voidedTransaction.id,
        transactionNumber: voidedTransaction.transactionNumber,
        status: voidedTransaction.status,
        notes: voidedTransaction.notes,
      },
      restoredItems,
      message: "Transaction voided successfully",
      voidedBy: validation.user.name || validation.user.email,
      voidedAt: new Date().toISOString()
    };

    return NextResponse.json(createSuccessResponse(responseData));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}