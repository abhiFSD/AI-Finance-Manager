import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

// Health check types
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  uptime: number;
  checks: Record<string, CheckResult>;
  system: SystemInfo;
}

interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  latency?: number;
  error?: string;
  details?: Record<string, any>;
}

interface SystemInfo {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: {
    usage: number;
  };
  nodejs: {
    version: string;
    uptime: number;
  };
}

// Cached health status to avoid repeated expensive checks
let cachedHealthStatus: HealthStatus | null = null;
let lastHealthCheck = 0;
const HEALTH_CACHE_TTL = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check if we have a recent cached result
    const now = Date.now();
    if (cachedHealthStatus && (now - lastHealthCheck) < HEALTH_CACHE_TTL) {
      return NextResponse.json(cachedHealthStatus, {
        status: getHttpStatus(cachedHealthStatus.status),
        headers: {
          'Cache-Control': 'public, max-age=30',
          'Content-Type': 'application/json',
          'X-Health-Check-Cached': 'true',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }

    // Perform health checks
    const healthStatus = await performHealthChecks();
    
    // Update cache
    cachedHealthStatus = healthStatus;
    lastHealthCheck = now;
    
    return NextResponse.json(healthStatus, {
      status: getHttpStatus(healthStatus.status),
      headers: {
        'Cache-Control': 'public, max-age=30',
        'Content-Type': 'application/json',
        'X-Health-Check-Cached': 'false',
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  } catch (error) {
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: Date.now(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      checks: {
        error: {
          status: 'fail',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      system: getSystemInfo()
    };

    return NextResponse.json(errorStatus, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    });
  }
}

async function performHealthChecks(): Promise<HealthStatus> {
  const checks: Record<string, CheckResult> = {};
  
  // Database health check
  checks.database = await checkDatabase();
  
  // Redis cache health check
  checks.cache = await checkCache();
  
  // External services health check
  checks.external_apis = await checkExternalAPIs();
  
  // File system health check
  checks.filesystem = await checkFileSystem();
  
  // Memory health check
  checks.memory = checkMemory();
  
  // Determine overall status
  const overallStatus = determineOverallStatus(checks);
  
  return {
    status: overallStatus,
    timestamp: Date.now(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    checks,
    system: getSystemInfo()
  };
}

async function checkDatabase(): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    // Simulate database connection check
    // In a real implementation, you would check your actual database
    const connectionTest = await new Promise((resolve) => {
      setTimeout(resolve, 10); // Simulate DB query time
    });
    
    return {
      status: 'pass',
      latency: Date.now() - startTime,
      details: {
        connected: true,
        pool_size: 10,
        active_connections: 3
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

async function checkCache(): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const healthResult = await cache.healthCheck();
    
    return {
      status: healthResult.status === 'healthy' ? 'pass' : 'fail',
      latency: healthResult.latency,
      details: {
        connected: healthResult.status === 'healthy',
        ping_time: healthResult.latency
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Cache connection failed'
    };
  }
}

async function checkExternalAPIs(): Promise<CheckResult> {
  const startTime = Date.now();
  const externalServices = [
    // Add your external service URLs here
    // { name: 'payment_processor', url: 'https://api.stripe.com/healthcheck' },
    // { name: 'bank_api', url: 'https://api.bank.com/status' }
  ];
  
  if (externalServices.length === 0) {
    return {
      status: 'pass',
      latency: Date.now() - startTime,
      details: { external_services: 0 }
    };
  }
  
  try {
    const results = await Promise.allSettled(
      externalServices.map(async (service) => {
        const response = await fetch(service.url, { 
          method: 'HEAD', 
          signal: AbortSignal.timeout(5000) 
        });
        return { name: service.name, ok: response.ok, status: response.status };
      })
    );
    
    const failedServices = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && !result.value.ok)
    );
    
    return {
      status: failedServices.length > 0 ? 'warn' : 'pass',
      latency: Date.now() - startTime,
      details: {
        total_services: externalServices.length,
        failed_services: failedServices.length,
        results: results.map(result => 
          result.status === 'fulfilled' 
            ? result.value 
            : { error: 'Request failed' }
        )
      }
    };
  } catch (error) {
    return {
      status: 'warn',
      latency: Date.now() - startTime,
      error: 'External API checks failed',
      details: { external_services: externalServices.length }
    };
  }
}

async function checkFileSystem(): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Check if we can write to temp directory
    const testFile = path.join('/tmp', `health-check-${Date.now()}.tmp`);
    await fs.writeFile(testFile, 'health check');
    await fs.unlink(testFile);
    
    return {
      status: 'pass',
      latency: Date.now() - startTime,
      details: {
        writable: true,
        temp_dir: '/tmp'
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      latency: Date.now() - startTime,
      error: 'File system not writable'
    };
  }
}

function checkMemory(): CheckResult {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal;
  const usedMemory = memUsage.heapUsed;
  const memoryPercentage = (usedMemory / totalMemory) * 100;
  
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  
  if (memoryPercentage > 90) {
    status = 'fail';
  } else if (memoryPercentage > 80) {
    status = 'warn';
  }
  
  return {
    status,
    details: {
      used_bytes: usedMemory,
      total_bytes: totalMemory,
      percentage: Math.round(memoryPercentage * 100) / 100,
      rss: memUsage.rss,
      external: memUsage.external
    }
  };
}

function getSystemInfo(): SystemInfo {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100
    },
    nodejs: {
      version: process.version,
      uptime: process.uptime()
    }
  };
}

function determineOverallStatus(checks: Record<string, CheckResult>): 'healthy' | 'degraded' | 'unhealthy' {
  const checkResults = Object.values(checks);
  
  const hasFailures = checkResults.some(check => check.status === 'fail');
  const hasWarnings = checkResults.some(check => check.status === 'warn');
  
  if (hasFailures) {
    return 'unhealthy';
  } else if (hasWarnings) {
    return 'degraded';
  } else {
    return 'healthy';
  }
}

function getHttpStatus(healthStatus: string): number {
  switch (healthStatus) {
    case 'healthy':
      return 200;
    case 'degraded':
      return 200; // Still operational
    case 'unhealthy':
      return 503;
    default:
      return 503;
  }
}