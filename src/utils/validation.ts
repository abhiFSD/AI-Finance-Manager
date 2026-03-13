import Joi from 'joi';

// Input sanitization function
export const sanitizeInput = (data: any): any => {
  if (typeof data === 'string') {
    return data.trim();
  }
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = typeof data[key] === 'string' ? data[key].trim() : data[key];
      }
    }
    return sanitized;
  }
  return data;
};

// Validation function
export const validateInput = (
  schema: Joi.Schema,
  data: any
): { isValid: boolean; errors?: string[]; value?: any } => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return { isValid: false, errors };
  }

  return { isValid: true, value };
};

// Registration schema
export const registerSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  firstName: Joi.string().optional().trim(),
  lastName: Joi.string().optional().trim(),
  name: Joi.string().optional().trim(),
});

// Login schema
export const loginSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase(),
  password: Joi.string().required(),
});

// Refresh token schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});