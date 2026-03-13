/**
 * Merchant name normalization utility
 * Normalizes merchant names for duplicate detection and consistency
 */

export function normalizeMerchantName(merchantName: string): string {
  if (!merchantName) return '';
  
  // Convert to lowercase
  let normalized = merchantName.toLowerCase().trim();
  
  // Remove common suffixes
  normalized = normalized
    .replace(/\s+(inc|llc|ltd|limited|pvt|corp|corporation|co)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove special characters but keep spaces
  normalized = normalized.replace(/[^\w\s]/g, '');
  
  return normalized;
}

export function areMerchantsEquivalent(
  merchant1: string,
  merchant2: string,
  threshold: number = 0.8
): boolean {
  const norm1 = normalizeMerchantName(merchant1);
  const norm2 = normalizeMerchantName(merchant2);
  
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (for partial matches)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const similarity = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
    return similarity >= threshold;
  }
  
  return false;
}
