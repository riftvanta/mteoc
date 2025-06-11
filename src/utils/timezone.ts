import { format, toZonedTime, fromZonedTime } from 'date-fns-tz'

export const JORDAN_TIMEZONE = 'Asia/Amman'

/**
 * Convert any date to Jordanian local time
 */
export const toJordanTime = (date: Date | string): Date => {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  return toZonedTime(inputDate, JORDAN_TIMEZONE)
}

/**
 * Convert Jordanian local time to UTC
 */
export const fromJordanTime = (date: Date | string): Date => {
  const inputDate = typeof date === 'string' ? new Date(date) : date
  return fromZonedTime(inputDate, JORDAN_TIMEZONE)
}

/**
 * Format timestamp for chat messages (24-hour for admin)
 */
export const formatChatTime = (timestamp: Date | string): string => {
  const jordanTime = toJordanTime(timestamp)
  return format(jordanTime, 'HH:mm')
}

/**
 * Format timestamp for mobile chat messages (12-hour for mobile)
 */
export const formatMobileChatTime = (timestamp: Date | string): string => {
  const jordanTime = toJordanTime(timestamp)
  return format(jordanTime, 'h:mm a')
}

/**
 * Format timestamp for order dates
 */
export const formatOrderDate = (timestamp: Date | string): string => {
  const jordanTime = toJordanTime(timestamp)
  return format(jordanTime, 'dd/MM/yyyy HH:mm')
}

/**
 * Format timestamp for order dates (mobile friendly)
 */
export const formatMobileOrderDate = (timestamp: Date | string): string => {
  const jordanTime = toJordanTime(timestamp)
  return format(jordanTime, 'dd/MM/yyyy h:mm a')
}

/**
 * Get current Jordanian time
 */
export const getJordanTime = (): Date => {
  return toJordanTime(new Date())
}

/**
 * Format any date with Jordanian timezone
 */
export const formatJordanTime = (date: Date | string, formatString: string): string => {
  const jordanTime = toJordanTime(date)
  return format(jordanTime, formatString)
} 