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
  AuthorizationError 
} from "@/lib/standards/error-handling"
import { 
  validateSession, 
  validateRole,
  type SessionUser 
} from "@/lib/standards/auth-patterns"
import { normalizeRole } from "@/lib/roles"

// POST - Clock in/out
export async function POST(request: NextRequest) {
  try {
    const context = createErrorContext(request);
    
    // Validate session
    const validation = await validateSession();
    if (!validation.isValid || !validation.user) {
      return NextResponse.json(createAuthErrorResponse(validation.error), { status: 401 });
    }

    const user = validation.user;

    const { 
      action, // 'clock_in', 'clock_out', 'break_start', 'break_end'
      location,
      notes,
      scheduleId
    } = await request.json()

    // Validate action
    const validActions = ['clock_in', 'clock_out', 'break_start', 'break_end']
    if (!validActions.includes(action)) {
      throw new ValidationError(
        "Invalid action. Must be: clock_in, clock_out, break_start, or break_end",
        "action",
        action,
        context
      );
    }

    // Get staff member info
    const staffMember = await db.select()
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1)

    if (!staffMember.length) {
      throw new NotFoundError("Staff member", context);
    }

    const staff = staffMember[0]

    // In production: Check timeEntries table for active clock-in without clock-out
    /*
    const currentShift = await db.select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.staffId, staff.id),
          eq(timeEntries.status, 'active')
        )
      )
      .orderBy(desc(timeEntries.clockIn))
      .limit(1)
    */

    // Mock current shift status
    const now = new Date()
    const currentTime = now.toISOString()
    
    // Validate action based on current status
    const mockCurrentShift = action === 'clock_in' ? null : {
      id: "active_shift_123",
      clockIn: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      status: 'active'
    }

    if (action === 'clock_in' && mockCurrentShift) {
      throw new ValidationError(
        "Already clocked in. Please clock out first.",
        "action",
        action,
        context
      );
    }

    if (action !== 'clock_in' && !mockCurrentShift) {
      throw new ValidationError(
        "Not currently clocked in. Please clock in first.",
        "action", 
        action,
        context
      );
    }

    // Process the time tracking action
    let timeEntry

    switch (action) {
      case 'clock_in':
        timeEntry = {
          id: `entry_${Date.now()}`,
          staffId: staff.id,
          staffName: staff.name,
          clockIn: currentTime,
          clockOut: null,
          status: 'active',
          location: location || 'Main Store',
          scheduleId: scheduleId || null,
          notes: notes || '',
          breaks: [],
          totalBreakTime: 0,
          createdAt: currentTime
        }
        break

      case 'clock_out':
        const clockInTime = new Date(mockCurrentShift!.clockIn)
        const totalHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
        
        timeEntry = {
          id: mockCurrentShift!.id,
          staffId: staff.id,
          staffName: staff.name,
          clockIn: mockCurrentShift!.clockIn,
          clockOut: currentTime,
          status: 'completed',
          location: location || 'Main Store',
          scheduleId: scheduleId || null,
          notes: notes || '',
          totalHours: Math.round(totalHours * 100) / 100,
          totalBreakTime: 30, // Mock 30 minutes break
          regularHours: Math.min(totalHours, 8),
          overtimeHours: Math.max(0, totalHours - 8),
          payRate: 25.00,
          totalPay: Math.round(totalHours * 25.00 * 100) / 100,
          updatedAt: currentTime
        }
        break

      case 'break_start':
        timeEntry = {
          id: mockCurrentShift!.id,
          action: 'break_start',
          breakStartTime: currentTime,
          breakType: 'regular',
          location: location || 'Break Room',
          notes: notes || 'Break started'
        }
        break

      case 'break_end':
        const breakStartTime = new Date(now.getTime() - 15 * 60 * 1000) // 15 min break
        const breakDuration = (now.getTime() - breakStartTime.getTime()) / (1000 * 60)
        
        timeEntry = {
          id: mockCurrentShift!.id,
          action: 'break_end',
          breakEndTime: currentTime,
          breakDuration: Math.round(breakDuration),
          totalBreakTime: Math.round(breakDuration),
          notes: notes || 'Break ended'
        }
        break
    }

    // In production: Insert into timeEntries table with proper validation
    /*
    if (action === 'clock_in') {
      await db.insert(timeEntries).values(timeEntry)
    } else if (action === 'clock_out') {
      await db.update(timeEntries)
        .set(timeEntry)
        .where(eq(timeEntries.id, timeEntry.id))
    } else {
      // Update break information
      await db.update(timeEntries)
        .set({
          breaks: sql`${timeEntries.breaks} || ${JSON.stringify(timeEntry)}`,
          updatedAt: new Date()
        })
        .where(eq(timeEntries.id, timeEntry.id))
    }
    */

    // Calculate attendance streak and performance metrics
    const attendanceMetrics = {
      consecutiveDaysWorked: 15,
      totalHoursThisWeek: 32.5,
      totalHoursThisMonth: 156.0,
      averageHoursPerDay: 7.8,
      punctualityScore: 0.95, // 95% on-time
      attendanceRate: 0.98 // 98% attendance
    }

    console.log(`${staff.name} performed ${action} at ${currentTime}`)

    return NextResponse.json(createSuccessResponse({
      action,
      timeEntry,
      attendanceMetrics,
      message: `${action.replace('_', ' ')} recorded successfully`
    }))

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// GET - Get time tracking records
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
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const period = url.searchParams.get('period') || 'week' // week, month, year

    // Get requesting user info from database
    const dbUser = await db.select()
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1)

    if (!dbUser.length) {
      throw new NotFoundError("User", context);
    }

    // Check permissions - staff can only view their own records
    const normalizedRole = normalizeRole(user.role);
    const isManagerOrAdmin = ['ADMIN', 'MANAGER'].includes(normalizedRole);
    const viewingOwnRecords = !staffId || staffId === dbUser[0].id;

    if (!isManagerOrAdmin && !viewingOwnRecords) {
      throw new AuthorizationError(
        "Insufficient permissions to view other staff time records",
        context
      );
    }

    // In production: Query timeEntries table with date range and pagination
    /*
    let query = db.select().from(timeEntries)
    
    if (staffId) {
      query = query.where(eq(timeEntries.staffId, staffId))
    } else if (!isManagerOrAdmin) {
      query = query.where(eq(timeEntries.staffId, user[0].id))
    }
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(timeEntries.clockIn, startDate),
          lte(timeEntries.clockIn, endDate)
        )
      )
    }
    
    const timeEntries = await query.orderBy(desc(timeEntries.clockIn))
    */

    // Mock time entries
    const mockTimeEntries = [
      {
        id: "entry_1",
        staffId: dbUser[0].id,
        staffName: dbUser[0].name,
        date: new Date().toISOString().split('T')[0],
        clockIn: "09:00:00",
        clockOut: "17:00:00",
        totalHours: 8.0,
        regularHours: 8.0,
        overtimeHours: 0,
        breaks: [
          { start: "12:00:00", end: "12:30:00", duration: 30 },
          { start: "15:00:00", end: "15:15:00", duration: 15 }
        ],
        totalBreakTime: 45,
        payRate: 25.00,
        totalPay: 200.00,
        location: "Main Store",
        status: "completed"
      },
      {
        id: "entry_2",
        staffId: dbUser[0].id,
        staffName: dbUser[0].name,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        clockIn: "13:00:00",
        clockOut: "22:00:00",
        totalHours: 9.0,
        regularHours: 8.0,
        overtimeHours: 1.0,
        breaks: [
          { start: "16:00:00", end: "16:30:00", duration: 30 },
          { start: "19:00:00", end: "19:15:00", duration: 15 }
        ],
        totalBreakTime: 45,
        payRate: 25.00,
        totalPay: 237.50, // 8 regular + 1.5x overtime
        location: "Main Store",
        status: "completed"
      }
    ]

    // Calculate summary statistics
    const totalHours = mockTimeEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
    const totalRegularHours = mockTimeEntries.reduce((sum, entry) => sum + entry.regularHours, 0)
    const totalOvertimeHours = mockTimeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)
    const totalPay = mockTimeEntries.reduce((sum, entry) => sum + entry.totalPay, 0)

    const summary = {
      totalEntries: mockTimeEntries.length,
      totalHours: Math.round(totalHours * 100) / 100,
      totalRegularHours: Math.round(totalRegularHours * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      totalPay: Math.round(totalPay * 100) / 100,
      averageHoursPerDay: Math.round((totalHours / mockTimeEntries.length) * 100) / 100,
      punctualityScore: 0.95,
      attendanceRate: 0.98
    }

    return NextResponse.json(createSuccessResponse({
      timeEntries: mockTimeEntries,
      summary,
      period,
      dateRange: {
        start: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: endDate || new Date().toISOString().split('T')[0]
      }
    }))

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}

// PUT - Update time entry (for corrections)
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
      entryId,
      clockIn,
      clockOut,
      notes,
      correctionReason
    } = await request.json()

    if (!entryId) {
      throw new ValidationError("Entry ID is required", "entryId", entryId, context);
    }

    if (!correctionReason) {
      throw new ValidationError("Correction reason is required", "correctionReason", correctionReason, context);
    }

    // In production: Update timeEntries table with corrected hours and notes
    /*
    const updatedEntry = await db.update(timeEntries)
      .set({
        clockIn,
        clockOut,
        notes,
        correctedAt: new Date(),
        correctedBy: user[0].id,
        correctionReason,
        // Recalculate totals
        totalHours: calculateHours(clockIn, clockOut),
        regularHours: calculateRegularHours(clockIn, clockOut),
        overtimeHours: calculateOvertimeHours(clockIn, clockOut)
      })
      .where(eq(timeEntries.id, entryId))
      .returning()
    */

    // Mock correction
    const correctedEntry = {
      id: entryId,
      clockIn,
      clockOut,
      notes,
      correctedAt: new Date().toISOString(),
      correctedBy: user.id,
      correctionReason,
      originalClockIn: "09:00:00", // Mock original
      originalClockOut: "17:00:00"
    }

    console.log(`Time entry ${entryId} corrected by ${user.email}: ${correctionReason}`)

    return NextResponse.json(createSuccessResponse({
      entry: correctedEntry,
      message: "Time entry corrected successfully"
    }))

  } catch (error) {
    const context = createErrorContext(request);
    return handleApiError(error, context);
  }
}
