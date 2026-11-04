import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createAuthErrorResponse,
  createAuthorizationErrorResponse,
  createNotFoundResponse 
} from "@/lib/standards/api-responses"
import { 
  handleApiError, 
  createErrorContext,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  BusinessLogicError 
} from "@/lib/standards/error-handling"
import { 
  validateSession, 
  validateRole,
  type SessionUser 
} from "@/lib/standards/auth-patterns"
import { normalizeRole } from "@/lib/roles"

// POST - Create new schedule/shift
export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session and require manager/admin role
    const accessControl = await validateRole(['ADMIN', 'MANAGER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const requestingUser = accessControl.user;

    const { 
      staffId,
      startTime,
      endTime,
      date,
      position,
      location,
      notes,
      recurring = false,
      recurringPattern
    } = await request.json()

    // Validate required fields
    if (!staffId) {
      throw new ValidationError("Staff ID is required", "staffId", staffId, context);
    }
    if (!startTime) {
      throw new ValidationError("Start time is required", "startTime", startTime, context);
    }
    if (!endTime) {
      throw new ValidationError("End time is required", "endTime", endTime, context);
    }
    if (!date) {
      throw new ValidationError("Date is required", "date", date, context);
    }

    // Verify the staff member exists
    const staffMember = await db.select()
      .from(users)
      .where(eq(users.id, staffId))
      .limit(1)

    if (!staffMember.length) {
      throw new NotFoundError("Staff member", context);
    }

    // Validate time format and logic
    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)

    if (end <= start) {
      throw new BusinessLogicError("End time must be after start time", context);
    }

    // Calculate shift duration
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    if (durationHours > 12) {
      throw new BusinessLogicError("Shift duration cannot exceed 12 hours", context);
    }

    // In production: Add schedules table to schema and implement conflict checking logic
    /*
    const conflictCheck = await db.select()
      .from(schedules)
      .where(
        and(
          eq(schedules.staffId, staffId),
          eq(schedules.date, date),
          // Check for time overlap
          or(
            and(
              lte(schedules.startTime, startTime),
              gte(schedules.endTime, startTime)
            ),
            and(
              lte(schedules.startTime, endTime),
              gte(schedules.endTime, endTime)
            )
          )
        )
      )

    if (conflictCheck.length > 0) {
      return NextResponse.json({ 
        error: "Schedule conflict detected" 
      }, { status: 409 })
    }
    */

    // Mock schedule creation
    const newSchedule = {
      id: Date.now().toString(),
      staffId,
      staffName: staffMember[0].name,
      staffEmail: staffMember[0].email,
      date,
      startTime,
      endTime,
      duration: durationHours,
      position: position || staffMember[0].role,
      location: location || 'Main Store',
      notes: notes || '',
      status: 'scheduled',
      recurring,
      recurringPattern: recurring ? recurringPattern : null,
      createdBy: requestingUser.id,
      createdAt: new Date().toISOString(),
      payRate: 25.00, // Mock hourly rate
      estimatedPay: Math.round(durationHours * 25.00 * 100) / 100
    }

    // Handle recurring schedules
    const schedules = [newSchedule]
    
    if (recurring && recurringPattern) {
      const { frequency, endDate, daysOfWeek } = recurringPattern
      
      if (frequency === 'weekly' && daysOfWeek && endDate) {
        const currentDate = new Date(date)
        const finalDate = new Date(endDate)
        
        while (currentDate <= finalDate) {
          currentDate.setDate(currentDate.getDate() + 7)
          
          if (currentDate <= finalDate) {
            schedules.push({
              ...newSchedule,
              id: `${Date.now()}-${schedules.length}`,
              date: currentDate.toISOString().split('T')[0]
            })
          }
        }
      }
    }

    console.log(`Schedule created for ${staffMember[0].name} on ${date} by ${requestingUser.email}`)

    return NextResponse.json(createSuccessResponse({
      schedules,
      message: `${schedules.length} schedule(s) created successfully`
    }))

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// GET - Retrieve schedules
export async function GET(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session
    const validation = await validateSession();
    if (!validation.isValid || !validation.user) {
      return NextResponse.json(createAuthErrorResponse(validation.error), { status: 401 });
    }

    const user = validation.user;

    const url = new URL(request.url)
    const staffId = url.searchParams.get('staffId')
    const date = url.searchParams.get('date')
    const week = url.searchParams.get('week')
    const month = url.searchParams.get('month')

    // Get user from database for ID comparison
    const dbUser = await db.select()
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1)

    if (!dbUser.length) {
      throw new NotFoundError("User", context);
    }

    // Staff can only view their own schedule unless they're manager/admin
    const normalizedRole = normalizeRole(user.role);
    const isManagerOrAdmin = ['ADMIN', 'MANAGER'].includes(normalizedRole);
    const viewingOwnSchedule = staffId === dbUser[0].id;

    if (!isManagerOrAdmin && !viewingOwnSchedule && staffId) {
      throw new AuthorizationError(
        "Insufficient permissions to view other staff schedules",
        context
      );
    }

    // In production: Query schedules table with date range and staff filtering
    /*
    let query = db.select().from(schedules)
    
    if (staffId) {
      query = query.where(eq(schedules.staffId, staffId))
    }
    
    if (date) {
      query = query.where(eq(schedules.date, date))
    }
    
    if (week) {
      const weekStart = new Date(week)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      query = query.where(
        and(
          gte(schedules.date, weekStart.toISOString().split('T')[0]),
          lte(schedules.date, weekEnd.toISOString().split('T')[0])
        )
      )
    }
    
    const schedules = await query
    */

    // Mock schedule data
    const mockSchedules = [
      {
        id: "1",
        staffId: dbUser[0].id,
        staffName: dbUser[0].name,
        staffEmail: dbUser[0].email,
        date: new Date().toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "17:00",
        duration: 8,
        position: dbUser[0].role,
        location: "Main Store",
        notes: "Regular shift",
        status: "scheduled",
        payRate: 25.00,
        estimatedPay: 200.00
      },
      {
        id: "2",
        staffId: dbUser[0].id,
        staffName: dbUser[0].name,
        staffEmail: dbUser[0].email,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        startTime: "13:00",
        endTime: "21:00",
        duration: 8,
        position: dbUser[0].role,
        location: "Main Store",
        notes: "Evening shift",
        status: "scheduled",
        payRate: 25.00,
        estimatedPay: 200.00
      }
    ]

    // Filter based on query parameters
    let filteredSchedules = mockSchedules

    if (staffId) {
      filteredSchedules = filteredSchedules.filter(s => s.staffId === staffId)
    }

    if (date) {
      filteredSchedules = filteredSchedules.filter(s => s.date === date)
    }

    // Calculate summary statistics
    const totalHours = filteredSchedules.reduce((sum, schedule) => sum + schedule.duration, 0)
    const totalPay = filteredSchedules.reduce((sum, schedule) => sum + schedule.estimatedPay, 0)

    return NextResponse.json(createSuccessResponse({
      schedules: filteredSchedules,
      summary: {
        totalShifts: filteredSchedules.length,
        totalHours,
        totalEstimatedPay: Math.round(totalPay * 100) / 100,
        averageShiftLength: filteredSchedules.length > 0 ? 
          Math.round((totalHours / filteredSchedules.length) * 10) / 10 : 0
      }
    }))

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// PUT - Update schedule
export async function PUT(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session and require manager/admin role
    const accessControl = await validateRole(['ADMIN', 'MANAGER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const user = accessControl.user;

    const { 
      scheduleId,
      startTime,
      endTime,
      position,
      location,
      notes,
      status
    } = await request.json()

    if (!scheduleId) {
      throw new ValidationError("Schedule ID is required", "scheduleId", scheduleId, context);
    }

    // In production: Update schedules table with new shift details
    /*
    const updatedSchedule = await db.update(schedules)
      .set({
        startTime,
        endTime,
        position,
        location,
        notes,
        status,
        updatedAt: new Date(),
        updatedBy: user[0].id
      })
      .where(eq(schedules.id, scheduleId))
      .returning()
    */

    // Mock update
    const updatedSchedule = {
      id: scheduleId,
      startTime,
      endTime,
      position,
      location,
      notes,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    }

    console.log(`Schedule ${scheduleId} updated by ${user.email}`)

    return NextResponse.json(createSuccessResponse({
      schedule: updatedSchedule,
      message: "Schedule updated successfully"
    }))

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// DELETE - Delete schedule
export async function DELETE(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session and require manager/admin role
    const accessControl = await validateRole(['ADMIN', 'MANAGER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const user = accessControl.user;

    const url = new URL(request.url)
    const scheduleId = url.searchParams.get('scheduleId')

    if (!scheduleId) {
      throw new ValidationError("Schedule ID is required", "scheduleId", scheduleId, context);
    }

    // In production: Delete from schedules table and handle dependencies
    /*
    await db.delete(schedules)
      .where(eq(schedules.id, scheduleId))
    */

    console.log(`Schedule ${scheduleId} deleted by ${user.email}`)

    return NextResponse.json(createSuccessResponse({
      message: "Schedule deleted successfully"
    }))

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}
