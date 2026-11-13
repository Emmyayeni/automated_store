import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, transactionPayments, tips } from "@/lib/schema";
import { eq } from "drizzle-orm";
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

    const { transactionId, payments, tipAmount, tipEmployeeId } = body;

    // Validate required fields
    const validationErrors = [];
    
    if (!transactionId) {
      validationErrors.push({
        field: "transactionId",
        message: VALIDATION_MESSAGES.REQUIRED("Transaction ID"),
        value: transactionId
      });
    }
    
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      validationErrors.push({
        field: "payments",
        message: "At least one payment method is required",
        value: payments
      });
    }

    // Validate payment structure
    if (payments && Array.isArray(payments)) {
      payments.forEach((payment, index) => {
        if (!payment.method) {
          validationErrors.push({
            field: `payments[${index}].method`,
            message: VALIDATION_MESSAGES.REQUIRED("Payment method"),
            value: payment.method
          });
        }
        if (!payment.amount || payment.amount <= 0) {
          validationErrors.push({
            field: `payments[${index}].amount`,
            message: VALIDATION_MESSAGES.POSITIVE_NUMBER("Payment amount"),
            value: payment.amount
          });
        }
      });
    }

    if (validationErrors.length > 0) {
      const response = createValidationErrorResponse(validationErrors);
      return NextResponse.json(response, { status: 400 });
    }

    // Validate total payment amount matches transaction total
    const [transaction] = await db
      .select({ total: transactions.total })
      .from(transactions)
      .where(eq(transactions.id, transactionId));

    if (!transaction) {
      throw new NotFoundError("Transaction", context);
    }

    const totalPayments = payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
    const transactionTotal = typeof transaction.total === "string" ? parseFloat(transaction.total) : transaction.total;
    const expectedTotal = transactionTotal + (tipAmount || 0);

    if (Math.abs(totalPayments - expectedTotal) > 0.01) {
      throw new BusinessLogicError(
        `Payment amounts (${formatPrice(totalPayments)}) do not match expected total (${formatPrice(expectedTotal)})`,
        context
      );
    }

    // Process each payment
    const paymentResults = [];
    for (const payment of payments) {
      let processorResponse: any = {};

      // Simulate payment processing based on method
      if (payment.method === "card") {
        // In real implementation, integrate with Stripe/Square
        processorResponse = {
          status: "approved",
          transactionId: `card_${Date.now()}`,
          last4: "1234",
          cardType: "visa",
          processedAt: new Date().toISOString(),
        };
      } else if (payment.method === "cash") {
        processorResponse = {
          status: "approved",
          processedAt: new Date().toISOString(),
        };
      }

      const [paymentRecord] = await db
        .insert(transactionPayments)
        .values({
          transactionId,
          paymentMethod: payment.method,
          amount: payment.amount.toString(),
          referenceNumber: payment.referenceNumber || null,
          processorResponse: JSON.stringify(processorResponse),
          createdAt: new Date(),
        })
        .returning();

      paymentResults.push({
        id: paymentRecord.id,
        method: paymentRecord.paymentMethod,
        amount: formatPrice(parseFloat(paymentRecord.amount)),
        referenceNumber: paymentRecord.referenceNumber,
        status: processorResponse.status,
        processedAt: paymentRecord.createdAt,
      });
    }

    // Process tip if provided
    let tipRecord = null;
    if (tipAmount && tipEmployeeId) {
      if (tipAmount <= 0) {
        throw new ValidationError("Tip amount must be positive", "tipAmount", tipAmount);
      }

      const [tip] = await db.insert(tips).values({
        transactionId,
        employeeId: tipEmployeeId,
        amount: tipAmount.toString(),
        tipType: "cash",
        paymentMethod: "cash",
        createdAt: new Date(),
      }).returning();

      tipRecord = {
        id: tip.id,
        employeeId: tip.employeeId,
        amount: formatPrice(parseFloat(tip.amount)),
        tipType: tip.tipType,
        createdAt: tip.createdAt,
      };
    }

    const responseData = {
      transactionId,
      payments: paymentResults,
      tip: tipRecord,
      totalPaid: formatPrice(totalPayments),
      transactionTotal: formatPrice(transactionTotal),
      message: "Split payment processed successfully",
      processedBy: validation.user.name || validation.user.email,
      processedAt: new Date().toISOString()
    };

    return NextResponse.json(createSuccessResponse(responseData), { status: 201 });

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}