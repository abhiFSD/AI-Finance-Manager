/**
 * Extractors module - Provides utilities for extracting data from Excel and text files
 */

export { ExcelExtractor, ExcelExtractionResult } from './excel-extractor';
export { TextExtractor, TextExtractionResult } from './text-extractor';

// Re-export as combined module
import ExcelExtractor from './excel-extractor';
import TextExtractor from './text-extractor';

export const Extractors = {
  Excel: ExcelExtractor,
  Text: TextExtractor
};

export default Extractors;
