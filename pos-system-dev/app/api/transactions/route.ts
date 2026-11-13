import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, transactionItems, products, inventory, stockMovements } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
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

// POST: Create transaction
export async function POST(request: NextRequest) {
  try {
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

    const { customerId, userId, locationId, items, paymentMethod, taxRate = 0.08 } = body;

    // Validate required fields
    const validationErrors = [];
    
    if (!userId) {
      validationErrors.push({
        field: "userId",
        message: VALIDATION_MESSAGES.REQUIRED("User ID"),
        value: userId
      });
    }
    
    if (!locationId) {
      validationErrors.push({
        field: "locationId",
        message: VALIDATION_MESSAGES.REQUIRED("Location ID"),
        value: locationId
      });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      validationErrors.push({
        field: "items",
        message: "At least one item is required",
        value: items
      });
    }
    
    if (!paymentMethod) {
      validationErrors.push({
        field: "paymentMethod",
        message: VALIDATION_MESSAGES.REQUIRED("Payment method"),
        value: paymentMethod
      });
    }

    // Validate items structure
    if (items && Array.isArray(items)) {
      items.forEach((item, index) => {
        if (!item.productId) {
          validationErrors.push({
            field: `items[${index}].productId`,
            message: VALIDATION_MESSAGES.REQUIRED("Product ID"),
            value: item.productId
          });
        }
        if (!item.quantity || item.quantity <= 0) {
          validationErrors.push({
            field: `items[${index}].quantity`,
            message: VALIDATION_MESSAGES.POSITIVE_NUMBER("Quantity"),
            value: item.quantity
          });
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          validationErrors.push({
            field: `items[${index}].unitPrice`,
            message: VALIDATION_MESSAGES.POSITIVE_NUMBER("Unit price"),
            value: item.unitPrice
          });
        }
      });
    }

    if (validationErrors.length > 0) {
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // BR-06: Strict stock verification before checkout — Cashier cannot sell more stock than branch holds
    for (const item of items) {
      const [invRecord] = await db
        .select({
          quantity: inventory.quantity,
          productName: products.name,
        })
        .from(inventory)
        .leftJoin(products, eq(inventory.productId, products.id))
        .where(
          and(
            eq(inventory.locationId, locationId),
            eq(inventory.productId, item.productId)
          )
        );

      const availableQty = invRecord?.quantity ?? 0;
      if (availableQty < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for product "${invRecord?.productName || item.productId}". Available: ${availableQty}, requested: ${item.quantity}. Sale cannot proceed.`,
            code: "INSUFFICIENT_STOCK",
            availableQuantity: availableQty,
            requestedQuantity: item.quantity,
          },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Generate transaction number
    const transactionNumber = `TXN-${Date.now()}`;

    // Prepare transaction values according to schema
    const transactionValues: any = {
      transactionNumber,
      locationId,
      cashierId: userId,
      customerId: customerId || null,
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      total: totalAmount.toString(),
      paymentMethod,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [transaction] = await db
      .insert(transactions)
      .values(transactionValues)
      .returning();

    const transactionId = transaction.id;

    // Insert transaction items and update inventory with proper logging
    const processedItems = [];
    for (const item of items) {
      const [transactionItem] = await db.insert(transactionItems).values({
        transactionId: transactionId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        lineTotal: (item.unitPrice * item.quantity).toString(),
      }).returning();

      processedItems.push({
        id: transactionItem.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: formatPrice(item.unitPrice),
        lineTotal: formatPrice(item.unitPrice * item.quantity),
      });

      // Update inventory with proper logging
      try {
        await adjustInventoryWithLog({
          locationId,
          productId: item.productId,
          adjustmentType: 'sale',
          adjustmentQuantity: -item.quantity, // Negative for sale
          reason: `Sale - Transaction ${transactionNumber}`,
          adjustedBy: userId,
          referenceId: transactionId,
          referenceType: 'transaction',
          notes: `Sold ${item.quantity} units via POS`,
        });

        // Record into central stock movements ledger for multi-branch reporting
        const [currentInv] = await db
          .select({ quantity: inventory.quantity })
          .from(inventory)
          .where(and(eq(inventory.locationId, locationId), eq(inventory.productId, item.productId)));

        const newQty = currentInv?.quantity ?? 0;
        await db.insert(stockMovements).values({
          productId: item.productId,
          locationId,
          movementType: 'STOCK_OUT',
          reason: 'SALE',
          quantity: item.quantity,
          balanceBefore: newQty + item.quantity,
          balanceAfter: newQty,
          reference: transactionNumber,
          notes: `POS sale #${transactionNumber}`,
          userId,
        });
      } catch (error) {
        console.error(`Error adjusting inventory for product ${item.productId}:`, error);
        // Continue with other items but log the error
      }
    }

    const responseData = {
      transaction: {
        id: transactionId,
        transactionNumber,
        subtotal: formatPrice(subtotal),
        taxAmount: formatPrice(taxAmount),
        total: formatPrice(totalAmount),
        paymentMethod,
        status: transaction.status || 'completed',
        createdAt: transaction.createdAt,
      },
      items: processedItems,
      message: "Transaction created successfully"
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 201 });

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// GET: Get transactions by user (cashier)
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Use standardized session validation
    const validation = await validateSession();
    
    if (!validation.isValid || !validation.user) {
      const errorResponse = createAuthenticationErrorResponse(validation);
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      const validationErrors = [{
        field: "userId",
        message: VALIDATION_MESSAGES.REQUIRED("User ID"),
        value: userId
      }];
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Get transactions for this cashier, most recent first
    const txns = await db
      .select({
        id: transactions.id,
        transactionNumber: transactions.transactionNumber,
        createdAt: transactions.createdAt,
        total: transactions.total,
        paymentMethod: transactions.paymentMethod,
        status: transactions.status,
      })
      .from(transactions)
      .where(eq(transactions.cashierId, userId))
      .orderBy(transactions.createdAt);

    // For each transaction, get item count and format date/time
    const results = await Promise.all(
      txns.map(async (txn) => {
        // Get item count
        const items = await db
          .select({ count: transactionItems.quantity })
          .from(transactionItems)
          .where(eq(transactionItems.transactionId, txn.id));

        // Format date/time using standardized formatting
        const { formatDisplayDate, formatDisplayDateTime } = await import("@/lib/standards/formatting");
        
        const dateObj = txn.createdAt instanceof Date
          ? txn.createdAt
          : new Date(txn.createdAt as unknown as string);

        return {
          id: txn.transactionNumber,
          date: formatDisplayDate(dateObj),
          time: formatDisplayDateTime(dateObj).split(' ')[1], // Extract time part
          items: items.reduce((sum, i) => sum + (i.count ?? 0), 0),
          total: formatPrice(typeof txn.total === "string" ? parseFloat(txn.total) : txn.total),
          paymentMethod: txn.paymentMethod,
          status: txn.status ? txn.status.charAt(0).toUpperCase() + txn.status.slice(1) : "Completed",
        };
      })
    );

    return NextResponse.json(createSuccessResponse(results));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}