import Decimal from 'decimal.js'

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 15,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
})

export type CommissionType = 'FIXED' | 'PERCENTAGE'

export interface CommissionConfig {
  type: CommissionType
  value: number
}

/**
 * Calculate commission amount based on type and configuration
 */
export const calculateCommission = (
  amount: number | string,
  commissionConfig: CommissionConfig
): Decimal => {
  const amountDecimal = new Decimal(amount)
  const commissionValue = new Decimal(commissionConfig.value)

  if (commissionConfig.type === 'FIXED') {
    return commissionValue
  } else {
    // Percentage: multiply by (value / 100)
    return amountDecimal.mul(commissionValue.div(100))
  }
}

/**
 * Calculate net amount for outgoing transfers
 * Net Amount = Amount + Commission
 */
export const calculateOutgoingNetAmount = (
  amount: number | string,
  commission: number | string
): Decimal => {
  const amountDecimal = new Decimal(amount)
  const commissionDecimal = new Decimal(commission)
  
  return amountDecimal.plus(commissionDecimal)
}

/**
 * Calculate net amount for incoming transfers
 * Net Amount = Amount - Commission
 */
export const calculateIncomingNetAmount = (
  amount: number | string,
  commission: number | string
): Decimal => {
  const amountDecimal = new Decimal(amount)
  const commissionDecimal = new Decimal(commission)
  
  return amountDecimal.minus(commissionDecimal)
}

/**
 * Update balance for outgoing transfer
 * New Balance = Current Balance - (Amount + Commission)
 */
export const calculateOutgoingBalance = (
  currentBalance: number | string,
  amount: number | string,
  commission: number | string
): Decimal => {
  const balanceDecimal = new Decimal(currentBalance)
  const netAmount = calculateOutgoingNetAmount(amount, commission)
  
  return balanceDecimal.minus(netAmount)
}

/**
 * Update balance for incoming transfer
 * New Balance = Current Balance + (Amount - Commission)
 */
export const calculateIncomingBalance = (
  currentBalance: number | string,
  amount: number | string,
  commission: number | string
): Decimal => {
  const balanceDecimal = new Decimal(currentBalance)
  const netAmount = calculateIncomingNetAmount(amount, commission)
  
  return balanceDecimal.plus(netAmount)
}

/**
 * Restore balance when order is cancelled
 */
export const restoreBalance = (
  currentBalance: number | string,
  orderType: 'INCOMING' | 'OUTGOING',
  amount: number | string,
  commission: number | string
): Decimal => {
  const balanceDecimal = new Decimal(currentBalance)
  const netAmount = orderType === 'OUTGOING' 
    ? calculateOutgoingNetAmount(amount, commission)
    : calculateIncomingNetAmount(amount, commission)

  if (orderType === 'OUTGOING') {
    // Restore by adding back what was deducted
    return balanceDecimal.plus(netAmount)
  } else {
    // Restore by subtracting what was added
    return balanceDecimal.minus(netAmount)
  }
}

/**
 * Format amount for display (JOD currency)
 */
export const formatJOD = (amount: number | string | Decimal): string => {
  const amountDecimal = new Decimal(amount)
  return `${amountDecimal.toFixed(3)} JOD`
}

/**
 * Format amount for display without currency
 */
export const formatAmount = (amount: number | string | Decimal, decimals: number = 3): string => {
  const amountDecimal = new Decimal(amount)
  return amountDecimal.toFixed(decimals)
}

/**
 * Check if amount is positive
 */
export const isPositiveAmount = (amount: number | string | Decimal): boolean => {
  const amountDecimal = new Decimal(amount)
  return amountDecimal.greaterThan(0)
}

/**
 * Check if amount is zero
 */
export const isZeroAmount = (amount: number | string | Decimal): boolean => {
  const amountDecimal = new Decimal(amount)
  return amountDecimal.equals(0)
}

/**
 * Check if amount is negative
 */
export const isNegativeAmount = (amount: number | string | Decimal): boolean => {
  const amountDecimal = new Decimal(amount)
  return amountDecimal.lessThan(0)
}

/**
 * Get balance status for styling
 */
export const getBalanceStatus = (balance: number | string | Decimal): 'positive' | 'negative' | 'zero' => {
  if (isPositiveAmount(balance)) return 'positive'
  if (isNegativeAmount(balance)) return 'negative'
  return 'zero'
}

/**
 * Validate minimum amount (e.g., minimum transfer amount)
 */
export const validateMinimumAmount = (
  amount: number | string | Decimal,
  minimum: number | string | Decimal = 1
): boolean => {
  const amountDecimal = new Decimal(amount)
  const minimumDecimal = new Decimal(minimum)
  return amountDecimal.greaterThanOrEqualTo(minimumDecimal)
}

/**
 * Calculate total commission for display purposes
 */
export const calculateTotalCommission = (
  amount: number | string,
  incomingConfig: CommissionConfig,
  outgoingConfig: CommissionConfig
): {
  incoming: Decimal
  outgoing: Decimal
  total: Decimal
} => {
  const incoming = calculateCommission(amount, incomingConfig)
  const outgoing = calculateCommission(amount, outgoingConfig)
  const total = incoming.plus(outgoing)

  return { incoming, outgoing, total }
}

/**
 * Parse and validate decimal input
 */
export const parseDecimalInput = (input: string): Decimal | null => {
  try {
    if (!input || input.trim() === '') return null
    
    // Remove any non-numeric characters except decimal point
    const cleaned = input.replace(/[^\d.-]/g, '')
    
    if (cleaned === '' || cleaned === '.' || cleaned === '-') return null
    
    const decimal = new Decimal(cleaned)
    
    // Validate reasonable range for JOD amounts
    if (decimal.lessThan(0) || decimal.greaterThan(1000000)) {
      return null
    }
    
    return decimal
  } catch {
    return null
  }
} 