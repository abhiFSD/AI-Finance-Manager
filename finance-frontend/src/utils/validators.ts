import { APP_CONSTANTS } from './constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email address
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!APP_CONSTANTS.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

/**
 * Validate password
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < APP_CONSTANTS.PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${APP_CONSTANTS.PASSWORD_MIN_LENGTH} characters long` 
    };
  }
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
};

/**
 * Validate password confirmation
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Password confirmation is required' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  
  return { isValid: true };
};

/**
 * Validate required field
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true };
};

/**
 * Validate amount
 */
export const validateAmount = (amount: number | string): ValidationResult => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  
  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  // Check for reasonable maximum (1 billion)
  if (numAmount > 1000000000) {
    return { isValid: false, error: 'Amount is too large' };
  }
  
  // Check for more than 2 decimal places
  if (numAmount.toString().includes('.') && numAmount.toString().split('.')[1].length > 2) {
    return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
  }
  
  return { isValid: true };
};

/**
 * Validate date
 */
export const validateDate = (date: string): ValidationResult => {
  if (!date) {
    return { isValid: false, error: 'Date is required' };
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }
  
  // Check if date is not in the future (for transactions)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (dateObj > today) {
    return { isValid: false, error: 'Date cannot be in the future' };
  }
  
  return { isValid: true };
};

/**
 * Validate file
 */
export const validateFile = (file: File): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }
  
  // Check file size
  if (file.size > APP_CONSTANTS.MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size exceeds the maximum limit of 10MB' };
  }
  
  // Check file type
  if (!APP_CONSTANTS.ALLOWED_FILE_TYPES.includes(file.type as any)) {
    return { isValid: false, error: 'File type is not supported' };
  }
  
  return { isValid: true };
};

/**
 * Validate phone number
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Remove all non-digit characters
  const cleanedPhone = phone.replace(/\D/g, '');
  
  // Check for valid US phone number (10 digits)
  if (cleanedPhone.length !== 10) {
    return { isValid: false, error: 'Please enter a valid 10-digit phone number' };
  }
  
  return { isValid: true };
};

/**
 * Validate account name
 */
export const validateAccountName = (name: string): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Account name is required' };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Account name must be at least 2 characters long' };
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, error: 'Account name cannot exceed 50 characters' };
  }
  
  return { isValid: true };
};

/**
 * Validate transaction description
 */
export const validateDescription = (description: string): ValidationResult => {
  if (!description || !description.trim()) {
    return { isValid: false, error: 'Description is required' };
  }
  
  if (description.trim().length > 200) {
    return { isValid: false, error: 'Description cannot exceed 200 characters' };
  }
  
  return { isValid: true };
};

/**
 * Validate multiple fields and return all errors
 */
export const validateForm = (
  validations: { field: string; validation: ValidationResult }[]
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  let isValid = true;
  
  validations.forEach(({ field, validation }) => {
    if (!validation.isValid && validation.error) {
      errors[field] = validation.error;
      isValid = false;
    }
  });
  
  return { isValid, errors };
};