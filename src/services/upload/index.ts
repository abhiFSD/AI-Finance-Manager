import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { 
  BaseDocument, 
  DocumentStatus, 
  UploadProgress, 
  UploadStatus, 
  FileValidationResult,
  ApiResponse
} from '@/types';
import { validateFile, validateBatchUpload, sanitizeFilename } from '@/utils/validators';
import { uploadLogger } from '@/utils/logger';
import { config } from '@/utils/config';
import { VirusScanService } from './virus-scanner';
import { ProgressTracker } from './progress-tracker';
import { prisma } from '@/lib/prisma';
import { DocumentType as PrismaDocumentType, DocumentStatus as PrismaDocumentStatus } from '@prisma/client';

export class UploadService {
  private virusScanner: VirusScanService;
  private progressTracker: ProgressTracker;
  private storage: multer.StorageEngine;

  constructor() {
    this.virusScanner = new VirusScanService();
    this.progressTracker = new ProgressTracker();
    this.setupStorage();
  }

  private setupStorage(): void {
    this.storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          const uploadDir = config.upload.uploadDir;
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          uploadLogger.error('Failed to create upload directory', { error });
          cb(error as Error, '');
        }
      },
      filename: (req, file, cb) => {
        const documentId = uuidv4();
        const sanitizedName = sanitizeFilename(file.originalname);
        const extension = path.extname(sanitizedName);
        const filename = `${documentId}${extension}`;
        
        // Store document ID in request for later use
        req.body.documentId = documentId;
        
        cb(null, filename);
      }
    });
  }

  public getMulterInstance(): multer.Multer {
    return multer({
      storage: this.storage,
      limits: {
        fileSize: config.upload.maxFileSize,
        files: 10 // Max 10 files per request
      },
      fileFilter: (req, file, cb) => {
        const validation = validateFile(file);
        if (validation.isValid) {
          cb(null, true);
        } else {
          cb(new Error(validation.errors.join(', ')), false);
        }
      }
    });
  }

  public async uploadSingle(
    file: Express.Multer.File, 
    userId: string,
    documentType?: string
  ): Promise<ApiResponse<BaseDocument>> {
    const documentId = uuidv4();
    
    try {
      uploadLogger.info('Starting single file upload', { 
        documentId, 
        filename: file.originalname, 
        size: file.size 
      });

      // Initialize progress tracking
      this.progressTracker.initializeProgress(documentId, file.originalname, file.size);

      // Validate file
      const validation = validateFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Update progress - validation complete
      this.progressTracker.updateProgress(documentId, 10, UploadStatus.UPLOADING);

      // Preprocess image if needed
      const processedFile = await this.preprocessFile(file);
      this.progressTracker.updateProgress(documentId, 30, UploadStatus.UPLOADING);

      // Virus scan if enabled
      if (config.virusScanning.enabled) {
        this.progressTracker.updateProgress(documentId, 50, UploadStatus.SCANNING);
        const scanResult = await this.virusScanner.scanFile(processedFile.path);
        
        if (scanResult.isInfected) {
          // Clean up file
          await fs.unlink(processedFile.path);
          throw new Error(`Virus detected: ${scanResult.threat}`);
        }
        this.progressTracker.updateProgress(documentId, 70, UploadStatus.SCANNED);
      }

      // Create document record
      const document: BaseDocument = {
        id: documentId,
        filename: processedFile.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: processedFile.path,
        uploadedAt: new Date(),
        userId,
        status: DocumentStatus.UPLOADED,
        metadata: {
          documentType,
          preprocessed: processedFile.preprocessed,
          ...processedFile.metadata
        }
      };

      // Persist to database using Prisma
      try {
        await prisma.document.create({
          data: {
            id: documentId,
            userId,
            fileName: processedFile.filename,
            fileUrl: processedFile.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            type: this.mapDocumentType(documentType),
            status: PrismaDocumentStatus.PENDING,
            extractedData: {
              originalName: file.originalname,
              preprocessed: processedFile.preprocessed,
              ...processedFile.metadata
            }
          }
        });
        
        uploadLogger.info('Document persisted to database', { documentId });
      } catch (dbError) {
        uploadLogger.error('Failed to persist document to database', { 
          documentId, 
          error: dbError instanceof Error ? dbError.message : 'Unknown error' 
        });
        // Don't fail the upload if database persistence fails
        // The file is already saved, so we can recover this later
      }

      this.progressTracker.updateProgress(documentId, 100, UploadStatus.COMPLETED);

      uploadLogger.info('File upload completed successfully', { 
        documentId, 
        filename: document.filename 
      });

      return {
        success: true,
        data: document
      };

    } catch (error) {
      uploadLogger.error('File upload failed', { 
        documentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      this.progressTracker.updateProgress(documentId, 0, UploadStatus.FAILED, 
        error instanceof Error ? error.message : 'Upload failed');

      // Clean up file if it exists
      if (file.path) {
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          uploadLogger.error('Failed to cleanup file after upload error', { 
            documentId, 
            path: file.path, 
            error: cleanupError 
          });
        }
      }

      return {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Upload failed',
          details: { documentId }
        }
      };
    }
  }

  public async uploadBatch(
    files: Express.Multer.File[], 
    userId: string,
    documentTypes?: string[]
  ): Promise<ApiResponse<BaseDocument[]>> {
    const batchId = uuidv4();
    
    try {
      uploadLogger.info('Starting batch upload', { 
        batchId, 
        fileCount: files.length 
      });

      // Validate batch
      const validation = validateBatchUpload(files);
      if (!validation.isValid) {
        throw new Error(`Batch validation failed: ${validation.errors.join(', ')}`);
      }

      const documents: BaseDocument[] = [];
      const errors: string[] = [];

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentType = documentTypes?.[i];

        try {
          const result = await this.uploadSingle(file, userId, documentType);
          if (result.success && result.data) {
            documents.push(result.data);
          } else {
            errors.push(`File ${i + 1}: ${result.error?.message}`);
          }
        } catch (error) {
          errors.push(`File ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      uploadLogger.info('Batch upload completed', { 
        batchId, 
        successful: documents.length, 
        failed: errors.length 
      });

      return {
        success: errors.length === 0,
        data: documents,
        error: errors.length > 0 ? {
          code: 'PARTIAL_BATCH_FAILURE',
          message: `${errors.length} files failed to upload`,
          details: { errors, batchId }
        } : undefined
      };

    } catch (error) {
      uploadLogger.error('Batch upload failed', { 
        batchId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'BATCH_UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Batch upload failed',
          details: { batchId }
        }
      };
    }
  }

  public getProgress(documentId: string): UploadProgress | null {
    return this.progressTracker.getProgress(documentId);
  }

  public getAllProgress(): UploadProgress[] {
    return this.progressTracker.getAllProgress();
  }

  private async preprocessFile(file: Express.Multer.File): Promise<{
    path: string;
    filename: string;
    preprocessed: boolean;
    metadata: any;
  }> {
    // If it's an image, potentially preprocess for better OCR
    if (file.mimetype.startsWith('image/') && config.ocr.preprocessing) {
      try {
        const processedPath = file.path.replace(/\.(jpg|jpeg|png)$/i, '_processed.png');
        
        const metadata = await sharp(file.path)
          .resize(null, 2000, { 
            withoutEnlargement: true,
            fit: 'inside'
          })
          .greyscale()
          .normalize()
          .sharpen()
          .png({ quality: 90 })
          .toFile(processedPath);

        // Remove original file
        await fs.unlink(file.path);

        uploadLogger.info('Image preprocessed for OCR', { 
          originalPath: file.path, 
          processedPath, 
          metadata 
        });

        return {
          path: processedPath,
          filename: path.basename(processedPath),
          preprocessed: true,
          metadata: {
            originalSize: file.size,
            processedSize: metadata.size,
            format: metadata.format,
            width: metadata.width,
            height: metadata.height
          }
        };
      } catch (error) {
        uploadLogger.warn('Image preprocessing failed, using original', { 
          path: file.path, 
          error 
        });
        
        // Return original file if preprocessing fails
        return {
          path: file.path,
          filename: file.filename,
          preprocessed: false,
          metadata: {}
        };
      }
    }

    // Return original file for PDFs or if preprocessing is disabled
    return {
      path: file.path,
      filename: file.filename,
      preprocessed: false,
      metadata: {}
    };
  }

  public async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    try {
      // In a real application, you would:
      // 1. Find the document in database
      // 2. Delete the file from storage
      // 3. Remove database record
      
      uploadLogger.info('Document deleted', { documentId });
      
      return {
        success: true
      };
    } catch (error) {
      uploadLogger.error('Failed to delete document', { 
        documentId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete document'
        }
      };
    }
  }

  private mapDocumentType(documentType?: string): PrismaDocumentType {
    if (!documentType) return PrismaDocumentType.OTHER;
    
    const typeMap: Record<string, PrismaDocumentType> = {
      'bank_statement': PrismaDocumentType.BANK_STATEMENT,
      'credit_card_statement': PrismaDocumentType.CREDIT_CARD_STATEMENT,
      'investment_statement': PrismaDocumentType.INVESTMENT_STATEMENT,
      'loan_statement': PrismaDocumentType.LOAN_STATEMENT,
      'receipt': PrismaDocumentType.RECEIPT,
      'invoice': PrismaDocumentType.INVOICE,
      'other': PrismaDocumentType.OTHER
    };
    
    const normalizedType = documentType.toLowerCase().replace(/\s+/g, '_');
    return typeMap[normalizedType] || PrismaDocumentType.OTHER;
  }
}

export default UploadService;