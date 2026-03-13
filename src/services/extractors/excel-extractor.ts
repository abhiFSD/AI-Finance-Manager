import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export interface ExcelExtractionResult {
  success: boolean;
  data?: string; // CSV format
  jsonData?: Record<string, any>[];
  error?: string;
  fileName?: string;
  sheetName?: string;
  rowCount?: number;
}

export class ExcelExtractor {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly ALLOWED_DIR = path.resolve('./uploads');

  /**
   * Validate file path to prevent path traversal attacks
   * @param filePath Path to validate
   * @returns true if path is safe, false otherwise
   */
  private static validateFilePath(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    return resolvedPath.startsWith(ExcelExtractor.ALLOWED_DIR);
  }

  /**
   * Read an Excel file and extract the first sheet
   * @param filePath Path to the Excel file (.xls or .xlsx)
   * @returns ExcelExtractionResult with CSV or JSON data
   */
  static async extract(filePath: string): Promise<ExcelExtractionResult> {
    try {
      // Validate path to prevent traversal attacks
      if (!this.validateFilePath(filePath)) {
        return {
          success: false,
          error: 'Invalid file path: Access denied'
        };
      }

      // Validate file exists
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
      } catch {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Validate file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!['.xls', '.xlsx'].includes(ext)) {
        return {
          success: false,
          error: `Invalid file format. Expected .xls or .xlsx, got ${ext}`
        };
      }

      // Check file size
      const stats = await fs.promises.stat(filePath);
      if (stats.size > ExcelExtractor.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds maximum limit of ${ExcelExtractor.MAX_FILE_SIZE / 1024 / 1024}MB`
        };
      }

      // Read file buffer
      const buffer = await fs.promises.readFile(filePath);

      // Read the workbook
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get the first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return {
          success: false,
          error: 'No sheets found in the Excel file'
        };
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        return {
          success: false,
          error: 'Unable to read worksheet'
        };
      }

      // Convert sheet to JSON with proper type casting
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: '' // Default value for empty cells
      });

      if (jsonData.length === 0) {
        return {
          success: false,
          error: 'No data found in the first sheet'
        };
      }

      // Convert to CSV format for AI processing
      const csvData = this.convertToCSV(jsonData);

      return {
        success: true,
        data: csvData,
        jsonData: jsonData,
        fileName: path.basename(filePath),
        sheetName: sheetName,
        rowCount: jsonData.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Excel extraction failed: ${errorMessage}`
      };
    }
  }

  /**
   * Convert JSON data to CSV format
   * @param data Array of objects to convert
   * @returns CSV string
   */
  private static convertToCSV(data: Record<string, any>[]): string {
    if (data.length === 0) {
      return '';
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Create header row
    const headerRow = headers.map(header => this.escapeCSVField(String(header))).join(',');

    // Create data rows
    const dataRows = data.map(row =>
      headers
        .map(header => this.escapeCSVField(String(row[header] || '')))
        .join(',')
    );

    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Escape CSV field values (handle quotes and commas)
   * @param field Field value to escape
   * @returns Escaped field
   */
  private static escapeCSVField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Read Excel file and return raw JSON data
   * @param filePath Path to the Excel file
   * @returns JSON array of objects
   */
  static async extractJSON(filePath: string): Promise<Record<string, any>[]> {
    try {
      // Validate path to prevent traversal attacks
      if (!this.validateFilePath(filePath)) {
        throw new Error('Invalid file path: Access denied');
      }

      // Validate file exists
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
      } catch {
        throw new Error(`File not found: ${filePath}`);
      }

      const ext = path.extname(filePath).toLowerCase();
      if (!['.xls', '.xlsx'].includes(ext)) {
        throw new Error(`Invalid file format. Expected .xls or .xlsx, got ${ext}`);
      }

      // Check file size
      const stats = await fs.promises.stat(filePath);
      if (stats.size > ExcelExtractor.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${ExcelExtractor.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Read file buffer
      const buffer = await fs.promises.readFile(filePath);

      // Read the workbook
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get the first sheet with null check
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('No sheets found in the Excel file');
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error('Unable to read worksheet');
      }

      // Convert sheet to JSON with proper type casting
      return XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`JSON extraction failed: ${errorMessage}`);
    }
  }
}

export default ExcelExtractor;
