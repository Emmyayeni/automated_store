import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      service: 'HardyPOS API'
    };

    // Check database connection (optional)
    // You can add database connectivity check here

    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'HardyPOS API'
    };

    return NextResponse.json(errorStatus, { status: 503 });
  }
}