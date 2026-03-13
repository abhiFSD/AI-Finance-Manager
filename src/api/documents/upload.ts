import express, { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '@/middleware/auth';
import rateLimit from 'express-rate-limit';
import { 
  BaseDocument,
  DocumentType,
  UploadProgress,
  ApiResponse,
  QueueJobType
} from '@/types';
import { config } from '@/utils/config';
import { apiLogger } from '@/utils/logger';
import { UploadService } from '@/services/upload';
import { documentProcessor } from '@/workers/document-processor';

const router = express.Router();

// Rate limiting for upload endpoints
const uploadLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequests,
  message: 'Too many upload requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize upload service
const uploadService = new UploadService();

// Middleware to validate user authentication
const authenticateUser = authenticateToken;

// GET /api/documents/upload/progress/:documentId
router.get('/progress/:documentId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    apiLogger.info('Fetching upload progress', { documentId });

    const progress = uploadService.getProgress(documentId);

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROGRESS_NOT_FOUND',
          message: 'Upload progress not found for the specified document'
        }
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: progress
    } as ApiResponse<UploadProgress>);

  } catch (error) {
    apiLogger.error('Failed to fetch upload progress', {
      documentId: req.params.documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch upload progress'
      }
    } as ApiResponse);
  }
});

// GET /api/documents/upload/progress
router.get('/progress', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    apiLogger.info('Fetching all upload progress', { userId });

    const allProgress = uploadService.getAllProgress();

    // Filter by user if needed (would require storing userId in progress)
    // const userProgress = allProgress.filter(p => p.userId === userId);

    res.json({
      success: true,
      data: allProgress
    } as ApiResponse<UploadProgress[]>);

  } catch (error) {
    apiLogger.error('Failed to fetch all upload progress', {
      userId: req.user!.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch upload progress'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/upload/single
router.post('/single', uploadLimiter, authenticateUser, async (req: Request, res: Response) => {
  try {
    const multer = uploadService.getMulterInstance();
    const upload = multer.single('document');

    upload(req, res, async (err) => {
      if (err) {
        apiLogger.error('Multer upload error', {
          error: err.message,
          userId: req.user!.id
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message
          }
        } as ApiResponse);
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file was uploaded'
          }
        } as ApiResponse);
      }

      const userId = req.user!.id;
      const documentType = req.body.documentType as DocumentType;
      const autoProcess = req.body.autoProcess === 'true';

      apiLogger.info('Single file upload initiated', {
        filename: req.file.originalname,
        size: req.file.size,
        userId,
        documentType,
        autoProcess
      });

      try {
        // Upload the file
        const uploadResult = await uploadService.uploadSingle(
          req.file,
          userId,
          documentType
        );

        if (!uploadResult.success || !uploadResult.data) {
          return res.status(500).json(uploadResult);
        }

        const document = uploadResult.data;

        // If auto-processing is enabled, add to queue
        if (autoProcess) {
          await documentProcessor.addJob(
            QueueJobType.DOCUMENT_PROCESS,
            {
              document,
              filePath: req.file.path,
              expectedDocumentType: documentType,
              userId
            },
            { priority: 5 }
          );

          apiLogger.info('Document added to processing queue', {
            documentId: document.id,
            autoProcess
          });
        }

        res.status(201).json({
          success: true,
          data: {
            document,
            autoProcess,
            message: autoProcess 
              ? 'File uploaded successfully and added to processing queue'
              : 'File uploaded successfully'
          }
        } as ApiResponse);

      } catch (processError) {
        apiLogger.error('File upload processing failed', {
          filename: req.file.originalname,
          error: processError instanceof Error ? processError.message : 'Unknown error'
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'UPLOAD_PROCESSING_FAILED',
            message: processError instanceof Error ? processError.message : 'Upload processing failed'
          }
        } as ApiResponse);
      }
    });

  } catch (error) {
    apiLogger.error('Single file upload endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during upload'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/upload/batch
router.post('/batch', uploadLimiter, authenticateUser, async (req: Request, res: Response) => {
  try {
    const multer = uploadService.getMulterInstance();
    const upload = multer.array('documents', 10); // Max 10 files

    upload(req, res, async (err) => {
      if (err) {
        apiLogger.error('Multer batch upload error', {
          error: err.message,
          userId: req.user!.id
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message
          }
        } as ApiResponse);
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files were uploaded'
          }
        } as ApiResponse);
      }

      const userId = req.user!.id;
      const documentTypes = req.body.documentTypes 
        ? JSON.parse(req.body.documentTypes) 
        : [];
      const autoProcess = req.body.autoProcess === 'true';

      apiLogger.info('Batch file upload initiated', {
        fileCount: files.length,
        userId,
        documentTypes,
        autoProcess
      });

      try {
        // Upload all files
        const uploadResult = await uploadService.uploadBatch(
          files,
          userId,
          documentTypes
        );

        if (!uploadResult.success || !uploadResult.data) {
          return res.status(500).json(uploadResult);
        }

        const documents = uploadResult.data;
        const processedDocuments = [];

        // If auto-processing is enabled, add each document to queue
        if (autoProcess && documents.length > 0) {
          for (let i = 0; i < documents.length; i++) {
            const document = documents[i];
            const file = files[i];
            const documentType = documentTypes[i];

            try {
              await documentProcessor.addJob(
                QueueJobType.DOCUMENT_PROCESS,
                {
                  document,
                  filePath: file.path,
                  expectedDocumentType: documentType,
                  userId
                },
                { priority: 5 }
              );

              processedDocuments.push(document.id);
            } catch (queueError) {
              apiLogger.error('Failed to add document to processing queue', {
                documentId: document.id,
                error: queueError instanceof Error ? queueError.message : 'Unknown error'
              });
            }
          }

          apiLogger.info('Documents added to processing queue', {
            totalDocuments: documents.length,
            queuedDocuments: processedDocuments.length
          });
        }

        res.status(201).json({
          success: true,
          data: {
            documents,
            processedDocuments,
            autoProcess,
            message: autoProcess 
              ? `${documents.length} files uploaded successfully, ${processedDocuments.length} added to processing queue`
              : `${documents.length} files uploaded successfully`
          }
        } as ApiResponse);

      } catch (processError) {
        apiLogger.error('Batch file upload processing failed', {
          fileCount: files.length,
          error: processError instanceof Error ? processError.message : 'Unknown error'
        });

        res.status(500).json({
          success: false,
          error: {
            code: 'BATCH_UPLOAD_PROCESSING_FAILED',
            message: processError instanceof Error ? processError.message : 'Batch upload processing failed'
          }
        } as ApiResponse);
      }
    });

  } catch (error) {
    apiLogger.error('Batch file upload endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during batch upload'
      }
    } as ApiResponse);
  }
});

// DELETE /api/documents/upload/:documentId
router.delete('/:documentId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.id;

    apiLogger.info('Deleting document', { documentId, userId });

    const deleteResult = await uploadService.deleteDocument(documentId);

    if (!deleteResult.success) {
      return res.status(500).json(deleteResult);
    }

    res.json({
      success: true,
      data: {
        documentId,
        message: 'Document deleted successfully'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Document deletion failed', {
      documentId: req.params.documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETION_FAILED',
        message: 'Failed to delete document'
      }
    } as ApiResponse);
  }
});

export default router;