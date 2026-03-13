import { ReportConfiguration, ReportSchedule } from './types';

export class ScheduledReportsService {
  private scheduledReports: Map<string, ReportConfiguration> = new Map();
  private isRunning = false;

  constructor() {
    this.startScheduler();
  }

  addScheduledReport(config: ReportConfiguration): void {
    if (config.schedule) {
      this.scheduledReports.set(config.id, config);
    }
  }

  removeScheduledReport(configId: string): void {
    this.scheduledReports.delete(configId);
  }

  private startScheduler(): void {
    // Check for scheduled reports every hour
    setInterval(() => {
      this.checkAndRunScheduledReports();
    }, 3600000); // 1 hour
  }

  private async checkAndRunScheduledReports(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    try {
      const now = new Date();
      
      for (const [configId, config] of this.scheduledReports) {
        if (this.shouldRun(config.schedule!, now)) {
          console.log(`Running scheduled report: ${config.name}`);
          // In real implementation, this would trigger report generation
          await this.runScheduledReport(config);
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  private shouldRun(schedule: ReportSchedule, currentTime: Date): boolean {
    if (!schedule.isActive) return false;
    if (schedule.nextRunDate > currentTime) return false;
    
    return true;
  }

  private async runScheduledReport(config: ReportConfiguration): Promise<void> {
    // Update next run date
    if (config.schedule) {
      config.schedule.lastRunDate = new Date();
      config.schedule.nextRunDate = this.calculateNextRunDate(config.schedule);
    }
    
    console.log(`Scheduled report ${config.name} executed successfully`);
  }

  private calculateNextRunDate(schedule: ReportSchedule): Date {
    const nextRun = new Date(schedule.nextRunDate);
    
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
      case 'yearly':
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        break;
    }
    
    return nextRun;
  }

  getScheduledReports(): ReportConfiguration[] {
    return Array.from(this.scheduledReports.values());
  }

  getUpcomingReports(days: number = 7): Array<{
    config: ReportConfiguration;
    nextRun: Date;
    daysUntil: number;
  }> {
    const upcoming: Array<{
      config: ReportConfiguration;
      nextRun: Date;
      daysUntil: number;
    }> = [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    this.scheduledReports.forEach(config => {
      if (config.schedule && config.schedule.nextRunDate <= cutoffDate) {
        const daysUntil = Math.ceil(
          (config.schedule.nextRunDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        upcoming.push({
          config,
          nextRun: config.schedule.nextRunDate,
          daysUntil
        });
      }
    });

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }
}