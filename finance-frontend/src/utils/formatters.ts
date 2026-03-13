import { format, parseISO, formatDistanceToNow } from 'date-fns';

/**
 * Format a number as currency
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'INR',
  showSign: boolean = false
): string => {
  // Use Indian locale for INR formatting (₹ symbol and lakhs/crores style)
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatted = formatter.format(Math.abs(amount));
  
  if (showSign && amount !== 0) {
    return amount > 0 ? `+${formatted}` : `-${formatted}`;
  }
  
  return amount < 0 ? `-${formatted}` : formatted;
};

/**
 * Format a number as percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format a large number with abbreviations (K, M, B)
 */
export const formatNumber = (num: number): string => {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Format date in various formats
 */
export const formatDate = (
  date: string | Date | null | undefined,
  formatType: 'short' | 'long' | 'relative' | 'iso' = 'short'
): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    switch (formatType) {
      case 'short':
        return format(dateObj, 'dd/MM/yyyy');
      case 'long':
        return format(dateObj, 'dd MMMM, yyyy');
      case 'relative':
        return formatDistanceToNow(dateObj, { addSuffix: true });
      case 'iso':
        return format(dateObj, 'yyyy-MM-dd');
      default:
        return format(dateObj, 'dd/MM/yyyy');
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

/**
 * Format date and time
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm');
};

/**
 * Format time only
 */
export const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'HH:mm');
};

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format account number (partial masking)
 */
export const formatAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 4) return accountNumber;
  
  const lastFour = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
  
  return `${masked}${lastFour}`;
};

/**
 * Format card number with proper spacing
 */
export const formatCardNumber = (cardNumber: string): string => {
  // Remove any non-digit characters
  const cleaned = cardNumber.replace(/\D/g, '');
  
  // Add spaces every 4 digits
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phoneNumber;
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Format transaction type for display
 */
export const formatTransactionType = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'income':
      return 'Income';
    case 'expense':
      return 'Expense';
    case 'transfer':
      return 'Transfer';
    default:
      return capitalizeWords(type);
  }
};

/**
 * Format account type for display
 */
export const formatAccountType = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'checking':
      return 'Checking';
    case 'savings':
      return 'Savings';
    case 'credit':
      return 'Credit Card';
    case 'investment':
      return 'Investment';
    case 'cash':
      return 'Cash';
    default:
      return capitalizeWords(type);
  }
};