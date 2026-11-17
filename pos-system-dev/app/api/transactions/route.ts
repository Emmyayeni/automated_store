import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, transactionItems, products, inventory, stockMovements, businesses, locations } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
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

    const effectiveUserId = userId || validation.user.id;
    let effectiveLocationId = locationId || validation.user.locationId;
    if (!effectiveLocationId) {
      try {
        const [firstLoc] = await db.select({ id: locations.id }).from(locations).limit(1);
        effectiveLocationId = firstLoc?.id;
      } catch (err) {
        console.error("Error resolving fallback locationId:", err);
      }
    }

    // Validate required fields
    const validationErrors = [];
    
    if (!effectiveUserId) {
      validationErrors.push({
        field: "userId",
        message: VALIDATION_MESSAGES.REQUIRED("User ID"),
        value: effectiveUserId
      });
    }
    
    if (!effectiveLocationId) {
      validationErrors.push({
        field: "locationId",
        message: VALIDATION_MESSAGES.REQUIRED("Location ID"),
        value: effectiveLocationId
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
            eq(inventory.locationId, effectiveLocationId),
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

    // Resolve businessId from location or database
    let businessId = body.businessId;
    if (!businessId && effectiveLocationId) {
      try {
        const [loc] = await db
          .select({ businessId: locations.businessId })
          .from(locations)
          .where(eq(locations.id, effectiveLocationId));
        businessId = loc?.businessId;
      } catch (err) {
        console.error("Error looking up businessId for transaction:", err);
      }
    }
    if (!businessId) {
      try {
        const [biz] = await db.select({ id: businesses.id }).from(businesses).limit(1);
        businessId = biz?.id;
      } catch (err) {
        console.error("Error getting default businessId:", err);
      }
    }

    // Generate transaction number
    const transactionNumber = `TXN-${Date.now()}`;

    // Prepare transaction values according to schema
    const transactionValues: any = {
      transactionNumber,
      businessId,
      locationId: effectiveLocationId,
      cashierId: effectiveUserId,
      customerId: customerId || null,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: totalAmount.toFixed(2),
      itemCount: items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0),
      paymentMethod,
      status: "completed",
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
          locationId: effectiveLocationId,
          productId: item.productId,
          adjustmentType: 'sale',
          adjustmentQuantity: -item.quantity, // Negative for sale
          reason: `Sale - Transaction ${transactionNumber}`,
          adjustedBy: effectiveUserId,
          referenceId: transactionId,
          referenceType: 'transaction',
          notes: `Sold ${item.quantity} units via POS`,
        });

        // Record into central stock movements ledger for multi-branch reporting
        const [currentInv] = await db
          .select({ quantity: inventory.quantity })
          .from(inventory)
          .where(and(eq(inventory.locationId, effectiveLocationId), eq(inventory.productId, item.productId)));

        const newQty = currentInv?.quantity ?? 0;
        await db.insert(stockMovements).values({
          productId: item.productId,
          locationId: effectiveLocationId,
          movementType: 'STOCK_OUT',
          reason: 'SALE',
          quantity: item.quantity,
          balanceBefore: newQty + item.quantity,
          balanceAfter: newQty,
          reference: transactionNumber,
          notes: `POS sale #${transactionNumber}`,
          userId: effectiveUserId,
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

// GET: Get transactions by user (cashier) or location
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
    const requestedUserId = searchParams.get("userId");
    const requestedLocationId = searchParams.get("locationId");
    
    // Default to current user's ID if not provided
    const targetUserId = requestedUserId || validation.user.id;
    const isElevated = validation.user.role === "ADMIN" || validation.user.role === "BRANCH_MANAGER";

    // Build query - most recent first
    let txns = [];
    
    if (requestedUserId) {
      // Specifically querying by userId
      txns = await db
        .select({
          id: transactions.id,
          transactionNumber: transactions.transactionNumber,
          createdAt: transactions.createdAt,
          total: transactions.total,
          itemCount: transactions.itemCount,
          paymentMethod: transactions.paymentMethod,
          status: transactions.status,
        })
        .from(transactions)
        .where(eq(transactions.cashierId, requestedUserId))
        .orderBy(desc(transactions.createdAt));
    }

    // If no transactions found for the specified user and the user is an admin/manager viewing sales history,
    // or if requested without specific user, return all recent store transactions
    if (txns.length === 0 && (isElevated || !requestedUserId)) {
      if (requestedLocationId || validation.user.locationId) {
        const locId = requestedLocationId || validation.user.locationId;
        txns = await db
          .select({
            id: transactions.id,
            transactionNumber: transactions.transactionNumber,
            createdAt: transactions.createdAt,
            total: transactions.total,
            itemCount: transactions.itemCount,
            paymentMethod: transactions.paymentMethod,
            status: transactions.status,
          })
          .from(transactions)
          .where(eq(transactions.locationId, locId!))
          .orderBy(desc(transactions.createdAt));
      }
      
      // Fallback: if still 0, return all transactions
      if (txns.length === 0) {
        txns = await db
          .select({
            id: transactions.id,
            transactionNumber: transactions.transactionNumber,
            createdAt: transactions.createdAt,
            total: transactions.total,
            itemCount: transactions.itemCount,
            paymentMethod: transactions.paymentMethod,
            status: transactions.status,
          })
          .from(transactions)
          .orderBy(desc(transactions.createdAt));
      }
    }

    // For each transaction, get item count and format date/time
    const results = await Promise.all(
      txns.map(async (txn) => {
        // Get item details
        const items = await db
          .select({
            quantity: transactionItems.quantity,
            unitPrice: transactionItems.unitPrice,
            lineTotal: transactionItems.lineTotal,
            productName: products.name,
          })
          .from(transactionItems)
          .leftJoin(products, eq(transactionItems.productId, products.id))
          .where(eq(transactionItems.transactionId, txn.id));

        const computedItemsCount = items.length > 0
          ? items.reduce((sum, i) => sum + (i.quantity ?? 0), 0)
          : (txn.itemCount ?? 1);

        const dateObj = txn.createdAt instanceof Date
          ? txn.createdAt
          : new Date(txn.createdAt as unknown as string);

        const dateStr = dateObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        const timeStr = dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        const numericTotal = typeof txn.total === "string" ? parseFloat(txn.total) : Number(txn.total || 0);

        return {
          id: txn.transactionNumber,
          date: dateStr,
          time: timeStr,
          items: computedItemsCount,
          total: numericTotal,
          formattedTotal: formatPrice(numericTotal),
          paymentMethod: txn.paymentMethod || "cash",
          status: txn.status ? txn.status.charAt(0).toUpperCase() + txn.status.slice(1) : "Completed",
          details: items.map(i => ({
            name: i.productName || "General Item",
            quantity: i.quantity,
            unitPrice: parseFloat(i.unitPrice?.toString() || "0"),
            lineTotal: parseFloat(i.lineTotal?.toString() || "0"),
          }))
        };
      })
    );

    return NextResponse.json(createSuccessResponse(results));

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}