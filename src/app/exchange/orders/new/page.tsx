'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { 
  ArrowLeft,
  DollarSign,
  Building2,
  User,
  Phone,
  Camera,
  Upload,
  Calculator,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useExchangeOptimisticUpdates } from '@/hooks/useExchangeQueries'
import { calculateCommission, calculateOutgoingNetAmount, calculateIncomingNetAmount } from '@/utils/financial'
import { jordanianMobileSchema, amountSchema } from '@/utils/validation'
import { uploadPaymentProof, captureFromCamera } from '@/utils/file-upload'
import { toast } from 'react-hot-toast'

interface OrderFormData {
  type: 'INCOMING' | 'OUTGOING'
  amount: string
  senderName: string
  recipientName: string
  bankName: string
  cliqBankAliasName: string
  cliqMobileNumber: string
  paymentProof?: File
}

interface ExchangeData {
  id: string
  name: string
  balance: number
  incomingCommissionType: 'FIXED' | 'PERCENTAGE'
  incomingCommissionValue: number
  outgoingCommissionType: 'FIXED' | 'PERCENTAGE'
  outgoingCommissionValue: number
  allowedIncomingBanks: string[]
  allowedOutgoingBanks: string[]
}

export default function NewOrderPage() {
  const router = useRouter()
  const { exchangeId, exchangeName } = useAuth()
  const { addNewOrderOptimistically } = useExchangeOptimisticUpdates()
  const fetchedRef = useRef(false)

  const [formData, setFormData] = useState<OrderFormData>({
    type: 'INCOMING',
    amount: '',
    senderName: '',
    recipientName: '',
    bankName: '',
    cliqBankAliasName: '',
    cliqMobileNumber: '',
  })

  const [exchangeData, setExchangeData] = useState<ExchangeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch exchange data on component mount with protection against double fetching
  useEffect(() => {
    if (!exchangeId || fetchedRef.current) return
    
    const fetchExchangeData = async () => {
      try {
        fetchedRef.current = true
        setIsLoading(true)
        const response = await fetch(`/api/exchange/settings?exchangeId=${exchangeId}`)
        if (!response.ok) throw new Error('Failed to fetch exchange data')
        
        const data = await response.json()
        setExchangeData(data.exchange)
      } catch (error) {
        console.error('Error fetching exchange data:', error)
        toast.error('Failed to load exchange settings')
        fetchedRef.current = false // Reset on error to allow retry
      } finally {
        setIsLoading(false)
      }
    }

    fetchExchangeData()
  }, [exchangeId])

  // Real-time commission calculation
  const calculatedValues = useMemo(() => {
    if (!exchangeData || !formData.amount) {
      return { commission: 0, netAmount: 0, isValid: false }
    }

    const amountValidation = amountSchema.safeParse(formData.amount)
    if (!amountValidation.success) {
      return { commission: 0, netAmount: 0, isValid: false }
    }

    const amount = parseFloat(formData.amount)
    const commissionConfig = formData.type === 'INCOMING' 
      ? { type: exchangeData.incomingCommissionType, value: exchangeData.incomingCommissionValue }
      : { type: exchangeData.outgoingCommissionType, value: exchangeData.outgoingCommissionValue }

    const commission = calculateCommission(amount, commissionConfig).toNumber()
    const netAmount = formData.type === 'INCOMING'
      ? calculateIncomingNetAmount(amount, commission).toNumber()
      : calculateOutgoingNetAmount(amount, commission).toNumber()

    return { commission, netAmount, isValid: true }
  }, [exchangeData, formData.amount, formData.type])

  // Get available banks based on order type
  const availableBanks = useMemo(() => {
    if (!exchangeData) return []
    return formData.type === 'INCOMING' 
      ? exchangeData.allowedIncomingBanks 
      : exchangeData.allowedOutgoingBanks
  }, [exchangeData, formData.type])

  const handleInputChange = useCallback((field: keyof OrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific errors
    setErrors(prev => {
      if (prev[field]) {
        const { [field]: removed, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  const handleFileChange = useCallback((file: File | undefined) => {
    setFormData(prev => ({ ...prev, paymentProof: file }))
    setErrors(prev => {
      if (prev.paymentProof) {
        const { paymentProof: removed, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  const handleCameraCapture = useCallback(async () => {
    try {
      const file = await captureFromCamera()
      if (file) {
        handleFileChange(file)
        toast.success('Photo captured successfully')
      }
    } catch (error) {
      toast.error('Failed to capture photo')
    }
  }, [handleFileChange])

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    // Amount validation
    const amountValidation = amountSchema.safeParse(formData.amount)
    if (!amountValidation.success) {
      newErrors.amount = amountValidation.error.errors[0].message
    }

    // Type-specific validation
    if (formData.type === 'OUTGOING') {
      if (!formData.cliqBankAliasName.trim()) {
        newErrors.cliqBankAliasName = 'CliQ bank alias name is required'
      }
      
      if (!formData.cliqMobileNumber.trim()) {
        newErrors.cliqMobileNumber = 'CliQ mobile number is required'
      } else {
        const mobileValidation = jordanianMobileSchema.safeParse(formData.cliqMobileNumber)
        if (!mobileValidation.success) {
          newErrors.cliqMobileNumber = 'Invalid Jordanian mobile number format'
        }
      }
    }

    if (formData.type === 'INCOMING') {
      if (!formData.bankName) {
        newErrors.bankName = 'Bank selection is required'
      }
      
      if (!formData.paymentProof) {
        newErrors.paymentProof = 'Payment proof screenshot is required'
      }
    }

    // Check balance for outgoing transfers
    if (formData.type === 'OUTGOING' && exchangeData && calculatedValues.isValid) {
      const totalDeduction = parseFloat(formData.amount) + calculatedValues.commission
      if (exchangeData.balance < totalDeduction) {
        newErrors.amount = `Insufficient balance. Required: ${totalDeduction.toLocaleString()} JOD, Available: ${exchangeData.balance.toLocaleString()} JOD`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, exchangeData, calculatedValues])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    if (!exchangeId || !exchangeData) {
      toast.error('Exchange information not available')
      return
    }

    setIsSubmitting(true)

    try {
      // For incoming transfers, upload payment proof first if provided
      let paymentProofUrl = ''
      if (formData.type === 'INCOMING' && formData.paymentProof) {
        toast.loading('Uploading payment proof...', { id: 'upload' })
        
        // Upload payment proof to Supabase Storage
        const uploadResult = await uploadPaymentProof(formData.paymentProof, `temp_${Date.now()}`)
        
        toast.dismiss('upload')
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload payment proof')
        }
        
        paymentProofUrl = uploadResult.url || ''
        toast.success('Payment proof uploaded successfully')
      }

      // Create order
      const orderData = {
        exchangeId,
        type: formData.type,
        amount: formData.amount,
        senderName: formData.senderName || undefined,
        recipientName: formData.recipientName || undefined,
        bankName: formData.bankName || undefined,
        cliqBankAliasName: formData.cliqBankAliasName || undefined,
        cliqMobileNumber: formData.cliqMobileNumber || undefined,
        paymentProofUrl: paymentProofUrl || undefined
      }

      const response = await fetch('/api/exchange/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const newOrder = await response.json()

      // Optimistically update the cache
      addNewOrderOptimistically(newOrder)

      toast.success(`${formData.type.toLowerCase().charAt(0).toUpperCase() + formData.type.toLowerCase().slice(1)} transfer order created successfully!`)
      
      // Redirect to order details or orders list
      router.push(`/exchange/orders/${newOrder.id}`)

    } catch (error) {
      console.error('Error creating order:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create order')
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, exchangeId, exchangeData, formData, addNewOrderOptimistically, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-jordan" />
          <p className="text-gray-600">Loading exchange settings...</p>
        </div>
      </div>
    )
  }

  if (!exchangeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Exchange Settings Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load exchange configuration</p>
          <Link
            href="/exchange"
            className="inline-flex items-center px-4 py-2 bg-jordan text-white rounded-lg hover:bg-jordan-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/exchange"
              className="mr-4 p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Create New Order</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Type Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Transfer Type</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleInputChange('type', 'INCOMING')}
                className={`p-4 rounded-lg border text-center transition-all ${
                  formData.type === 'INCOMING'
                    ? 'border-jordan bg-jordan/5 text-jordan font-medium'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-green-600 mb-2">↓</div>
                <div className="font-medium">Incoming</div>
                <div className="text-sm text-gray-500">Receive money</div>
              </button>
              <button
                type="button"
                onClick={() => handleInputChange('type', 'OUTGOING')}
                className={`p-4 rounded-lg border text-center transition-all ${
                  formData.type === 'OUTGOING'
                    ? 'border-jordan bg-jordan/5 text-jordan font-medium'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-blue-600 mb-2">↑</div>
                <div className="font-medium">Outgoing</div>
                <div className="text-sm text-gray-500">Send money</div>
              </button>
            </div>
          </div>

          {/* Amount & Calculation */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Amount Details</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (JOD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    id="amount"
                    step="0.001"
                    min="0"
                    max="1000000"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className={`pl-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent ${
                      errors.amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.000"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Real-time calculation display */}
              {calculatedValues.isValid && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Commission</span>
                    <span className="font-medium">
                      {calculatedValues.commission.toLocaleString()} JOD
                      {exchangeData && (
                        <span className="text-gray-500 ml-1">
                          ({exchangeData[formData.type === 'INCOMING' ? 'incomingCommissionType' : 'outgoingCommissionType'] === 'FIXED' 
                            ? 'Fixed' 
                            : `${exchangeData[formData.type === 'INCOMING' ? 'incomingCommissionValue' : 'outgoingCommissionValue']}%`})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-gray-900">
                      {formData.type === 'INCOMING' ? 'You will receive' : 'Total deduction'}
                    </span>
                    <span className={formData.type === 'INCOMING' ? 'text-green-600' : 'text-blue-600'}>
                      {calculatedValues.netAmount.toLocaleString()} JOD
                    </span>
                  </div>
                  {formData.type === 'OUTGOING' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">New balance</span>
                      <span className={`font-medium ${
                        (exchangeData.balance - calculatedValues.netAmount) >= 0 ? 'text-gray-900' : 'text-red-600'
                      }`}>
                        {(exchangeData.balance - calculatedValues.netAmount).toLocaleString()} JOD
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Type-specific fields */}
          {formData.type === 'INCOMING' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Incoming Transfer Details</h2>
              
              <div>
                <label htmlFor="senderName" className="block text-sm font-medium text-gray-700 mb-1">
                  Sender Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="senderName"
                    value={formData.senderName}
                    onChange={(e) => handleInputChange('senderName', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
                    placeholder="Enter sender name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Used *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    className={`pl-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent ${
                      errors.bankName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select bank</option>
                    {availableBanks.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                {errors.bankName && (
                  <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Proof Screenshot *
                </label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  errors.paymentProof ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-jordan'
                } transition-colors`}>
                  {formData.paymentProof ? (
                    <div className="space-y-3">
                      <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
                      <div className="text-sm text-green-600 font-medium">
                        {formData.paymentProof.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(formData.paymentProof.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileChange(undefined)}
                        className="text-sm text-red-600 hover:text-red-700 underline"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Camera className="w-8 h-8 mx-auto text-gray-400" />
                      <div className="text-sm text-gray-600">
                        Upload payment confirmation screenshot
                      </div>
                      
                      {/* Mobile Camera Button */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          type="button"
                          onClick={handleCameraCapture}
                          className="inline-flex items-center justify-center px-4 py-2 bg-jordan text-white rounded-lg hover:bg-jordan-dark transition-colors text-sm font-medium"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </button>
                        
                        <label className="inline-flex items-center justify-center px-4 py-2 border border-jordan text-jordan rounded-lg hover:bg-jordan hover:text-white transition-colors text-sm font-medium cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        PNG, JPG, JPEG up to 5MB
                      </div>
                    </div>
                  )}
                </div>
                {errors.paymentProof && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {errors.paymentProof}
                  </p>
                )}
              </div>
            </div>
          )}

          {formData.type === 'OUTGOING' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Outgoing Transfer Details</h2>
              
              <div>
                <label htmlFor="cliqBankAliasName" className="block text-sm font-medium text-gray-700 mb-1">
                  CliQ Bank Alias Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="cliqBankAliasName"
                    value={formData.cliqBankAliasName}
                    onChange={(e) => handleInputChange('cliqBankAliasName', e.target.value)}
                    className={`pl-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent ${
                      errors.cliqBankAliasName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter CliQ alias name"
                  />
                </div>
                {errors.cliqBankAliasName && (
                  <p className="mt-1 text-sm text-red-600">{errors.cliqBankAliasName}</p>
                )}
              </div>

              <div>
                <label htmlFor="cliqMobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  CliQ Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    id="cliqMobileNumber"
                    value={formData.cliqMobileNumber}
                    onChange={(e) => handleInputChange('cliqMobileNumber', e.target.value)}
                    className={`pl-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent ${
                      errors.cliqMobileNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="077XXXXXXX or 00962777XXXXXX"
                  />
                </div>
                {errors.cliqMobileNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.cliqMobileNumber}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Jordanian mobile number format: 077/078/079XXXXXXX or 00962777XXXXXX
                </p>
              </div>

              <div>
                <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => handleInputChange('recipientName', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
                    placeholder="Enter recipient name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="recipientBank" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Bank (Optional)
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="recipientBank"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
                  >
                    <option value="">Select recipient bank</option>
                    {availableBanks.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <button
              type="submit"
              disabled={isSubmitting || !calculatedValues.isValid}
              className="w-full bg-jordan text-white py-3 px-4 rounded-lg font-medium hover:bg-jordan-dark focus:outline-none focus:ring-2 focus:ring-jordan focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating Order...
                </div>
              ) : (
                `Create ${formData.type.charAt(0) + formData.type.toLowerCase().slice(1)} Order`
              )}
            </button>

            {calculatedValues.isValid && (
              <div className="mt-3 text-center">
                <div className="inline-flex items-center text-sm text-gray-600">
                  <Info className="w-4 h-4 mr-1" />
                  {formData.type === 'INCOMING' 
                    ? 'Order will be submitted for admin review'
                    : 'Your balance will be updated immediately'
                  }
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
} 