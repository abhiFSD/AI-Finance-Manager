import * as fs from 'fs';
import * as path from 'path';

export interface TextExtractionResult {
  success: boolean;
  data?: string; // Raw file content
  encoding?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export class TextExtractor {
  private static readonly SUPPORTED_EXTENSIONS = ['.txt', '.csv'];
  private static readonly ENCODING = 'utf-8';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly ALLOWED_DIR = path.resolve('./uploads');

  /**
   * Validate file path to prevent path traversal attacks
   * @param filePath Path to validate
   * @returns true if path is safe, false otherwise
   */
  private static validateFilePath(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    return resolvedPath.startsWith(TextExtractor.ALLOWED_DIR);
  }

  /**
   * Read a text or CSV file and return raw content
   * @param filePath Path to the text or CSV file
   * @returns TextExtractionResult with raw content
   */
  static async extract(filePath: string): Promise<TextExtractionResult> {
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
      if (!this.SUPPORTED_EXTENSIONS.includes(ext)) {
        return {
          success: false,
          error: `Invalid file format. Expected .txt or .csv, got ${ext}`
        };
      }

      // Get file stats
      const stats = await fs.promises.stat(filePath);

      // Check file size
      if (stats.size > TextExtractor.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds maximum limit of ${TextExtractor.MAX_FILE_SIZE / 1024 / 1024}MB`
        };
      }

      // Read file with UTF-8 encoding
      let content: string;
      try {
        content = await fs.promises.readFile(filePath, this.ENCODING);
      } catch (readError) {
        // Fallback: try with different encoding detection
        const buffer = await fs.promises.readFile(filePath);
        content = this.detectAndDecodeBuffer(buffer);
      }

      // Validate content is not empty
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: 'File is empty or contains no readable content'
        };
      }

      return {
        success: true,
        data: content,
        encoding: this.ENCODING,
        fileName: path.basename(filePath),
        fileSize: stats.size,
        mimeType: ext === '.csv' ? 'text/csv' : 'text/plain'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Text extraction failed: ${errorMessage}`
      };
    }
  }

  /**
   * Read a text file and return raw string content
   * @param filePath Path to the file
   * @returns Raw file content as string
   */
  static async readAsString(filePath: string): Promise<string> {
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
      if (!this.SUPPORTED_EXTENSIONS.includes(ext)) {
        throw new Error(`Invalid file format. Expected .txt or .csv, got ${ext}`);
      }

      // Check file size
      const stats = await fs.promises.stat(filePath);
      if (stats.size > TextExtractor.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${TextExtractor.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      return await fs.promises.readFile(filePath, this.ENCODING);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to read file: ${errorMessage}`);
    }
  }

  /**
   * Read CSV file and parse as lines
   * @param filePath Path to the CSV file
   * @returns Array of lines
   */
  static async readAsLines(filePath: string): Promise<string[]> {
    try {
      const content = await this.readAsString(filePath);
      return content.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to read lines: ${errorMessage}`);
    }
  }

  /**
   * Parse CSV content and convert to JSON objects
   * @param content CSV content as string
   * @returns Array of objects with headers as keys
   */
  static parseCSV(content: string): Record<string, any>[] {
    try {
      const lines = content.split('\n').filter(line => line.trim().length > 0);

      if (lines.length === 0) {
        return [];
      }

      // Parse header
      const headers = this.parseCSVLine(lines[0]);

      // Parse data rows
      const data: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        const row: Record<string, any> = {};

        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });

        data.push(row);
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`CSV parsing failed: ${errorMessage}`);
    }
  }

  /**
   * Parse a single CSV line handling quoted fields
   * @param line CSV line to parse
   * @returns Array of field values
   */
  private static parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    fields.push(current);

    return fields;
  }

  /**
   * Detect encoding and decode buffer
   * @param buffer Buffer to decode
   * @returns Decoded string
   */
  private static detectAndDecodeBuffer(buffer: Buffer): string {
    // Try UTF-8 first (most common)
    try {
      const str = buffer.toString('utf-8');
      // Verify it's valid UTF-8
      if (str.includes('\uFFFD')) {
        throw new Error('Invalid UTF-8');
      }
      return str;
    } catch {
      // Fallback to latin1 (ISO-8859-1)
      return buffer.toString('latin1');
    }
  }

  /**
   * Check if file is supported
   * @param filePath Path to check
   * @returns true if file is .txt or .csv
   */
  static isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.SUPPORTED_EXTENSIONS.includes(ext);
  }
}

export default TextExtractor;
