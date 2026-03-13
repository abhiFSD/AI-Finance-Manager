import express from 'express';
import uploadRouter from './upload';
import processRouter from './process';
import importRouter from './import';
import { authenticateToken } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { findMatchingAccount, suggestAccountCreationData } from '../../utils/account-matcher';

const router = express.Router();

// Mount sub-routers
router.use('/upload', uploadRouter);
router.use('/process', processRouter);
router.use('/', importRouter);

// GET /api/documents/health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        upload: 'active',
        processing: 'active',
        ocr: 'active',
        extraction: 'active'
      }
    }
  });
});

// GET /api/documents - List all user documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Query parameters for filtering and pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    // Build where clause
    const where: any = {
      userId,
      ...(type && { type }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { fileName: { contains: search, mode: 'insensitive' } },
          { type: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Get total count
    const total = await prisma.document.count({ where });

    // Get documents with pagination
    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      message: 'Documents retrieved successfully',
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// GET /api/documents/:documentId - Get document details with extracted data
router.get('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.id;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        transactions: {
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            type: true,
            merchantName: true,
            categoryId: true,
            category: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' }
      });
    }

    if (document.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      });
    }

    let extractedTransactions = null;
    if (document.extractedData) {
      extractedTransactions = typeof document.extractedData === 'string' 
        ? JSON.parse(document.extractedData)
        : document.extractedData;
    }

    res.json({
      success: true,
      data: {
        document: {
          id: document.id,
          filename: document.fileName,
          type: document.type,
          status: document.status,
          uploadedAt: document.uploadedAt,
          extractedAt: document.extractedAt,
          reviewedAt: document.reviewedAt,
          importedAt: document.importedAt,
          mimeType: document.mimeType,
          size: document.fileSize,
          metadata: document.metadata
        },
        extractedTransactions,
        importedTransactions: document.status === 'IMPORTED' ? document.transactions : null
      }
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch document' }
    });
  }
});

// PATCH /api/documents/:documentId/status - Update document status
router.patch('/:documentId/status', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status } = req.body;
    const userId = req.user!.id;

    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' }
      });
    }

    const updateData: any = { status };
    if (status === 'EXTRACTED') updateData.extractedAt = new Date();
    if (status === 'REVIEWED') updateData.reviewedAt = new Date();
    if (status === 'IMPORTED') updateData.importedAt = new Date();

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: updateData
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: 'Failed to update status' }
    });
  }
});

export default router;