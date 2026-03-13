import { NextRequest, NextResponse } from 'next/server';
import * as client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ 
  register,
  prefix: 'finance_app_',
});

// Custom metrics for the finance app
const httpRequestDuration = new client.Histogram({
  name: 'finance_app_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'finance_app_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const activeUsers = new client.Gauge({
  name: 'finance_app_active_users',
  help: 'Number of currently active users',
});

const transactionCount = new client.Counter({
  name: 'finance_app_transactions_total',
  help: 'Total number of transactions processed',
  labelNames: ['type', 'status']
});

const transactionAmount = new client.Histogram({
  name: 'finance_app_transaction_amount',
  help: 'Transaction amounts in dollars',
  labelNames: ['type', 'currency'],
  buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000]
});

const accountBalance = new client.Gauge({
  name: 'finance_app_account_balance',
  help: 'Current account balances',
  labelNames: ['account_type', 'currency']
});

const databaseQueryDuration = new client.Histogram({
  name: 'finance_app_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const cacheHitRate = new client.Counter({
  name: 'finance_app_cache_operations_total',
  help: 'Cache operations',
  labelNames: ['operation', 'result'] // hit, miss, error
});

const errorRate = new client.Counter({
  name: 'finance_app_errors_total',
  help: 'Total application errors',
  labelNames: ['type', 'severity']
});

const backgroundJobDuration = new client.Histogram({
  name: 'finance_app_background_job_duration_seconds',
  help: 'Duration of background jobs',
  labelNames: ['job_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 300, 600]
});

const webhookProcessingTime = new client.Histogram({
  name: 'finance_app_webhook_processing_duration_seconds',
  help: 'Time to process incoming webhooks',
  labelNames: ['provider', 'event_type'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Register all custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeUsers);
register.registerMetric(transactionCount);
register.registerMetric(transactionAmount);
register.registerMetric(accountBalance);
register.registerMetric(databaseQueryDuration);
register.registerMetric(cacheHitRate);
register.registerMetric(errorRate);
register.registerMetric(backgroundJobDuration);
register.registerMetric(webhookProcessingTime);

// Business metrics
const monthlyRecurringRevenue = new client.Gauge({
  name: 'finance_app_mrr_dollars',
  help: 'Monthly recurring revenue in dollars'
});

const customerLifetimeValue = new client.Histogram({
  name: 'finance_app_customer_ltv_dollars',
  help: 'Customer lifetime value in dollars',
  buckets: [100, 500, 1000, 5000, 10000, 50000]
});

const churnRate = new client.Gauge({
  name: 'finance_app_churn_rate_percentage',
  help: 'Customer churn rate percentage'
});

register.registerMetric(monthlyRecurringRevenue);
register.registerMetric(customerLifetimeValue);
register.registerMetric(churnRate);

// Security metrics
const authAttempts = new client.Counter({
  name: 'finance_app_auth_attempts_total',
  help: 'Authentication attempts',
  labelNames: ['type', 'result'] // login, register, password_reset | success, failure
});

const securityEvents = new client.Counter({
  name: 'finance_app_security_events_total',
  help: 'Security-related events',
  labelNames: ['event_type', 'severity'] // suspicious_login, rate_limit_exceeded, etc.
});

register.registerMetric(authAttempts);
register.registerMetric(securityEvents);

export async function GET(request: NextRequest) {
  try {
    // Update some real-time metrics before serving
    await updateRealTimeMetrics();
    
    const metrics = await register.metrics();
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

async function updateRealTimeMetrics() {
  try {
    // Update active users (this would typically come from your session store)
    const activeUserCount = await getActiveUserCount();
    activeUsers.set(activeUserCount);
    
    // Update account balances (this would come from your database)
    const accountBalances = await getAccountBalances();
    for (const balance of accountBalances) {
      accountBalance.set(
        { account_type: balance.type, currency: balance.currency },
        balance.amount
      );
    }
    
    // Update business metrics
    const mrr = await getMonthlyRecurringRevenue();
    monthlyRecurringRevenue.set(mrr);
    
    const currentChurnRate = await getChurnRate();
    churnRate.set(currentChurnRate);
    
  } catch (error) {
    console.error('Error updating real-time metrics:', error);
  }
}

// Mock functions - replace with actual implementations
async function getActiveUserCount(): Promise<number> {
  // This would typically query your session store or database
  // For now, return a mock value
  return Math.floor(Math.random() * 100) + 50;
}

async function getAccountBalances(): Promise<Array<{type: string, currency: string, amount: number}>> {
  // This would query your database for current account balances
  return [
    { type: 'checking', currency: 'USD', amount: 1500.50 },
    { type: 'savings', currency: 'USD', amount: 5000.00 },
    { type: 'investment', currency: 'USD', amount: 15000.25 }
  ];
}

async function getMonthlyRecurringRevenue(): Promise<number> {
  // This would calculate MRR from your subscription data
  return 50000; // $50k MRR
}

async function getChurnRate(): Promise<number> {
  // This would calculate churn rate from your customer data
  return 2.5; // 2.5% churn rate
}

// Export metrics instances for use in other parts of the application
export const metrics = {
  httpRequestDuration,
  httpRequestTotal,
  activeUsers,
  transactionCount,
  transactionAmount,
  accountBalance,
  databaseQueryDuration,
  cacheHitRate,
  errorRate,
  backgroundJobDuration,
  webhookProcessingTime,
  authAttempts,
  securityEvents,
  monthlyRecurringRevenue,
  customerLifetimeValue,
  churnRate
};

// Utility functions for recording metrics
export function recordHttpRequest(method: string, route: string, status: number, duration: number) {
  httpRequestTotal.inc({ method, route, status: status.toString() });
  httpRequestDuration.observe({ method, route, status: status.toString() }, duration / 1000);
}

export function recordTransaction(type: string, amount: number, currency: string, status: string) {
  transactionCount.inc({ type, status });
  transactionAmount.observe({ type, currency }, amount);
}

export function recordDatabaseQuery(queryType: string, table: string, duration: number) {
  databaseQueryDuration.observe({ query_type: queryType, table }, duration / 1000);
}

export function recordCacheOperation(operation: string, result: string) {
  cacheHitRate.inc({ operation, result });
}

export function recordError(type: string, severity: string) {
  errorRate.inc({ type, severity });
}

export function recordBackgroundJob(jobType: string, duration: number, status: string) {
  backgroundJobDuration.observe({ job_type: jobType, status }, duration / 1000);
}

export function recordAuthAttempt(type: string, result: string) {
  authAttempts.inc({ type, result });
}

export function recordSecurityEvent(eventType: string, severity: string) {
  securityEvents.inc({ event_type: eventType, severity });
}