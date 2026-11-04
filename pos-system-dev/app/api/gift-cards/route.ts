import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { users, customers } from "@/lib/schema"
import { eq } from "drizzle-orm"

// POST - Create/Issue new gift card
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { 
      amount,
      customerId,
      recipientEmail,
      recipientName,
      senderName,
      message,
      expiryMonths = 12,
      type = 'standard' // 'standard', 'promotional', 'employee', 'loyalty_reward'
    } = await request.json()

    // Validate user permissions
    const user = await db.select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user.length) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 })
    }

    // Validate amount
    if (!amount || amount <= 0 || amount > 1000) {
      return NextResponse.json({ 
        error: "Gift card amount must be between $0.01 and $1000" 
      }, { status: 400 })
    }

    // Generate unique gift card code
    const cardNumber = generateGiftCardCode()
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + expiryMonths)

    // In production: Add giftCards table to schema with fields: id, cardNumber, amount, balance, customerId, recipientEmail, etc.
    // For now, create mock gift card
    const giftCard = {
      id: `gc_${Date.now()}`,
      cardNumber,
      amount: amount,
      balance: amount,
      customerId: customerId || null,
      recipientEmail,
      recipientName,
      senderName,
      message,
      type,
      status: 'active',
      expiryDate: expiryDate.toISOString(),
      issuedAt: new Date().toISOString(),
      issuedBy: user[0].id,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${cardNumber}`,
      securityFeatures: {
        encrypted: true,
        tamperProof: true,
        verificationUrl: `https://yourstore.com/verify-gift-card/${cardNumber}`
      }
    }

    console.log(`Gift card ${cardNumber} created by ${session.user.email} for $${amount}`)

    return NextResponse.json({
      success: true,
      giftCard,
      message: "Gift card created successfully"
    })

  } catch (error) {
    console.error("Error creating gift card:", error)
    return NextResponse.json({ 
      error: "Failed to create gift card",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET - Retrieve gift card details or list gift cards
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cardNumber = searchParams.get("cardNumber")
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit') || '50')

    if (cardNumber) {
      // In production: Query giftCards table for specific card with balance and transaction history
      // Mock gift card retrieval
      const giftCard = {
        id: `gc_${Date.now()}`,
        cardNumber: cardNumber,
        balance: 35.75,
        initialAmount: 50.00,
        status: "active",
        isActive: true,
        expiryDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        issuedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        transactionHistory: [
          {
            id: "txn_123",
            type: "redeem",
            amount: -14.25,
            balanceAfter: 35.75,
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            description: "Coffee and pastry purchase"
          }
        ]
      }

      return NextResponse.json({ giftCard })
    } else {
      // In production: Query giftCards table with proper filtering, pagination and business scope
      // Mock gift card list
      const giftCardsList = [
        {
          id: "gc_1",
          cardNumber: "GC123456789",
          balance: 100.00,
          initialAmount: 100.00,
          status: "active",
          isActive: true,
          issuedDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
          customerName: "Alice Johnson"
        },
        {
          id: "gc_2", 
          cardNumber: "GC987654321",
          balance: 0.00,
          initialAmount: 50.00,
          status: "used",
          isActive: true,
          issuedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          expiryDate: new Date(Date.now() + 10 * 30 * 24 * 60 * 60 * 1000).toISOString(),
          customerName: "Bob Wilson"
        }
      ]

      return NextResponse.json({
        giftCards: giftCardsList,
        total: giftCardsList.length,
        filters: { status, customerId }
      })
    }

  } catch (error) {
    console.error("Error retrieving gift cards:", error)
    return NextResponse.json({ 
      error: "Failed to retrieve gift cards" 
    }, { status: 500 })
  }
}

// PUT - Redeem/Use gift card or reload balance
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { 
      cardNumber,
      amount,
      operation = 'redeem', // 'redeem', 'reload'
      transactionId,
      description
    } = await request.json()

    // Validate user permissions
    const user = await db.select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user.length) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 })
    }

    if (!cardNumber || !amount || amount <= 0) {
      return NextResponse.json({ 
        error: "Valid gift card number and amount are required" 
      }, { status: 400 })
    }

    // For reload operations, only managers/admins allowed
    if (operation === 'reload') {
      const allowedRoles = ['admin', 'manager']
      if (!allowedRoles.includes(user[0].role)) {
        return NextResponse.json({ 
          error: "Insufficient permissions to reload gift cards" 
        }, { status: 403 })
      }
    }

    // In production: Update giftCards table balance and create giftCardTransactions record
    // Mock gift card redemption/reload
    const previousBalance = 50.00
    let newBalance: number

    if (operation === 'redeem') {
      if (previousBalance < amount) {
        return NextResponse.json({ 
          error: "Insufficient gift card balance" 
        }, { status: 400 })
      }
      newBalance = previousBalance - amount
    } else {
      newBalance = previousBalance + amount
    }

    const result = {
      success: true,
      operation,
      cardNumber,
      amount,
      previousBalance,
      newBalance,
      transactionId,
      processedAt: new Date().toISOString(),
      processedBy: user[0].id,
      status: newBalance === 0 ? 'used' : 'active'
    }

    console.log(`Gift card ${cardNumber} ${operation} for $${amount} by ${session.user.email}`)

    return NextResponse.json(result)

  } catch (error) {
    console.error(`Error processing gift card operation:`, error)
    return NextResponse.json({ 
      error: `Failed to process gift card operation` 
    }, { status: 500 })
  }
}

// DELETE - Deactivate/Cancel gift card
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { cardNumber, reason } = await request.json()

    // Validate user permissions (only managers/admins can deactivate)
    const user = await db.select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1)

    if (!user.length) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 })
    }

    const allowedRoles = ['admin', 'manager']
    if (!allowedRoles.includes(user[0].role)) {
      return NextResponse.json({ 
        error: "Insufficient permissions to deactivate gift cards" 
      }, { status: 403 })
    }

    if (!cardNumber) {
      return NextResponse.json({ 
        error: "Gift card number is required" 
      }, { status: 400 })
    }

    const validReasons = ['lost', 'stolen', 'damaged', 'fraud', 'customer_request', 'expired']
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json({ 
        error: "Valid deactivation reason is required" 
      }, { status: 400 })
    }

    // In production: Update giftCards table to set status as inactive/cancelled
    const deactivation = {
      success: true,
      cardNumber,
      status: 'deactivated',
      reason,
      deactivatedAt: new Date().toISOString(),
      deactivatedBy: user[0].id
    }

    console.log(`Gift card ${cardNumber} deactivated by ${session.user.email} - Reason: ${reason}`)

    return NextResponse.json(deactivation)

  } catch (error) {
    console.error("Error deactivating gift card:", error)
    return NextResponse.json({ 
      error: "Failed to deactivate gift card" 
    }, { status: 500 })
  }
}

// Helper function to generate unique gift card codes
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'GC'
  
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return code
}
