import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { 
  OCRResult, 
  OCREngine, 
  OCRWord, 
  OCRBlock, 
  BoundingBox, 
  OCRError, 
  ApiResponse 
} from '@/types';
import { ocrLogger } from '@/utils/logger';
import { config } from '@/utils/config';
import { AWSTextractService } from './aws-textract';

export class OCRService {
  private awsTextract?: AWSTextractService;

  constructor() {
    if (config.aws?.textractEnabled) {
      this.awsTextract = new AWSTextractService();
    }
  }

  public async extractText(filePath: string, engine?: OCREngine): Promise<ApiResponse<OCRResult>> {
    const startTime = Date.now();
    
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      const mimeType = this.getMimeTypeFromExtension(fileExtension);
      
      ocrLogger.info('Starting OCR extraction', { 
        filePath, 
        extension: fileExtension, 
        engine: engine || 'auto' 
      });

      let result: OCRResult;

      if (fileExtension === '.pdf') {
        result = await this.extractFromPDF(filePath);
      } else if (this.isImageFile(fileExtension)) {
        result = await this.extractFromImage(filePath, engine);
      } else {
        throw new OCRError(`Unsupported file type: ${fileExtension}`, 0, engine);
      }

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      ocrLogger.info('OCR extraction completed', { 
        filePath, 
        confidence: result.confidence, 
        textLength: result.text.length, 
        processingTime, 
        engine: result.engine 
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      ocrLogger.error('OCR extraction failed', { 
        filePath, 
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime 
      });

      return {
        success: false,
        error: {
          code: 'OCR_EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : 'OCR extraction failed',
          details: { filePath, processingTime }
        }
      };
    }
  }

  private async extractFromPDF(filePath: string): Promise<OCRResult> {
    try {
      ocrLogger.info('Extracting text from PDF', { filePath });

      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);

      // If PDF has extractable text, use it
      if (pdfData.text && pdfData.text.trim().length > 0) {
        ocrLogger.info('PDF contains extractable text', { 
          filePath, 
          textLength: pdfData.text.length 
        });

        return {
          text: pdfData.text,
          confidence: 95, // High confidence for extracted text
          words: this.parseWordsFromText(pdfData.text),
          processingTime: 0, // Will be set by caller
          engine: OCREngine.TESSERACT // PDF text extraction
        };
      }

      // If no extractable text, convert to images and OCR
      ocrLogger.info('PDF has no extractable text, converting to images for OCR', { filePath });
      
      return await this.extractFromScannedPDF(filePath);

    } catch (error) {
      ocrLogger.error('PDF text extraction failed', { 
        filePath, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      throw new OCRError(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        OCREngine.TESSERACT
      );
    }
  }

  private async extractFromScannedPDF(filePath: string): Promise<OCRResult> {
    try {
      // Convert PDF to images using pdf2pic (would need to install pdf2pic)
      // For now, we'll use a placeholder implementation
      
      ocrLogger.warn('PDF to image conversion not fully implemented', { filePath });
      
      // Placeholder: attempt direct OCR on PDF (Tesseract can handle some PDFs)
      const result = await this.extractWithTesseract(filePath);
      
      return result;

    } catch (error) {
      throw new OCRError(
        `Failed to extract text from scanned PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        OCREngine.TESSERACT
      );
    }
  }

  private async extractFromImage(filePath: string, engine?: OCREngine): Promise<OCRResult> {
    const preferredEngine = engine || config.ocr.engine;

    try {
      // Try AWS Textract first if available and preferred
      if (preferredEngine === OCREngine.AWS_TEXTRACT && this.awsTextract) {
        try {
          ocrLogger.info('Using AWS Textract for image OCR', { filePath });
          return await this.awsTextract.extractText(filePath);
        } catch (awsError) {
          ocrLogger.warn('AWS Textract failed, falling back to Tesseract', { 
            filePath, 
            error: awsError 
          });
        }
      }

      // Use Tesseract as default or fallback
      return await this.extractWithTesseract(filePath);

    } catch (error) {
      throw new OCRError(
        `Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        preferredEngine
      );
    }
  }

  private async extractWithTesseract(filePath: string): Promise<OCRResult> {
    try {
      ocrLogger.info('Using Tesseract for OCR', { filePath });

      // Preprocess image if needed
      const processedPath = await this.preprocessImage(filePath);

      const { data } = await Tesseract.recognize(
        processedPath,
        config.ocr.language,
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              ocrLogger.debug('Tesseract progress', { 
                progress: m.progress, 
                filePath 
              });
            }
          }
        }
      );

      // Clean up processed image if it's different from original
      if (processedPath !== filePath) {
        await fs.unlink(processedPath).catch(() => {
          // Ignore cleanup errors
        });
      }

      const words: OCRWord[] = data.words.map(word => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0
        }
      }));

      const blocks: OCRBlock[] = data.blocks.map(block => ({
        text: block.text,
        confidence: block.confidence,
        bbox: {
          x: block.bbox.x0,
          y: block.bbox.y0,
          width: block.bbox.x1 - block.bbox.x0,
          height: block.bbox.y1 - block.bbox.y0
        },
        words: block.words?.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0
          }
        })) || []
      }));

      const result: OCRResult = {
        text: data.text,
        confidence: data.confidence,
        words,
        blocks,
        processingTime: 0, // Will be set by caller
        engine: OCREngine.TESSERACT
      };

      // Validate confidence threshold
      if (result.confidence < config.ocr.confidenceThreshold) {
        ocrLogger.warn('OCR confidence below threshold', { 
          filePath, 
          confidence: result.confidence, 
          threshold: config.ocr.confidenceThreshold 
        });
      }

      return result;

    } catch (error) {
      throw new OCRError(
        `Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        OCREngine.TESSERACT
      );
    }
  }

  private async preprocessImage(filePath: string): Promise<string> {
    if (!config.ocr.preprocessing) {
      return filePath;
    }

    try {
      const processedPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '_ocr_processed.png');

      await sharp(filePath)
        .resize(null, 2000, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .greyscale()
        .normalize()
        .sharpen()
        .threshold(128) // Convert to black and white
        .png({ quality: 90 })
        .toFile(processedPath);

      ocrLogger.debug('Image preprocessed for OCR', { 
        originalPath: filePath, 
        processedPath 
      });

      return processedPath;

    } catch (error) {
      ocrLogger.warn('Image preprocessing failed, using original', { 
        filePath, 
        error 
      });
      return filePath;
    }
  }

  private parseWordsFromText(text: string): OCRWord[] {
    // Simple word parsing for PDF extracted text
    const words = text.split(/\s+/).filter(word => word.trim().length > 0);
    
    return words.map((word, index) => ({
      text: word,
      confidence: 95, // High confidence for PDF extracted text
      bbox: {
        x: 0,
        y: index * 20, // Approximate line height
        width: word.length * 10, // Approximate character width
        height: 20
      }
    }));
  }

  private isImageFile(extension: string): boolean {
    return ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif'].includes(extension.toLowerCase());
  }

  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.gif': 'image/gif'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  public async getAvailableEngines(): Promise<OCREngine[]> {
    const engines: OCREngine[] = [OCREngine.TESSERACT]; // Always available

    if (this.awsTextract) {
      engines.push(OCREngine.AWS_TEXTRACT);
    }

    return engines;
  }

  public async validateEngine(engine: OCREngine): Promise<boolean> {
    switch (engine) {
      case OCREngine.TESSERACT:
        return true; // Always available
      case OCREngine.AWS_TEXTRACT:
        return this.awsTextract ? await this.awsTextract.isAvailable() : false;
      default:
        return false;
    }
  }
}

export default OCRService;