import Queue from 'bull';
import * as path from 'path';
import { 
  QueueJob, 
  QueueJobType, 
  QueueStatus, 
  DocumentProcessingError,
  BaseDocument,
  OCRResult,
  ParsedDocument,
  ApiResponse
} from '@/types';
import { config } from '@/utils/config';
import { queueLogger } from '@/utils/logger';
import { OCRService } from '@/services/ocr';
import { DocumentParserService } from '@/services/parser';
import { DataExtractionService } from '@/services/extraction';
import { extractTransactionsWithAI } from '@/services/simple-ai-extractor';
import { VirusScanService } from '@/services/upload/virus-scanner';
import { ExcelExtractor, ExcelExtractionResult } from '@/services/extractors';
import { TextExtractor, TextExtractionResult } from '@/services/extractors';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';

export class DocumentProcessorWorker {
  private processingQueue: Queue.Queue;
  private ocrService: OCRService;
  private parserService: DocumentParserService;
  private extractionService: DataExtractionService;
  private virusScanner: VirusScanService;

  constructor() {
    // Initialize Redis connection
    const redisConfig = config.queue.redis.url 
      ? config.queue.redis.url 
      : {
          host: config.queue.redis.host,
          port: config.queue.redis.port,
          password: config.queue.redis.password
        };

    // Create Bull queue
    this.processingQueue = new Queue('document-processing', redisConfig, {
      defaultJobOptions: {
        attempts: config.queue.maxRetryAttempts,
        backoff: {
          type: 'exponential',
          delay: config.queue.retryDelay,
        },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });

    // Initialize services
    this.ocrService = new OCRService();
    this.parserService = new DocumentParserService();
    this.extractionService = new DataExtractionService();
    this.virusScanner = new VirusScanService();

    this.setupWorker();
    this.setupEventListeners();
  }

  private setupWorker(): void {
    // Process jobs with specified concurrency
    this.processingQueue.process('*', config.queue.concurrency, async (job) => {
      return await this.processJob(job);
    });

    queueLogger.info('Document processor worker initialized', {
      concurrency: config.queue.concurrency,
      maxRetryAttempts: config.queue.maxRetryAttempts
    });
  }

  private setupEventListeners(): void {
    this.processingQueue.on('ready', () => {
      queueLogger.info('Queue is ready');
    });

    this.processingQueue.on('error', (error) => {
      queueLogger.error('Queue error', { error: error.message });
    });

    this.processingQueue.on('waiting', (jobId) => {
      queueLogger.debug('Job waiting', { jobId });
    });

    this.processingQueue.on('active', (job) => {
      queueLogger.info('Job started', { 
        jobId: job.id, 
        jobType: job.data.type,
        documentId: job.data.documentId 
      });
    });

    this.processingQueue.on('completed', (job, result) => {
      queueLogger.info('Job completed', { 
        jobId: job.id, 
        jobType: job.data.type,
        documentId: job.data.documentId,
        processingTime: Date.now() - job.processedOn!
      });
    });

    this.processingQueue.on('failed', (job, error) => {
      queueLogger.error('Job failed', { 
        jobId: job.id, 
        jobType: job.data.type,
        documentId: job.data.documentId,
        error: error.message,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts
      });
    });

    this.processingQueue.on('stalled', (job) => {
      queueLogger.warn('Job stalled', { 
        jobId: job.id, 
        jobType: job.data.type,
        documentId: job.data.documentId 
      });
    });
  }

  public async addJob(
    jobType: QueueJobType, 
    data: any, 
    options?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    }
  ): Promise<Queue.Job> {
    try {
      const job = await this.processingQueue.add(jobType, data, {
        priority: options?.priority || 5,
        delay: options?.delay || 0,
        attempts: options?.attempts || config.queue.maxRetryAttempts
      });

      queueLogger.info('Job added to queue', {
        jobId: job.id,
        jobType,
        documentId: data.documentId,
        priority: options?.priority || 5
      });

      return job;

    } catch (error) {
      queueLogger.error('Failed to add job to queue', {
        jobType,
        documentId: data.documentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DocumentProcessingError(
        'Failed to add job to queue',
        'QUEUE_ADD_FAILED',
        { jobType, documentId: data.documentId }
      );
    }
  }

  private async processJob(job: Queue.Job): Promise<any> {
    const type = job.name as QueueJobType; // Bull stores job type as job.name
    const { documentId } = job.data;
    const startTime = Date.now();

    try {
      queueLogger.info('Processing job', { 
        jobId: job.id, 
        type, 
        documentId,
        attempt: job.attemptsMade + 1
      });

      // Update job progress
      await job.progress(10);

      let result: any;

      switch (type) {
        case QueueJobType.VIRUS_SCAN:
          result = await this.processVirusScan(job);
          break;

        case QueueJobType.OCR_EXTRACT:
          result = await this.processOCRExtraction(job);
          break;

        case QueueJobType.PARSE_DOCUMENT:
          result = await this.processDocumentParsing(job);
          break;

        case QueueJobType.EXTRACT_TRANSACTIONS:
          result = await this.processTransactionExtraction(job);
          break;

        case QueueJobType.DOCUMENT_PROCESS:
          result = await this.processFullDocument(job);
          break;

        default:
          throw new DocumentProcessingError(
            `Unknown job type: ${type}`,
            'UNKNOWN_JOB_TYPE'
          );
      }

      const processingTime = Date.now() - startTime;
      
      queueLogger.info('Job processing completed', {
        jobId: job.id,
        type,
        documentId,
        processingTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      queueLogger.error('Job processing failed', {
        jobId: job.id,
        type,
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        attempt: job.attemptsMade + 1
      });

      // Re-throw error to let Bull handle retries
      throw error;
    }
  }

  private async processVirusScan(job: Queue.Job): Promise<any> {
    const { filePath, documentId } = job.data;

    await job.progress(25);

    const scanResult = await this.virusScanner.scanFile(filePath);

    await job.progress(100);

    if (scanResult.isInfected) {
      throw new DocumentProcessingError(
        `Virus detected: ${scanResult.threat}`,
        'VIRUS_DETECTED',
        { threat: scanResult.threat }
      );
    }

    return {
      documentId,
      scanResult,
      status: 'clean'
    };
  }

  private async processOCRExtraction(job: Queue.Job): Promise<OCRResult> {
    const { filePath, documentId, ocrEngine } = job.data;

    await job.progress(25);

    const ocrResult = await this.ocrService.extractText(filePath, ocrEngine);

    await job.progress(100);

    if (!ocrResult.success || !ocrResult.data) {
      throw new DocumentProcessingError(
        `OCR extraction failed: ${ocrResult.error?.message}`,
        'OCR_EXTRACTION_FAILED',
        ocrResult.error?.details
      );
    }

    return ocrResult.data;
  }

  private async processDocumentParsing(job: Queue.Job): Promise<ParsedDocument> {
    const { ocrResult, documentId, expectedDocumentType } = job.data;

    await job.progress(25);

    const parseResult = await this.parserService.parseDocument(
      ocrResult, 
      documentId, 
      expectedDocumentType
    );

    await job.progress(100);

    if (!parseResult.success || !parseResult.data) {
      throw new DocumentProcessingError(
        `Document parsing failed: ${parseResult.error?.message}`,
        'DOCUMENT_PARSING_FAILED',
        parseResult.error?.details
      );
    }

    return parseResult.data;
  }

  private async processTransactionExtraction(job: Queue.Job): Promise<any> {
    const { parsedDocument, documentId } = job.data;

    await job.progress(25);

    const extractionResult = await this.extractionService.extractAndNormalize(
      parsedDocument,
      documentId
    );

    await job.progress(100);

    if (!extractionResult.success || !extractionResult.data) {
      throw new DocumentProcessingError(
        `Transaction extraction failed: ${extractionResult.error?.message}`,
        'TRANSACTION_EXTRACTION_FAILED',
        extractionResult.error?.details
      );
    }

    return extractionResult.data;
  }

  /**
   * Extract raw data from file based on mimeType
   * Routes to appropriate extractor (Excel, Text, or OCR)
   */
  private async extractRawData(
    filePath: string,
    mimeType: string,
    documentId: string
  ): Promise<string> {
    queueLogger.info('Extracting raw data based on mimeType', {
      documentId,
      mimeType,
      filePath
    });

    const lowerMimeType = mimeType.toLowerCase();
    const fileExtension = path.extname(filePath).toLowerCase();

    try {
      // Validate file size (max 50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      const fileStats = fs.statSync(filePath);
      
      if (fileStats.size > MAX_FILE_SIZE) {
        throw new DocumentProcessingError(
          `File size exceeds maximum limit of 50MB (actual: ${(fileStats.size / 1024 / 1024).toFixed(2)}MB)`,
          'FILE_SIZE_EXCEEDED',
          { filePath, fileSize: fileStats.size, maxSize: MAX_FILE_SIZE }
        );
      }

      queueLogger.debug('File size validation passed', {
        documentId,
        fileSize: fileStats.size
      });
      // Route to Excel extractor for Excel files
      if (
        lowerMimeType.includes('spreadsheet') ||
        lowerMimeType.includes('excel') ||
        lowerMimeType.includes('vnd.ms-excel') ||
        lowerMimeType.includes('vnd.openxmlformats') ||
        ['.xls', '.xlsx'].includes(fileExtension)
      ) {
        queueLogger.debug('Routing to Excel extractor', { documentId, mimeType });
        const excelResult: ExcelExtractionResult = await ExcelExtractor.extract(filePath);

        if (!excelResult.success) {
          throw new DocumentProcessingError(
            `Excel extraction failed: ${excelResult.error}`,
            'EXCEL_EXTRACTION_FAILED',
            { filePath, mimeType }
          );
        }

        return excelResult.data || JSON.stringify(excelResult.jsonData);
      }

      // Route to Text extractor for text/CSV files
      if (
        lowerMimeType.includes('text') ||
        lowerMimeType.includes('csv') ||
        lowerMimeType.includes('plain') ||
        ['.txt', '.csv'].includes(fileExtension)
      ) {
        queueLogger.debug('Routing to Text extractor', { documentId, mimeType });
        const textResult: TextExtractionResult = await TextExtractor.extract(filePath);

        if (!textResult.success) {
          throw new DocumentProcessingError(
            `Text extraction failed: ${textResult.error}`,
            'TEXT_EXTRACTION_FAILED',
            { filePath, mimeType }
          );
        }

        return textResult.data || '';
      }

      // Default: return empty string, OCR will handle it in PDF/image pipeline
      queueLogger.debug('No specific extractor matched, defaulting to OCR pipeline', {
        documentId,
        mimeType,
        fileExtension
      });

      return '';
    } catch (error) {
      queueLogger.error('Error during raw data extraction', {
        documentId,
        mimeType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Parse extracted raw data using AI parser
   * Converts structured data to parsed document format
   */
  private async parseExtractedData(
    rawData: string,
    mimeType: string,
    documentId: string,
    expectedDocumentType?: string
  ): Promise<ParsedDocument> {
    queueLogger.info('Parsing extracted data with AI parser', {
      documentId,
      mimeType,
      dataLength: rawData.length,
      expectedDocumentType
    });

    try {
      // Convert raw data to OCR-like result format for parser
      const ocrResult: OCRResult = {
        text: rawData,
        engine: 'file-extractor',
        confidence: 95, // High confidence for structured data extraction
        metadata: {
          source: 'excel-text-extractor',
          mimeType,
          processedAt: new Date()
        }
      };

      // Use existing parser service to parse the data
      const parseResult = await this.parserService.parseDocument(
        ocrResult,
        documentId,
        expectedDocumentType as any
      );

      if (!parseResult.success || !parseResult.data) {
        throw new DocumentProcessingError(
          `AI parsing failed: ${parseResult.error?.message}`,
          'AI_PARSING_FAILED',
          parseResult.error?.details
        );
      }

      queueLogger.info('AI parsing completed', {
        documentId,
        documentType: parseResult.data.documentType,
        transactionCount: parseResult.data.transactions.length
      });

      return parseResult.data;
    } catch (error) {
      queueLogger.error('Error during AI parsing', {
        documentId,
        mimeType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  private async processFullDocument(job: Queue.Job): Promise<any> {
    const { 
      document, 
      filePath, 
      ocrEngine, 
      expectedDocumentType,
      skipVirusScan = false,
      userId
    } = job.data;

    const documentId = document.id;
    const mimeType = document.mimeType || '';

    try {
      // Update document status to PROCESSING immediately
      await this.updateDocumentStatus(documentId, 'PROCESSING', {
        startedAt: new Date()
      });

      queueLogger.info('Starting full document processing with AI integration', {
        documentId,
        mimeType,
        filePath,
        expectedDocumentType,
        userId
      });

      // Step 1: Virus scan (if enabled and not skipped)
      if (config.virusScanning.enabled && !skipVirusScan) {
        await job.progress(5);
        queueLogger.debug('Performing virus scan', { documentId });
        const scanResult = await this.virusScanner.scanFile(filePath);
        
        if (scanResult.isInfected) {
          throw new DocumentProcessingError(
            `Virus detected: ${scanResult.threat}`,
            'VIRUS_DETECTED',
            { threat: scanResult.threat }
          );
        }
        queueLogger.debug('Virus scan passed', { documentId });
      }

      // Step 2: Extract raw data based on file type
      let rawData: string;
      const isStructuredFile = mimeType.includes('spreadsheet') || 
                              mimeType.includes('excel') || 
                              mimeType.includes('text') ||
                              mimeType.includes('csv') ||
                              ['.xls', '.xlsx', '.txt', '.csv'].includes(path.extname(filePath).toLowerCase());

      await job.progress(15);

      if (isStructuredFile) {
        queueLogger.info('Processing as structured file with targeted extractor', {
          documentId,
          mimeType
        });
        
        rawData = await this.extractRawData(filePath, mimeType, documentId);
      } else {
        queueLogger.info('Processing as document with OCR pipeline', {
          documentId,
          mimeType
        });
        
        // Fall back to OCR for PDF/images
        const ocrResult = await this.ocrService.extractText(filePath, ocrEngine);
        
        if (!ocrResult.success || !ocrResult.data) {
          throw new DocumentProcessingError(
            `OCR extraction failed: ${ocrResult.error?.message}`,
            'OCR_EXTRACTION_FAILED'
          );
        }
        
        rawData = ocrResult.data.text;
      }

      await job.progress(30);
      queueLogger.debug('Raw data extraction completed', {
        documentId,
        dataLength: rawData.length
      });

      // Validate that raw data is not empty
      if (rawData.length === 0) {
        throw new DocumentProcessingError(
          'Extracted data is empty. Unable to process document.',
          'EMPTY_FILE_CONTENT',
          { documentId, filePath, mimeType }
        );
      }

      queueLogger.debug('Empty file validation passed', {
        documentId,
        dataLength: rawData.length
      });

      // Step 3: Direct AI extraction for structured files (simpler approach!)
      await job.progress(40);
      queueLogger.info('Using direct AI extraction for structured file', { documentId, mimeType });
      
      const aiExtracted = await extractTransactionsWithAI(rawData, userId);
      
      queueLogger.info('Direct AI extraction completed', {
        documentId,
        bankName: aiExtracted.accountInfo.bankName,
        transactionCount: aiExtracted.transactions.length
      });

      const extractionResult = {
        success: true,
        data: aiExtracted.transactions.map(txn => ({
          ...txn,
          date: new Date(txn.date),
          categoryId: null, // Will be categorized later
        }))
      };

      // Step 4: Account detection (without creating account)
      await job.progress(70);
      queueLogger.info('Performing account detection', { documentId });
      
      const accountDetected = {
        accountNumber: aiExtracted.accountInfo.accountNumber,
        accountHolder: aiExtracted.accountInfo.accountHolder || 'Unknown',
        bankType: aiExtracted.accountInfo.bankName,
        documentType: 'bank_statement'
      };

      queueLogger.debug('Account detected (not created)', {
        documentId,
        accountNumber: accountDetected.accountNumber,
        bankType: accountDetected.bankType
      });

      // Step 5: Build extraction result with metadata
      await job.progress(80);
      const extractedDataResult = {
        accountInfo: aiExtracted.accountInfo,
        transactions: extractionResult.data,
        extractedAt: new Date().toISOString(),
        extractedBy: 'ai',
        confidence: 0.95,
        metadata: {
          bankName: aiExtracted.accountInfo.bankName,
          transactionCount: extractionResult.data.length,
          accountNumber: accountDetected.accountNumber,
          accountHolder: accountDetected.accountHolder
        }
      };

      queueLogger.debug('Extraction result prepared', {
        documentId,
        transactionCount: extractionResult.data.length,
        bankName: extractedDataResult.metadata.bankName
      });

      // Step 6: Update document status to EXTRACTED with extractedData
      await job.progress(90);
      queueLogger.info('Updating document status to EXTRACTED', {
        documentId,
        transactionCount: extractionResult.data.length
      });

      await this.updateDocumentStatus(documentId, 'EXTRACTED', {
        extractedData: JSON.stringify(extractedDataResult),
        extractedAt: new Date(),
        accountNumber: accountDetected.accountNumber,
        bankType: accountDetected.bankType,
        documentType: accountDetected.documentType,
        transactionCount: extractionResult.data.length
      });

      queueLogger.info('Document status updated to EXTRACTED', {
        documentId,
        transactionCount: extractionResult.data.length,
        accountNumber: accountDetected.accountNumber
      });

      await job.progress(100);

      queueLogger.info('Full document processing completed successfully', {
        documentId,
        mimeType,
        transactionCount: extractionResult.data.length,
        accountNumber: accountDetected.accountNumber,
        bankType: accountDetected.bankType,
        status: 'EXTRACTED'
      });

      return {
        documentId,
        extractionResult: extractedDataResult,
        accountDetected,
        status: 'EXTRACTED',
        processingMethod: isStructuredFile ? 'file-extractor' : 'ocr'
      };

    } catch (error) {
      queueLogger.error('Full document processing failed', {
        documentId,
        mimeType,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DocumentProcessingError ? error.code : 'UNKNOWN'
      });
      
      // Update document status to FAILED
      try {
        await this.updateDocumentStatus(documentId, 'FAILED', {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: error instanceof DocumentProcessingError ? error.code : 'UNKNOWN'
        });
      } catch (statusError) {
        queueLogger.error('Failed to update document status to FAILED', {
          documentId,
          error: statusError instanceof Error ? statusError.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  }



  /**
   * Update document status in database
   */
  private async updateDocumentStatus(
    documentId: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Extract special fields that should go to their own columns
      const { extractedData, extractedAt, ...remainingMetadata } = metadata || {};
      
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status,
          extractedData: extractedData || undefined,
          extractedAt: extractedAt || undefined,
          metadata: Object.keys(remainingMetadata).length > 0 ? JSON.stringify(remainingMetadata) : undefined,
          updatedAt: new Date()
        }
      });

      queueLogger.debug('Document status updated', {
        documentId,
        status,
        metadata
      });
    } catch (error) {
      queueLogger.error('Failed to update document status', {
        documentId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DocumentProcessingError(
        `Failed to update document status to ${status}`,
        'DOCUMENT_STATUS_UPDATE_FAILED',
        { documentId, status }
      );
    }
  }

  public async getQueueStatus(): Promise<QueueStatus> {
    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        this.processingQueue.getWaiting(),
        this.processingQueue.getActive(),
        this.processingQueue.getCompleted(),
        this.processingQueue.getFailed(),
        this.processingQueue.getDelayed(),
        this.processingQueue.getPaused()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: paused.length
      };

    } catch (error) {
      queueLogger.error('Failed to get queue status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DocumentProcessingError(
        'Failed to get queue status',
        'QUEUE_STATUS_FAILED'
      );
    }
  }

  public async pauseQueue(): Promise<void> {
    await this.processingQueue.pause();
    queueLogger.info('Queue paused');
  }

  public async resumeQueue(): Promise<void> {
    await this.processingQueue.resume();
    queueLogger.info('Queue resumed');
  }

  public async cleanQueue(): Promise<{
    completed: number;
    failed: number;
    active: number;
  }> {
    const [completed, failed, active] = await Promise.all([
      this.processingQueue.clean(24 * 60 * 60 * 1000, 'completed'), // Clean completed jobs older than 24 hours
      this.processingQueue.clean(24 * 60 * 60 * 1000, 'failed'), // Clean failed jobs older than 24 hours
      this.processingQueue.clean(0, 'active') // Clean stalled active jobs
    ]);

    queueLogger.info('Queue cleaned', { completed, failed, active });

    return { completed, failed, active };
  }

  public async shutdown(): Promise<void> {
    queueLogger.info('Shutting down document processor worker');
    
    await this.processingQueue.close();
    
    queueLogger.info('Document processor worker shut down completed');
  }
}

// Create and export worker instance
export const documentProcessor = new DocumentProcessorWorker();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  queueLogger.info('Received SIGTERM, shutting down gracefully');
  await documentProcessor.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  queueLogger.info('Received SIGINT, shutting down gracefully');
  await documentProcessor.shutdown();
  process.exit(0);
});

export default DocumentProcessorWorker;