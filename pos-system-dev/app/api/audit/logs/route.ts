import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, resource, resourceId, details, ipAddress, userAgent } = await req.json();

    if (!action || !resource) {
      return NextResponse.json(
        { error: 'Action and resource are required' },
        { status: 400 }
      );
    }

    // Create audit log entry
    const auditLog = {
      id: crypto.randomUUID(),
      userId: session.user.id,
      businessId: session.user.businessId,
      action,
      resource,
      resourceId: resourceId || null,
      details: details || {},
      ipAddress: ipAddress || req.headers.get('x-forwarded-for') || null,
      userAgent: userAgent || req.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      sessionId: 'unknown'
    };

    // In production, save to database
    // await db.auditLogs.insert(auditLog);

    return NextResponse.json({
      success: true,
      auditLogId: auditLog.id,
      message: 'Audit log created successfully'
    });

  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    if (session.user.role !== 'admin' && session.user.role !== 'manager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Mock audit logs data
    const mockAuditLogs = [
      {
        id: '1',
        userId: session.user.id,
        businessId: session.user.businessId,
        action: 'CREATE',
        resource: 'product',
        resourceId: 'prod-123',
        details: { name: 'New Product', price: 29.99 },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        sessionId: 'sess-123',
        user: {
          name: session.user.name,
          email: session.user.email
        }
      },
      {
        id: '2',
        userId: session.user.id,
        businessId: session.user.businessId,
        action: 'UPDATE',
        resource: 'inventory',
        resourceId: 'inv-456',
        details: { quantity: 100, previous: 50 },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        sessionId: 'sess-124',
        user: {
          name: session.user.name,
          email: session.user.email
        }
      },
      {
        id: '3',
        userId: session.user.id,
        businessId: session.user.businessId,
        action: 'DELETE',
        resource: 'customer',
        resourceId: 'cust-789',
        details: { reason: 'GDPR request' },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        sessionId: 'sess-125',
        user: {
          name: session.user.name,
          email: session.user.email
        }
      }
    ];

    // Apply filters
    let filteredLogs = mockAuditLogs.filter(log => 
      log.businessId === session.user.businessId
    );

    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }

    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    if (resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === resource);
    }

    if (startDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= new Date(startDate)
      );
    }

    if (endDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= new Date(endDate)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return NextResponse.json({
      auditLogs: paginatedLogs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredLogs.length / limit),
        totalItems: filteredLogs.length,
        itemsPerPage: limit
      },
      filters: {
        userId,
        action,
        resource,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admin can delete audit logs
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const olderThan = searchParams.get('olderThan'); // ISO date string
    const confirm = searchParams.get('confirm');

    if (!olderThan || !confirm || confirm !== 'true') {
      return NextResponse.json(
        { error: 'Confirmation required and valid date needed' },
        { status: 400 }
      );
    }

    const cutoffDate = new Date(olderThan);
    if (isNaN(cutoffDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Mock deletion count
    const deletedCount = Math.floor(Math.random() * 100) + 1;

    // Create audit log for this deletion
    const auditLog = {
      id: crypto.randomUUID(),
      userId: session.user.id,
      businessId: session.user.businessId,
      action: 'BULK_DELETE',
      resource: 'audit_logs',
      resourceId: null,
      details: { 
        cutoffDate: cutoffDate.toISOString(),
        deletedCount,
        reason: 'Data retention policy'
      },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      sessionId: 'unknown'
    };

    return NextResponse.json({
      success: true,
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      auditLogId: auditLog.id,
      message: `Deleted ${deletedCount} audit log entries older than ${cutoffDate.toISOString()}`
    });

  } catch (error) {
    console.error('Error deleting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete audit logs' },
      { status: 500 }
    );
  }
}
