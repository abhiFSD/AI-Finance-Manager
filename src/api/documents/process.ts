import express, { Request, Response, NextFunction } from 'express';
import { 
  QueueJobType,
  QueueStatus,
  OCREngine,
  DocumentType,
  ApiResponse
} from '@/types';
import { apiLogger } from '@/utils/logger';
import { documentProcessor } from '@/workers/document-processor';
import { OCRService } from '@/services/ocr';
import { DocumentParserService } from '@/services/parser';

const router = express.Router();

// Initialize services
const ocrService = new OCRService();
const parserService = new DocumentParserService();

// Middleware to validate user authentication (placeholder)
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['user-id'] as string || 'anonymous';
  req.body.userId = userId;
  next();
};

// POST /api/documents/process/ocr
router.post('/ocr', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { filePath, ocrEngine, documentId } = req.body;

    if (!filePath || !documentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'filePath and documentId are required'
        }
      } as ApiResponse);
    }

    apiLogger.info('OCR processing requested', {
      documentId,
      filePath,
      ocrEngine: ocrEngine || 'default'
    });

    // Add OCR job to queue
    const job = await documentProcessor.addJob(
      QueueJobType.OCR_EXTRACT,
      {
        filePath,
        documentId,
        ocrEngine: ocrEngine as OCREngine
      },
      { priority: 7 } // Higher priority for manual OCR requests
    );

    res.json({
      success: true,
      data: {
        jobId: job.id,
        documentId,
        status: 'queued',
        message: 'OCR processing job added to queue'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('OCR processing request failed', {
      documentId: req.body.documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'OCR_REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'OCR processing request failed'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/process/parse
router.post('/parse', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { ocrResult, documentId, expectedDocumentType } = req.body;

    if (!ocrResult || !documentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'ocrResult and documentId are required'
        }
      } as ApiResponse);
    }

    apiLogger.info('Document parsing requested', {
      documentId,
      expectedDocumentType: expectedDocumentType || 'auto-detect',
      ocrTextLength: ocrResult.text?.length || 0
    });

    // Add parsing job to queue
    const job = await documentProcessor.addJob(
      QueueJobType.PARSE_DOCUMENT,
      {
        ocrResult,
        documentId,
        expectedDocumentType: expectedDocumentType as DocumentType
      },
      { priority: 7 }
    );

    res.json({
      success: true,
      data: {
        jobId: job.id,
        documentId,
        status: 'queued',
        message: 'Document parsing job added to queue'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Document parsing request failed', {
      documentId: req.body.documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'PARSING_REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Document parsing request failed'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/process/extract
router.post('/extract', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { parsedDocument, documentId } = req.body;

    if (!parsedDocument || !documentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'parsedDocument and documentId are required'
        }
      } as ApiResponse);
    }

    apiLogger.info('Transaction extraction requested', {
      documentId,
      transactionCount: parsedDocument.transactions?.length || 0,
      documentType: parsedDocument.documentType
    });

    // Add extraction job to queue
    const job = await documentProcessor.addJob(
      QueueJobType.EXTRACT_TRANSACTIONS,
      {
        parsedDocument,
        documentId
      },
      { priority: 7 }
    );

    res.json({
      success: true,
      data: {
        jobId: job.id,
        documentId,
        status: 'queued',
        message: 'Transaction extraction job added to queue'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Transaction extraction request failed', {
      documentId: req.body.documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'EXTRACTION_REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Transaction extraction request failed'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/process/full
router.post('/full', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { 
      document, 
      filePath, 
      ocrEngine, 
      expectedDocumentType,
      skipVirusScan = false 
    } = req.body;

    if (!document || !filePath) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'document and filePath are required'
        }
      } as ApiResponse);
    }

    apiLogger.info('Full document processing requested', {
      documentId: document.id,
      filePath,
      ocrEngine: ocrEngine || 'default',
      expectedDocumentType: expectedDocumentType || 'auto-detect',
      skipVirusScan
    });

    // Add full processing job to queue
    const job = await documentProcessor.addJob(
      QueueJobType.DOCUMENT_PROCESS,
      {
        document,
        filePath,
        ocrEngine: ocrEngine as OCREngine,
        expectedDocumentType: expectedDocumentType as DocumentType,
        skipVirusScan
      },
      { priority: 5 }
    );

    res.json({
      success: true,
      data: {
        jobId: job.id,
        documentId: document.id,
        status: 'queued',
        message: 'Full document processing job added to queue'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Full document processing request failed', {
      documentId: req.body.document?.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'FULL_PROCESSING_REQUEST_FAILED',
        message: error instanceof Error ? error.message : 'Full document processing request failed'
      }
    } as ApiResponse);
  }
});

// GET /api/documents/process/queue/status
router.get('/queue/status', authenticateUser, async (req: Request, res: Response) => {
  try {
    apiLogger.info('Queue status requested');

    const queueStatus = await documentProcessor.getQueueStatus();

    res.json({
      success: true,
      data: queueStatus
    } as ApiResponse<QueueStatus>);

  } catch (error) {
    apiLogger.error('Failed to get queue status', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_STATUS_FAILED',
        message: 'Failed to retrieve queue status'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/process/queue/pause
router.post('/queue/pause', authenticateUser, async (req: Request, res: Response) => {
  try {
    apiLogger.info('Queue pause requested');

    await documentProcessor.pauseQueue();

    res.json({
      success: true,
      data: {
        status: 'paused',
        message: 'Queue has been paused'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Failed to pause queue', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_PAUSE_FAILED',
        message: 'Failed to pause queue'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/process/queue/resume
router.post('/queue/resume', authenticateUser, async (req: Request, res: Response) => {
  try {
    apiLogger.info('Queue resume requested');

    await documentProcessor.resumeQueue();

    res.json({
      success: true,
      data: {
        status: 'active',
        message: 'Queue has been resumed'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Failed to resume queue', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_RESUME_FAILED',
        message: 'Failed to resume queue'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/process/queue/clean
router.post('/queue/clean', authenticateUser, async (req: Request, res: Response) => {
  try {
    apiLogger.info('Queue cleanup requested');

    const cleanupResult = await documentProcessor.cleanQueue();

    res.json({
      success: true,
      data: {
        ...cleanupResult,
        message: 'Queue cleanup completed'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Failed to clean queue', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'QUEUE_CLEAN_FAILED',
        message: 'Failed to clean queue'
      }
    } as ApiResponse);
  }
});

// GET /api/documents/process/engines/ocr
router.get('/engines/ocr', async (req: Request, res: Response) => {
  try {
    const availableEngines = await ocrService.getAvailableEngines();

    res.json({
      success: true,
      data: {
        engines: availableEngines,
        default: 'tesseract'
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Failed to get OCR engines', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'OCR_ENGINES_FAILED',
        message: 'Failed to retrieve available OCR engines'
      }
    } as ApiResponse);
  }
});

// GET /api/documents/process/types/supported
router.get('/types/supported', async (req: Request, res: Response) => {
  try {
    const supportedDocumentTypes = parserService.getSupportedDocumentTypes();
    const supportedBankTypes = parserService.getSupportedBankTypes();

    res.json({
      success: true,
      data: {
        documentTypes: supportedDocumentTypes,
        bankTypes: supportedBankTypes
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Failed to get supported types', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'SUPPORTED_TYPES_FAILED',
        message: 'Failed to retrieve supported document types'
      }
    } as ApiResponse);
  }
});

// POST /api/documents/process/detect-type
router.post('/detect-type', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'text is required'
        }
      } as ApiResponse);
    }

    apiLogger.info('Document type detection requested', {
      textLength: text.length
    });

    const detectedType = await parserService.detectDocumentType(text);
    const detectedBankType = await parserService.detectBankType(text);

    res.json({
      success: true,
      data: {
        documentType: detectedType,
        bankType: detectedBankType,
        confidence: detectedType !== 'other' ? 80 : 30
      }
    } as ApiResponse);

  } catch (error) {
    apiLogger.error('Document type detection failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'TYPE_DETECTION_FAILED',
        message: 'Failed to detect document type'
      }
    } as ApiResponse);
  }
});

export default router;