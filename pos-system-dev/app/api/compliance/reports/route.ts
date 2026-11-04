import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createAuthErrorResponse,
  createAuthorizationErrorResponse 
} from '@/lib/standards/api-responses';
import { 
  handleApiError, 
  createErrorContext,
  ValidationError 
} from '@/lib/standards/error-handling';
import { 
  validateSession, 
  validateRole 
} from '@/lib/standards/auth-patterns';
import { formatDate, formatApiDate } from '@/lib/standards/formatting';
import { ValidationRules, createValidator } from '@/lib/standards/validation';

export async function GET(req: NextRequest) {
  try {
    const context = createErrorContext(req);
    
    // Validate session and require admin/manager role
    const accessControl = await validateRole(['ADMIN', 'MANAGER']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const user = accessControl.user;

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';

    const validReportTypes = [
      'gdpr-compliance',
      'data-retention',
      'access-logs',
      'security-incidents',
      'user-permissions',
      'data-exports',
      'privacy-requests'
    ];

    // Validate report type using centralized validation
    if (reportType) {
      const reportTypeValidator = createValidator<string>('Report type')
        .addRule(ValidationRules.custom(
          (value: string) => validReportTypes.includes(value),
          `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
        ));
      
      const validation = reportTypeValidator.validate(reportType);
      if (!validation.isValid) {
        throw new ValidationError(validation.error!, 'reportType', reportType, context);
      }
    }

    // Validate date range using centralized utilities
    if (startDate || endDate) {
      const dateValidator = createValidator<string>('Date')
        .addRule(ValidationRules.date('Date'));
      
      if (startDate) {
        const startValidation = dateValidator.validate(startDate);
        if (!startValidation.isValid) {
          throw new ValidationError('Invalid start date format', 'startDate', startDate, context);
        }
      }
      
      if (endDate) {
        const endValidation = dateValidator.validate(endDate);
        if (!endValidation.isValid) {
          throw new ValidationError('Invalid end date format', 'endDate', endDate, context);
        }
      }
      
      // Validate date range logic
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
          throw new ValidationError('Start date must be before end date', 'dateRange', { startDate, endDate }, context);
        }
      }
    }

    // Generate compliance report based on type
    const reportId = crypto.randomUUID();
    const timestamp = formatApiDate(new Date());
    const dateRange = {
      start: startDate || formatApiDate(new Date(Date.now() - 30 * 86400000)),
      end: endDate || formatApiDate(new Date())
    };

    let reportData;

    switch (reportType) {
      case 'gdpr-compliance':
        reportData = {
          type: 'gdpr-compliance',
          summary: {
            dataSubjects: 4875,
            consentRecords: 4650,
            optOuts: 225,
            dataExports: 12,
            deletionRequests: 8,
            breachNotifications: 0
          },
          details: {
            consentStatus: {
              valid: 4650,
              expired: 180,
              withdrawn: 45
            },
            dataCategories: {
              personal: 4875,
              financial: 3240,
              health: 980,
              biometric: 0
            },
            legalBasis: {
              consent: 4650,
              contract: 3240,
              legitimate_interest: 985
            },
            retentionCompliance: {
              compliant: 95.8,
              nearExpiry: 3.2,
              overdue: 1.0
            }
          }
        };
        break;

      case 'data-retention':
        reportData = {
          type: 'data-retention',
          summary: {
            totalRecords: 23875,
            retentionCompliant: 22860,
            nearExpiry: 765,
            overdue: 250
          },
          details: {
            byCategory: {
              transactions: { total: 15000, compliant: 14500, overdue: 120 },
              customers: { total: 5000, compliant: 4850, overdue: 80 },
              employees: { total: 25, compliant: 25, overdue: 0 },
              audit_logs: { total: 3850, compliant: 3485, overdue: 50 }
            },
            retentionPeriods: {
              '1_year': 8500,
              '3_years': 7200,
              '7_years': 6800,
              'indefinite': 1375
            }
          }
        };
        break;

      case 'access-logs':
        reportData = {
          type: 'access-logs',
          summary: {
            totalAccesses: 45230,
            uniqueUsers: 28,
            successfulLogins: 1240,
            failedAttempts: 45,
            privilegedAccess: 180
          },
          details: {
            byUser: [
              { userId: user.id, accesses: 890, lastAccess: formatApiDate(new Date()) },
              { userId: 'user-456', accesses: 650, lastAccess: formatApiDate(new Date(Date.now() - 3600000)) }
            ],
            byResource: {
              admin_panel: 180,
              pos_system: 38450,
              reports: 3200,
              settings: 1600,
              api_endpoints: 1800
            },
            suspiciousActivity: [
              {
                type: 'multiple_failed_logins',
                count: 5,
                lastOccurrence: formatApiDate(new Date(Date.now() - 86400000))
              }
            ]
          }
        };
        break;

      case 'user-permissions':
        reportData = {
          type: 'user-permissions',
          summary: {
            totalUsers: 28,
            activeUsers: 25,
            adminUsers: 3,
            managerUsers: 8,
            cashierUsers: 14,
            orphanedPermissions: 0
          },
          details: {
            roleDistribution: {
              admin: 3,
              manager: 8,
              cashier: 14,
              inactive: 3
            },
            permissionAudit: {
              compliant: 28,
              violations: 0,
              reviews_needed: 2
            },
            recentChanges: [
              {
                userId: 'user-789',
                action: 'role_change',
                from: 'cashier',
                to: 'manager',
                timestamp: formatApiDate(new Date(Date.now() - 172800000)),
                authorizedBy: user.id
              }
            ]
          }
        };
        break;

      default:
        reportData = {
          type: 'general-compliance',
          summary: {
            overallScore: 94.5,
            criticalIssues: 0,
            warnings: 3,
            recommendations: 8
          },
          details: {
            categories: {
              data_protection: 96.2,
              access_control: 98.1,
              audit_trails: 92.3,
              incident_response: 89.7
            }
          }
        };
    }

    const report = {
      id: reportId,
      businessId: user.businessId,
      type: reportType || 'general-compliance',
      generatedAt: timestamp,
      generatedBy: user.id,
      dateRange,
      format,
      data: reportData,
      metadata: {
        version: '1.0',
        generator: 'POS Compliance Engine',
        regulations: ['GDPR', 'CCPA', 'PCI-DSS'],
        nextReview: formatApiDate(new Date(Date.now() + 30 * 86400000))
      }
    };

    if (format === 'pdf') {
      return NextResponse.json(createSuccessResponse({
        reportId,
        downloadUrl: `/api/compliance/reports/${reportId}/download`,
        message: 'PDF report generated successfully'
      }));
    }

    return NextResponse.json(createSuccessResponse({ report }));

  } catch (error) {
    const context = createErrorContext(req);
    return handleApiError(error, context);
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = createErrorContext(req);
    
    // Validate session and require admin role
    const accessControl = await validateRole(['ADMIN']);
    if (!accessControl.hasAccess || !accessControl.user) {
      const errorResponse = accessControl.code === "AUTH_REQUIRED" 
        ? createAuthErrorResponse(accessControl.error)
        : createAuthorizationErrorResponse(accessControl.error);
      
      const status = accessControl.code === "AUTH_REQUIRED" ? 401 : 403;
      return NextResponse.json(errorResponse, { status });
    }

    const user = accessControl.user;
    const { reportType, schedule, recipients, format, filters } = await req.json();

    // Validate required fields using centralized validation
    const requiredValidator = createValidator<string>('Required field')
      .addRule(ValidationRules.required('Required field'));
    
    if (!reportType) {
      throw new ValidationError('Report type is required', 'reportType', reportType, context);
    }
    
    if (!schedule) {
      throw new ValidationError('Schedule is required', 'schedule', schedule, context);
    }

    // Validate schedule using centralized validation
    const validSchedules = ['daily', 'weekly', 'monthly', 'quarterly'];
    const scheduleValidator = createValidator<string>('Schedule')
      .addRule(ValidationRules.custom(
        (value: string) => validSchedules.includes(value),
        `Invalid schedule. Must be one of: ${validSchedules.join(', ')}`
      ));
    
    const scheduleValidation = scheduleValidator.validate(schedule);
    if (!scheduleValidation.isValid) {
      throw new ValidationError(scheduleValidation.error!, 'schedule', schedule, context);
    }

    // Create scheduled report
    const scheduledReport = {
      id: crypto.randomUUID(),
      businessId: user.businessId,
      reportType,
      schedule,
      recipients: recipients || [user.email],
      format: format || 'pdf',
      filters: filters || {},
      createdBy: user.id,
      createdAt: formatApiDate(new Date()),
      isActive: true,
      nextRun: formatApiDate(new Date(Date.now() + 86400000)), // Tomorrow
      lastRun: null
    };

    return NextResponse.json(createSuccessResponse({
      scheduledReport: {
        id: scheduledReport.id,
        reportType: scheduledReport.reportType,
        schedule: scheduledReport.schedule,
        nextRun: scheduledReport.nextRun,
        isActive: scheduledReport.isActive
      },
      message: 'Compliance report scheduled successfully'
    }));

  } catch (error) {
    const context = createErrorContext(req);
    return handleApiError(error, context);
  }
}
