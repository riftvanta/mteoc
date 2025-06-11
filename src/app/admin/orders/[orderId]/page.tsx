'use client'

import React, { useState } from 'react'
import { 
  ArrowLeft,
  Check,
  X,
  Upload,
  Download,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  FileText,
  DollarSign,
  Calendar,
  User,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Info,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { formatJordanTime } from '@/utils/timezone'

interface OrderDetails {
  id: string
  orderNumber: string
  type: 'INCOMING' | 'OUTGOING'
  status: string
  amount: number
  commission: number
  netAmount: number
  createdAt: string
  updatedAt: string
  approvedAt?: string
  completedAt?: string
  urgent: boolean
  
  // Order details
  senderName?: string
  recipientName?: string
  bankName?: string
  cliqBankAliasName?: string
  cliqMobileNumber?: string
  paymentProofUrl?: string
  completionProofUrl?: string
  rejectionReason?: string
  cancellationReason?: string
  cancellationRequested: boolean
  
  // Exchange information
  exchange: {
    id: string
    name: string
    username: string
    balance: number
    contactEmail?: string
    contactPhone?: string
    commissionSettings: {
      incoming: { type: string; value: number }
      outgoing: { type: string; value: number }
    }
    allowedBanks: {
      incoming: string[]
      outgoing: string[]
    }
  }
  
  // Available actions
  actions: {
    canApprove: boolean
    canReject: boolean
    canComplete: boolean
    canUploadProof: boolean
    canHandleCancellation: boolean
  }
  
  // Messages
  messages: Array<{
    id: string
    content: string
    senderType: string
    senderUsername: string
    createdAt: string
  }>
}

export default function AdminOrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<string>('')

  // Action states
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCancelModal, setCancelShowModal] = useState(false)
  
  // Form states
  const [rejectionReason, setRejectionReason] = useState('')
  const [actualAmount, setActualAmount] = useState<string>('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [cancelAction, setCancelAction] = useState<'approve' | 'reject'>('approve')
  const [cancelReason, setCancelReason] = useState('')

  // Load order details
  React.useEffect(() => {
    const loadOrder = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/admin/orders/${orderId}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load order')
        }
        
        const orderData = await response.json()
        setOrder(orderData)
        setActualAmount(orderData.amount.toString())
      } catch (err) {
        console.error('Error loading order:', err)
        setIsError(true)
        setError(err instanceof Error ? err.message : 'Failed to load order')
      } finally {
        setIsLoading(false)
      }
    }

    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  // Status helpers
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'PENDING_REVIEW':
      case 'SUBMITTED':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'PROCESSING':
        return <RefreshCw className="w-5 h-5 text-blue-500" />
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'APPROVED':
        return <Check className="w-5 h-5 text-green-500" />
      case 'CANCELLED':
        return <X className="w-5 h-5 text-gray-500" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PROCESSING':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Action handlers
  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve order')
      }

      const result = await response.json()
      alert(`Order approved successfully! ${result.message}`)
      
      // Reload order data
      window.location.reload()
    } catch (err) {
      console.error('Approval error:', err)
      alert(err instanceof Error ? err.message : 'Failed to approve order')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject order')
      }

      const result = await response.json()
      alert(`Order rejected successfully! ${result.message}`)
      
      setShowRejectModal(false)
      setRejectionReason('')
      window.location.reload()
    } catch (err) {
      console.error('Rejection error:', err)
      alert(err instanceof Error ? err.message : 'Failed to reject order')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleComplete = async () => {
    setIsProcessing(true)
    try {
      const body: any = {}
      
      // For incoming transfers, include actual amount if changed
      if (order?.type === 'INCOMING' && actualAmount) {
        const amount = parseFloat(actualAmount)
        if (amount > 0 && amount !== order.amount) {
          body.actualAmount = amount
        }
      }

      const response = await fetch(`/api/admin/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete order')
      }

      const result = await response.json()
      alert(`Order completed successfully! ${result.message}`)
      
      setShowCompleteModal(false)
      window.location.reload()
    } catch (err) {
      console.error('Completion error:', err)
      alert(err instanceof Error ? err.message : 'Failed to complete order')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      alert('Please select a file to upload')
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)

      const response = await fetch(`/api/admin/orders/${orderId}/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload file')
      }

      const result = await response.json()
      alert(`File uploaded successfully! ${result.message}`)
      
      setShowUploadModal(false)
      setUploadFile(null)
      window.location.reload()
    } catch (err) {
      console.error('Upload error:', err)
      alert(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancellation = async () => {
    if (cancelAction === 'reject' && !cancelReason.trim()) {
      alert('Please provide a reason for rejecting the cancellation')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: cancelAction,
          reason: cancelReason || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to handle cancellation')
      }

      const result = await response.json()
      alert(`Cancellation ${result.action} successfully! ${result.message}`)
      
      setCancelShowModal(false)
      setCancelReason('')
      window.location.reload()
    } catch (err) {
      console.error('Cancellation error:', err)
      alert(err instanceof Error ? err.message : 'Failed to handle cancellation')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner 
          size="lg"
          text="Loading Order Details"
          subtext="Please wait while we fetch the order information"
          className="py-16"
        />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Order Not Found</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800 mb-1">Error Loading Order</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order {order.orderNumber}
            </h1>
            <p className="text-gray-600">
              {order.exchange.name} • {formatJordanTime(order.createdAt, 'dd MMM yyyy HH:mm')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {order.urgent && (
            <div className="flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Urgent
            </div>
          )}
          
          <div className={`flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
            {getStatusIcon(order.status)}
            <span className="ml-2">{order.status.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Overview</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.type === 'INCOMING' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {order.type === 'INCOMING' ? '↓ Incoming' : '↑ Outgoing'}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {order.amount.toLocaleString()} JOD
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Commission</p>
                <p className="text-sm text-gray-900 mt-1">
                  {order.commission.toLocaleString()} JOD
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Net Amount</p>
                <p className="text-sm text-gray-900 mt-1">
                  {order.netAmount.toLocaleString()} JOD
                </p>
              </div>
            </div>

            {/* Transfer Details */}
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3">Transfer Details</h3>
              <div className="space-y-3">
                {order.senderName && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 mr-2">From:</span>
                    <span className="text-sm text-gray-900">{order.senderName}</span>
                  </div>
                )}
                
                {order.recipientName && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 mr-2">To:</span>
                    <span className="text-sm text-gray-900">{order.recipientName}</span>
                  </div>
                )}
                
                {order.bankName && (
                  <div className="flex items-center">
                    <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 mr-2">Bank:</span>
                    <span className="text-sm text-gray-900">{order.bankName}</span>
                  </div>
                )}
                
                {order.cliqBankAliasName && (
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 mr-2">CliQ Alias:</span>
                    <span className="text-sm text-gray-900">{order.cliqBankAliasName}</span>
                  </div>
                )}
                
                {order.cliqMobileNumber && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 mr-2">CliQ Mobile:</span>
                    <span className="text-sm text-gray-900">{order.cliqMobileNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Files */}
            {(order.paymentProofUrl || order.completionProofUrl) && (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium text-gray-900 mb-3">Attachments</h3>
                <div className="space-y-2">
                  {order.paymentProofUrl && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">Payment Proof</span>
                      </div>
                      <a
                        href={order.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-jordan hover:text-jordan-dark text-sm font-medium"
                      >
                        View
                      </a>
                    </div>
                  )}
                  
                  {order.completionProofUrl && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">Completion Proof</span>
                      </div>
                      <a
                        href={order.completionProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-jordan hover:text-jordan-dark text-sm font-medium"
                      >
                        View
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rejection/Cancellation Reasons */}
            {(order.rejectionReason || order.cancellationReason) && (
              <div className="border-t pt-4 mt-4">
                {order.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-red-800 mb-1">Rejection Reason</h4>
                        <p className="text-red-700 text-sm">{order.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {order.cancellationReason && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">Cancellation Reason</h4>
                        <p className="text-gray-700 text-sm">{order.cancellationReason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cancellation Request Alert */}
            {order.cancellationRequested && (
              <div className="border-t pt-4 mt-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-orange-800 mb-1">Cancellation Requested</h4>
                      <p className="text-orange-700 text-sm mb-3">
                        The exchange has requested to cancel this order. Please review and approve or reject this request.
                      </p>
                      {order.actions.canHandleCancellation && (
                        <button
                          onClick={() => setCancelShowModal(true)}
                          className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                        >
                          Handle Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {(order.actions.canApprove || order.actions.canReject || order.actions.canComplete || order.actions.canUploadProof) && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
              
              <div className="flex flex-wrap gap-3">
                {order.actions.canApprove && (
                  <button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve Order
                  </button>
                )}
                
                {order.actions.canReject && (
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject Order
                  </button>
                )}
                
                {order.actions.canComplete && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </button>
                )}
                
                {order.actions.canUploadProof && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Proof
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Exchange Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Exchange Details</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Exchange Name</p>
                <p className="font-medium text-gray-900">{order.exchange.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Username</p>
                <p className="text-sm text-gray-900">{order.exchange.username}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {order.exchange.balance.toLocaleString()} JOD
                </p>
              </div>
              
              {order.exchange.contactEmail && (
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{order.exchange.contactEmail}</span>
                </div>
              )}
              
              {order.exchange.contactPhone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-900">{order.exchange.contactPhone}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Link
                href={`/admin/exchanges/${order.exchange.id}`}
                className="inline-flex items-center text-jordan hover:text-jordan-dark text-sm font-medium"
              >
                View Exchange Details
                <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Timeline</h2>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-medium">{formatJordanTime(order.createdAt, 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
              
              {order.approvedAt && (
                <div className="flex items-center text-sm">
                  <Check className="w-4 h-4 text-green-500 mr-2" />
                  <div>
                    <p className="text-gray-600">Approved</p>
                    <p className="font-medium">{formatJordanTime(order.approvedAt, 'dd MMM yyyy HH:mm')}</p>
                  </div>
                </div>
              )}
              
              {order.completedAt && (
                <div className="flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <div>
                    <p className="text-gray-600">Completed</p>
                    <p className="font-medium">{formatJordanTime(order.completedAt, 'dd MMM yyyy HH:mm')}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="font-medium">{formatJordanTime(order.updatedAt, 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Commission Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Commission Settings</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Incoming Commission</p>
                <p className="text-sm text-gray-900">
                  {order.exchange.commissionSettings.incoming.type === 'FIXED' 
                    ? `${order.exchange.commissionSettings.incoming.value} JOD` 
                    : `${order.exchange.commissionSettings.incoming.value}%`
                  }
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Outgoing Commission</p>
                <p className="text-sm text-gray-900">
                  {order.exchange.commissionSettings.outgoing.type === 'FIXED' 
                    ? `${order.exchange.commissionSettings.outgoing.value} JOD` 
                    : `${order.exchange.commissionSettings.outgoing.value}%`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Order</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this order. This will be shown to the exchange.
            </p>
            
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
            />
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'Rejecting...' : 'Reject Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Complete Order</h3>
            
            {order.type === 'INCOMING' ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Confirm the actual amount received for this incoming transfer.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Amount Received (JOD)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Original amount: {order.amount.toLocaleString()} JOD
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 mb-4">
                Mark this outgoing transfer as completed.
              </p>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? 'Completing...' : 'Complete Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Completion Proof</h3>
            <p className="text-gray-600 mb-4">
              Upload a screenshot showing the completion of this outgoing transfer.
            </p>
            
            <div className="mb-4">
              <input
                type="file"
                accept="image/png,image/jpg,image/jpeg"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, JPEG files only. Max 5MB.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isProcessing || !uploadFile}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isProcessing ? 'Uploading...' : 'Upload & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Handle Cancellation Request</h3>
            <p className="text-gray-600 mb-4">
              The exchange has requested to cancel this order. Choose your action:
            </p>
            
            <div className="mb-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="cancelAction"
                    value="approve"
                    checked={cancelAction === 'approve'}
                    onChange={(e) => setCancelAction(e.target.value as 'approve')}
                    className="mr-2"
                  />
                  Approve Cancellation
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="cancelAction"
                    value="reject"
                    checked={cancelAction === 'reject'}
                    onChange={(e) => setCancelAction(e.target.value as 'reject')}
                    className="mr-2"
                  />
                  Reject Cancellation
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason {cancelAction === 'reject' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={`Enter reason for ${cancelAction}ing the cancellation...`}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setCancelShowModal(false)
                  setCancelReason('')
                  setCancelAction('approve')
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCancellation}
                disabled={isProcessing || (cancelAction === 'reject' && !cancelReason.trim())}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  cancelAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing ? 'Processing...' : `${cancelAction === 'approve' ? 'Approve' : 'Reject'} Cancellation`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 