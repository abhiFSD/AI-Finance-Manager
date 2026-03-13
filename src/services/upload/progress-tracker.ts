import { UploadProgress, UploadStatus } from '@/types';
import { uploadLogger } from '@/utils/logger';

export class ProgressTracker {
  private progressMap: Map<string, UploadProgress> = new Map();
  private readonly maxEntries = 1000; // Prevent memory leaks
  private readonly cleanupInterval = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Set up periodic cleanup of old progress entries
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  public initializeProgress(
    documentId: string, 
    filename: string, 
    totalBytes: number
  ): void {
    const progress: UploadProgress = {
      documentId,
      filename,
      uploadedBytes: 0,
      totalBytes,
      percentage: 0,
      status: UploadStatus.UPLOADING
    };

    this.progressMap.set(documentId, progress);
    
    uploadLogger.debug('Progress initialized', { 
      documentId, 
      filename, 
      totalBytes 
    });
  }

  public updateProgress(
    documentId: string, 
    percentage: number, 
    status: UploadStatus,
    error?: string
  ): void {
    const progress = this.progressMap.get(documentId);
    if (!progress) {
      uploadLogger.warn('Attempted to update progress for unknown document', { 
        documentId 
      });
      return;
    }

    progress.percentage = Math.min(100, Math.max(0, percentage));
    progress.uploadedBytes = Math.floor((progress.percentage / 100) * progress.totalBytes);
    progress.status = status;
    
    if (error) {
      progress.error = error;
    }

    this.progressMap.set(documentId, progress);
    
    uploadLogger.debug('Progress updated', { 
      documentId, 
      percentage: progress.percentage, 
      status,
      error 
    });
  }

  public updateBytes(
    documentId: string, 
    uploadedBytes: number, 
    status?: UploadStatus
  ): void {
    const progress = this.progressMap.get(documentId);
    if (!progress) {
      uploadLogger.warn('Attempted to update bytes for unknown document', { 
        documentId 
      });
      return;
    }

    progress.uploadedBytes = Math.min(progress.totalBytes, Math.max(0, uploadedBytes));
    progress.percentage = (progress.uploadedBytes / progress.totalBytes) * 100;
    
    if (status) {
      progress.status = status;
    }

    this.progressMap.set(documentId, progress);
    
    uploadLogger.debug('Progress bytes updated', { 
      documentId, 
      uploadedBytes: progress.uploadedBytes, 
      percentage: progress.percentage 
    });
  }

  public getProgress(documentId: string): UploadProgress | null {
    return this.progressMap.get(documentId) || null;
  }

  public getAllProgress(): UploadProgress[] {
    return Array.from(this.progressMap.values());
  }

  public getActiveUploads(): UploadProgress[] {
    return Array.from(this.progressMap.values()).filter(
      progress => progress.status === UploadStatus.UPLOADING ||
                  progress.status === UploadStatus.SCANNING
    );
  }

  public getCompletedUploads(): UploadProgress[] {
    return Array.from(this.progressMap.values()).filter(
      progress => progress.status === UploadStatus.COMPLETED
    );
  }

  public getFailedUploads(): UploadProgress[] {
    return Array.from(this.progressMap.values()).filter(
      progress => progress.status === UploadStatus.FAILED
    );
  }

  public removeProgress(documentId: string): boolean {
    const removed = this.progressMap.delete(documentId);
    
    if (removed) {
      uploadLogger.debug('Progress removed', { documentId });
    }
    
    return removed;
  }

  public clearCompleted(): number {
    const completed = Array.from(this.progressMap.entries()).filter(
      ([_, progress]) => progress.status === UploadStatus.COMPLETED
    );

    for (const [documentId] of completed) {
      this.progressMap.delete(documentId);
    }

    uploadLogger.info('Cleared completed uploads', { count: completed.length });
    return completed.length;
  }

  public clearFailed(): number {
    const failed = Array.from(this.progressMap.entries()).filter(
      ([_, progress]) => progress.status === UploadStatus.FAILED
    );

    for (const [documentId] of failed) {
      this.progressMap.delete(documentId);
    }

    uploadLogger.info('Cleared failed uploads', { count: failed.length });
    return failed.length;
  }

  public getStats(): {
    total: number;
    uploading: number;
    scanning: number;
    completed: number;
    failed: number;
  } {
    const all = Array.from(this.progressMap.values());
    
    return {
      total: all.length,
      uploading: all.filter(p => p.status === UploadStatus.UPLOADING).length,
      scanning: all.filter(p => p.status === UploadStatus.SCANNING).length,
      completed: all.filter(p => p.status === UploadStatus.COMPLETED).length,
      failed: all.filter(p => p.status === UploadStatus.FAILED).length
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    const entries = Array.from(this.progressMap.entries());
    
    // Remove old completed/failed uploads
    let removedCount = 0;
    for (const [documentId, progress] of entries) {
      const isOld = (progress.status === UploadStatus.COMPLETED || 
                     progress.status === UploadStatus.FAILED);
      
      if (isOld) {
        this.progressMap.delete(documentId);
        removedCount++;
      }
    }

    // If still over limit, remove oldest entries
    if (this.progressMap.size > this.maxEntries) {
      const sortedEntries = Array.from(this.progressMap.entries())
        .sort(([, a], [, b]) => {
          // Sort by status priority (active first) then by filename
          const statusPriority = {
            [UploadStatus.UPLOADING]: 0,
            [UploadStatus.SCANNING]: 1,
            [UploadStatus.COMPLETED]: 2,
            [UploadStatus.FAILED]: 3
          };
          
          const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
          if (priorityDiff !== 0) return priorityDiff;
          
          return a.filename.localeCompare(b.filename);
        });

      const toKeep = sortedEntries.slice(0, this.maxEntries);
      const toRemove = sortedEntries.slice(this.maxEntries);
      
      this.progressMap.clear();
      for (const [documentId, progress] of toKeep) {
        this.progressMap.set(documentId, progress);
      }
      
      removedCount += toRemove.length;
    }

    if (removedCount > 0) {
      uploadLogger.info('Progress cleanup completed', { 
        removedCount, 
        remaining: this.progressMap.size 
      });
    }
  }
}

export default ProgressTracker;