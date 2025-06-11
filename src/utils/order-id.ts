import { format } from 'date-fns'
import { getJordanTime } from './timezone'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Generate unique order ID with pattern TYYMMXXXX
 * T - Transfer identifier (literal "T")
 * YY - Year (2 digits, e.g., "25" for 2025)
 * MM - Month (2 digits, e.g., "06" for June)
 * XXXX - Sequential order number (4 digits, zero-padded)
 * 
 * Examples:
 * T25060001 - First order in June 2025 (Jordanian time)
 * T25060002 - Second order in June 2025 (Jordanian time)
 * T25070001 - First order in July 2025 (resets monthly)
 */
export const generateOrderId = async (orderDate: Date = getJordanTime()): Promise<string> => {
  // Use Jordanian local time for order ID generation
  const jordanTime = getJordanTime()
  
  const year = parseInt(format(jordanTime, 'yy')) // 25 for 2025
  const month = parseInt(format(jordanTime, 'MM')) // 06 for June
  
  try {
    // Get or create sequence for this year/month
    const { data: existingSequence, error: fetchError } = await supabaseAdmin
      .from('order_sequence')
      .select('sequence')
      .eq('year', year)
      .eq('month', month)
      .single()

    let sequentialNumber: number

    if (existingSequence) {
      // Increment existing sequence
      const newSequence = existingSequence.sequence + 1
      
      const { error: updateError } = await supabaseAdmin
        .from('order_sequence')
        .update({ sequence: newSequence })
        .eq('year', year)
        .eq('month', month)

      if (updateError) {
        throw new Error(`Failed to update sequence: ${updateError.message}`)
      }

      sequentialNumber = newSequence
    } else {
      // Create new sequence starting from 1
      const { error: insertError } = await supabaseAdmin
        .from('order_sequence')
        .insert({
          year,
          month,
          sequence: 1
        })

      if (insertError) {
        throw new Error(`Failed to create sequence: ${insertError.message}`)
      }

      sequentialNumber = 1
    }

    // Format components
    const yearString = year.toString().padStart(2, '0')
    const monthString = month.toString().padStart(2, '0')
    const sequenceString = sequentialNumber.toString().padStart(4, '0')

    // Generate final order ID: TYYMMXXXX
    const orderId = `T${yearString}${monthString}${sequenceString}`

    return orderId
  } catch (error) {
    console.error('Error generating order ID:', error)
    // Fallback to timestamp-based ID if database operation fails
    const timestamp = Date.now().toString().slice(-4)
    const yearString = year.toString().padStart(2, '0')
    const monthString = month.toString().padStart(2, '0')
    return `T${yearString}${monthString}${timestamp}`
  }
}

/**
 * Validate order ID format
 */
export const isValidOrderId = (orderId: string): boolean => {
  // Pattern: TYYMMXXXX (T + 2 digits year + 2 digits month + 4 digits sequence)
  const orderIdRegex = /^T\d{2}\d{2}\d{4}$/
  return orderIdRegex.test(orderId)
}

/**
 * Parse order ID components
 */
export const parseOrderId = (orderId: string): {
  year: number
  month: number
  sequence: number
  isValid: boolean
} => {
  if (!isValidOrderId(orderId)) {
    return { year: 0, month: 0, sequence: 0, isValid: false }
  }

  const year = parseInt(orderId.slice(1, 3))
  const month = parseInt(orderId.slice(3, 5))
  const sequence = parseInt(orderId.slice(5, 9))

  return { year, month, sequence, isValid: true }
}

/**
 * Get human-readable order ID description
 */
export const formatOrderIdDescription = (orderId: string): string => {
  const { year, month, sequence, isValid } = parseOrderId(orderId)
  
  if (!isValid) {
    return 'Invalid Order ID'
  }

  const fullYear = 2000 + year
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const monthName = monthNames[month - 1] || 'Unknown'
  
  return `Order #${sequence} in ${monthName} ${fullYear}`
} 