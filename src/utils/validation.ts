import validator from 'validator'
import { z } from 'zod'

/**
 * Jordanian mobile number validation patterns
 * Format 1: 0096277/78/79/XXXXXXX (International)
 * Format 2: 07/78/79XXXXXXX (Local)
 */
const jordanianMobileRegexPatterns = [
  /^00962(77|78|79)\d{7}$/,  // International format: 0096277/78/79XXXXXXX
  /^0(77|78|79)\d{7}$/       // Local format: 07/78/79XXXXXXX
]

/**
 * Validate Jordanian mobile number
 */
export const isValidJordanianMobile = (mobile: string): boolean => {
  if (!mobile || typeof mobile !== 'string') return false
  
  // Remove any spaces or dashes
  const cleanMobile = mobile.replace(/[\s-]/g, '')
  
  return jordanianMobileRegexPatterns.some(pattern => pattern.test(cleanMobile))
}

/**
 * Format Jordanian mobile number for display
 */
export const formatJordanianMobile = (mobile: string): string => {
  if (!mobile) return ''
  
  const cleanMobile = mobile.replace(/[\s-]/g, '')
  
  // Convert local format to international format for consistency
  if (/^0(77|78|79)\d{7}$/.test(cleanMobile)) {
    return `+962${cleanMobile.slice(1)}`
  }
  
  // Already in international format
  if (/^00962(77|78|79)\d{7}$/.test(cleanMobile)) {
    return `+${cleanMobile.slice(2)}`
  }
  
  return mobile // Return as-is if doesn't match patterns
}

/**
 * Zod schema for Jordanian mobile number
 */
export const jordanianMobileSchema = z
  .string()
  .min(1, 'Mobile number is required')
  .refine(isValidJordanianMobile, {
    message: 'Please enter a valid Jordanian mobile number (077/078/079XXXXXXX or 009627X/8X/9XXXXXXX)',
  })

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * Amount validation schema (for JOD amounts)
 */
export const amountSchema = z
  .string()
  .min(1, 'Amount is required')
  .refine(
    (val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0 && num <= 1000000
    },
    {
      message: 'Please enter a valid amount between 0.001 and 1,000,000 JOD',
    }
  )

/**
 * Order number validation schema (TYYMMXXXX pattern)
 */
export const orderNumberSchema = z
  .string()
  .regex(/^T\d{8}$/, 'Invalid order number format')

/**
 * Bank name validation
 */
export const bankNameSchema = z
  .string()
  .min(2, 'Bank name must be at least 2 characters')
  .max(50, 'Bank name must not exceed 50 characters')

/**
 * Person name validation
 */
export const personNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must not exceed 50 characters')
  .regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'Name can only contain letters and spaces')

/**
 * Exchange name validation
 */
export const exchangeNameSchema = z
  .string()
  .min(2, 'Exchange name must be at least 2 characters')
  .max(100, 'Exchange name must not exceed 100 characters')

/**
 * Commission value validation
 */
export const commissionValueSchema = z
  .number()
  .min(0, 'Commission value must be positive')
  .max(100, 'Commission percentage cannot exceed 100%')

/**
 * File upload validation
 */
export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only PNG, JPG, and JPEG files are allowed'
    }
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 5MB'
    }
  }
  
  return { isValid: true }
}

/**
 * Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return ''
  
  return validator.escape(input.trim())
}

/**
 * Validate URL
 */
export const isValidUrl = (url: string): boolean => {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  })
}

/**
 * Bank alias name validation (for CliQ)
 */
export const bankAliasSchema = z
  .string()
  .min(2, 'Bank alias name must be at least 2 characters')
  .max(30, 'Bank alias name must not exceed 30 characters')
  .regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, 'Bank alias name can only contain letters and spaces')

/**
 * Message content validation
 */
export const messageContentSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(1000, 'Message must not exceed 1000 characters')

/**
 * Validate order status transitions
 */
export const isValidStatusTransition = (
  currentStatus: string,
  newStatus: string
): boolean => {
  const validTransitions: Record<string, string[]> = {
    'SUBMITTED': ['PENDING_REVIEW', 'CANCELLED'],
    'PENDING_REVIEW': ['APPROVED', 'REJECTED', 'CANCELLED'],
    'APPROVED': ['PROCESSING', 'CANCELLED'],
    'REJECTED': [], // Final status
    'PROCESSING': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [], // Final status
    'CANCELLED': [] // Final status
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) || false
}

/**
 * Comprehensive order validation schema
 */
export const outgoingOrderSchema = z.object({
  amount: amountSchema,
  cliqBankAliasName: bankAliasSchema,
  cliqMobileNumber: jordanianMobileSchema,
  recipientName: personNameSchema.optional(),
  bankName: bankNameSchema.optional(),
})

export const incomingOrderSchema = z.object({
  amount: amountSchema,
  bankName: bankNameSchema,
  senderName: personNameSchema.optional(),
  paymentProof: z.instanceof(File).refine(
    (file) => validateFileUpload(file).isValid,
    (file) => ({ message: validateFileUpload(file).error || 'Invalid file' })
  ),
})

export type OutgoingOrderData = z.infer<typeof outgoingOrderSchema>
export type IncomingOrderData = z.infer<typeof incomingOrderSchema> 