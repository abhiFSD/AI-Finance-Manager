import AWS from 'aws-sdk';
import fs from 'fs/promises';
import { 
  OCRResult, 
  OCREngine, 
  OCRWord, 
  OCRBlock, 
  BoundingBox, 
  OCRError 
} from '@/types';
import { ocrLogger } from '@/utils/logger';
import { config } from '@/utils/config';

export class AWSTextractService {
  private textract: AWS.Textract;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = config.aws?.textractEnabled || false;
    
    if (this.isEnabled && config.aws) {
      AWS.config.update({
        region: config.aws.region,
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
      });

      this.textract = new AWS.Textract();
      
      ocrLogger.info('AWS Textract initialized', { 
        region: config.aws.region 
      });
    } else {
      ocrLogger.info('AWS Textract disabled or not configured');
    }
  }

  public async extractText(filePath: string): Promise<OCRResult> {
    if (!this.isEnabled || !this.textract) {
      throw new OCRError('AWS Textract is not enabled or configured', 0, OCREngine.AWS_TEXTRACT);
    }

    const startTime = Date.now();

    try {
      ocrLogger.info('Starting AWS Textract extraction', { filePath });

      const imageBytes = await fs.readFile(filePath);
      
      const params: AWS.Textract.DetectDocumentTextRequest = {
        Document: {
          Bytes: imageBytes
        }
      };

      const result = await this.textract.detectDocumentText(params).promise();

      if (!result.Blocks) {
        throw new OCRError('No text blocks found in document', 0, OCREngine.AWS_TEXTRACT);
      }

      const ocrResult = this.parseTextractResult(result);
      ocrResult.processingTime = Date.now() - startTime;

      ocrLogger.info('AWS Textract extraction completed', {
        filePath,
        confidence: ocrResult.confidence,
        textLength: ocrResult.text.length,
        processingTime: ocrResult.processingTime,
        blocksFound: result.Blocks.length
      });

      return ocrResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      ocrLogger.error('AWS Textract extraction failed', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      });

      if (error instanceof AWS.AWSError) {
        throw new OCRError(
          `AWS Textract error: ${error.message} (${error.code})`,
          0,
          OCREngine.AWS_TEXTRACT
        );
      }

      throw new OCRError(
        `AWS Textract extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        OCREngine.AWS_TEXTRACT
      );
    }
  }

  public async extractWithAnalysis(filePath: string): Promise<{
    text: OCRResult;
    analysis: any; // Form analysis, tables, etc.
  }> {
    if (!this.isEnabled || !this.textract) {
      throw new OCRError('AWS Textract is not enabled or configured', 0, OCREngine.AWS_TEXTRACT);
    }

    try {
      ocrLogger.info('Starting AWS Textract analysis', { filePath });

      const imageBytes = await fs.readFile(filePath);
      
      const params: AWS.Textract.AnalyzeDocumentRequest = {
        Document: {
          Bytes: imageBytes
        },
        FeatureTypes: ['TABLES', 'FORMS']
      };

      const result = await this.textract.analyzeDocument(params).promise();

      if (!result.Blocks) {
        throw new OCRError('No blocks found in document', 0, OCREngine.AWS_TEXTRACT);
      }

      const textResult = this.parseTextractResult(result as AWS.Textract.DetectDocumentTextResponse);
      const analysisResult = this.parseAnalysisResult(result);

      ocrLogger.info('AWS Textract analysis completed', {
        filePath,
        blocksFound: result.Blocks.length,
        tablesFound: analysisResult.tables?.length || 0,
        formsFound: analysisResult.forms?.length || 0
      });

      return {
        text: textResult,
        analysis: analysisResult
      };

    } catch (error) {
      ocrLogger.error('AWS Textract analysis failed', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new OCRError(
        `AWS Textract analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        OCREngine.AWS_TEXTRACT
      );
    }
  }

  private parseTextractResult(result: AWS.Textract.DetectDocumentTextResponse): OCRResult {
    if (!result.Blocks) {
      return {
        text: '',
        confidence: 0,
        words: [],
        blocks: [],
        processingTime: 0,
        engine: OCREngine.AWS_TEXTRACT
      };
    }

    const words: OCRWord[] = [];
    const blocks: OCRBlock[] = [];
    const lines: string[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const block of result.Blocks) {
      if (block.BlockType === 'WORD' && block.Text && block.Confidence && block.Geometry) {
        const word: OCRWord = {
          text: block.Text,
          confidence: block.Confidence,
          bbox: this.convertBoundingBox(block.Geometry.BoundingBox)
        };
        words.push(word);
        totalConfidence += block.Confidence;
        confidenceCount++;
      }

      if (block.BlockType === 'LINE' && block.Text && block.Confidence && block.Geometry) {
        lines.push(block.Text);
        
        const blockWords = words.filter(word => 
          this.isWordInBlock(word.bbox, this.convertBoundingBox(block.Geometry!.BoundingBox!))
        );

        const ocrBlock: OCRBlock = {
          text: block.Text,
          confidence: block.Confidence,
          bbox: this.convertBoundingBox(block.Geometry.BoundingBox),
          words: blockWords
        };
        blocks.push(ocrBlock);
      }
    }

    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    return {
      text: lines.join('\n'),
      confidence: averageConfidence,
      words,
      blocks,
      processingTime: 0,
      engine: OCREngine.AWS_TEXTRACT
    };
  }

  private parseAnalysisResult(result: AWS.Textract.AnalyzeDocumentResponse): any {
    if (!result.Blocks) {
      return { tables: [], forms: [] };
    }

    const tables: any[] = [];
    const forms: any[] = [];

    // Parse tables
    const tableBlocks = result.Blocks.filter(block => block.BlockType === 'TABLE');
    for (const table of tableBlocks) {
      if (table.Relationships) {
        const cells = this.extractTableCells(result.Blocks, table);
        tables.push({
          id: table.Id,
          confidence: table.Confidence,
          bbox: table.Geometry ? this.convertBoundingBox(table.Geometry.BoundingBox) : null,
          cells
        });
      }
    }

    // Parse forms (key-value pairs)
    const keyBlocks = result.Blocks.filter(block => block.BlockType === 'KEY_VALUE_SET' && 
                                          block.EntityTypes?.includes('KEY'));
    
    for (const keyBlock of keyBlocks) {
      const valueBlock = this.findValueForKey(result.Blocks, keyBlock);
      if (valueBlock) {
        forms.push({
          key: this.extractTextFromBlock(result.Blocks, keyBlock),
          value: this.extractTextFromBlock(result.Blocks, valueBlock),
          keyConfidence: keyBlock.Confidence,
          valueConfidence: valueBlock.Confidence
        });
      }
    }

    return { tables, forms };
  }

  private convertBoundingBox(bbox: AWS.Textract.BoundingBox | undefined): BoundingBox {
    if (!bbox) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    return {
      x: bbox.Left || 0,
      y: bbox.Top || 0,
      width: bbox.Width || 0,
      height: bbox.Height || 0
    };
  }

  private isWordInBlock(wordBbox: BoundingBox, blockBbox: BoundingBox): boolean {
    return wordBbox.x >= blockBbox.x &&
           wordBbox.y >= blockBbox.y &&
           wordBbox.x + wordBbox.width <= blockBbox.x + blockBbox.width &&
           wordBbox.y + wordBbox.height <= blockBbox.y + blockBbox.height;
  }

  private extractTableCells(blocks: AWS.Textract.Block[], table: AWS.Textract.Block): any[] {
    const cells: any[] = [];
    
    if (!table.Relationships) return cells;

    const cellRelationship = table.Relationships.find(rel => rel.Type === 'CHILD');
    if (!cellRelationship?.Ids) return cells;

    for (const cellId of cellRelationship.Ids) {
      const cellBlock = blocks.find(block => block.Id === cellId);
      if (cellBlock && cellBlock.BlockType === 'CELL') {
        cells.push({
          rowIndex: cellBlock.RowIndex,
          columnIndex: cellBlock.ColumnIndex,
          text: this.extractTextFromBlock(blocks, cellBlock),
          confidence: cellBlock.Confidence,
          bbox: cellBlock.Geometry ? this.convertBoundingBox(cellBlock.Geometry.BoundingBox) : null
        });
      }
    }

    return cells;
  }

  private findValueForKey(blocks: AWS.Textract.Block[], keyBlock: AWS.Textract.Block): AWS.Textract.Block | null {
    if (!keyBlock.Relationships) return null;

    const valueRelationship = keyBlock.Relationships.find(rel => rel.Type === 'VALUE');
    if (!valueRelationship?.Ids?.[0]) return null;

    return blocks.find(block => block.Id === valueRelationship.Ids![0]) || null;
  }

  private extractTextFromBlock(blocks: AWS.Textract.Block[], block: AWS.Textract.Block): string {
    if (!block.Relationships) return block.Text || '';

    const wordRelationship = block.Relationships.find(rel => rel.Type === 'CHILD');
    if (!wordRelationship?.Ids) return block.Text || '';

    const words = wordRelationship.Ids
      .map(id => blocks.find(b => b.Id === id))
      .filter(b => b && b.BlockType === 'WORD')
      .map(b => b!.Text || '')
      .join(' ');

    return words || block.Text || '';
  }

  public async isAvailable(): Promise<boolean> {
    if (!this.isEnabled || !this.textract) {
      return false;
    }

    try {
      // Test AWS connection with a simple API call
      await this.textract.describeDocumentTextDetectionJob({ JobId: 'test' }).promise();
      return true;
    } catch (error: any) {
      // If we get a specific AWS error about invalid job ID, it means the service is available
      if (error.code === 'InvalidJobIdException') {
        return true;
      }
      
      ocrLogger.warn('AWS Textract not available', { 
        error: error.message 
      });
      return false;
    }
  }

  public getConfiguration(): any {
    return {
      enabled: this.isEnabled,
      region: config.aws?.region,
      available: !!this.textract
    };
  }
}

export default AWSTextractService;