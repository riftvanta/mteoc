'use client'

import React, { useState } from 'react'
import { 
  ArrowLeft,
  Download,
  Share2,
  MessageCircle,
  Edit3,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  FileText,
  Send,
  Paperclip,
  Phone,
  Building2,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Info
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { useExchangeOrder } from '@/hooks/useExchangeQueries'
import { useAuth } from '@/hooks/useAuth'
import { formatJordanTime } from '@/utils/timezone'
import ScreenshotViewer from '@/components/ScreenshotViewer'

interface OrderMessage {
  id: string
  content: string
  senderType: string
  createdAt: string
}

export default function ExchangeOrderDetailsPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const { exchangeName } = useAuth()
  const { data: order, isLoading, isError, error, refetch } = useExchangeOrder(orderId)

  // Chat state
  const [newMessage, setNewMessage] = useState('')
  const [showChat, setShowChat] = useState(false)

  // Status helpers
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'PENDING_REVIEW':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'PROCESSING':
        return <RefreshCw className="w-5 h-5 text-blue-500" />
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />
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
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'Your order has been submitted and is waiting for admin review.'
      case 'PENDING_REVIEW':
        return 'Admin is currently reviewing your order details.'
      case 'APPROVED':
        return 'Your order has been approved and will be processed soon.'
      case 'PROCESSING':
        return 'Your order is currently being processed by the admin.'
      case 'COMPLETED':
        return 'Your order has been completed successfully.'
      case 'REJECTED':
        return 'Your order has been rejected. Please check the rejection reason below.'
      case 'CANCELLED':
        return 'This order has been cancelled.'
      default:
        return 'Order status is being updated.'
    }
  }

  // Handle message send
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    // TODO: Implement message sending API
    console.log('Sending message:', newMessage)
    setNewMessage('')
  }

  // Handle file download
  const handleDownload = async (url: string, filename: string) => {
    // TODO: Implement file download
    console.log('Downloading file:', url, filename)
  }

  // Handle WhatsApp share
  const handleWhatsAppShare = async () => {
    if (!order?.completionProofUrl) return
    
    // TODO: Implement WhatsApp sharing
    console.log('Sharing to WhatsApp:', order.completionProofUrl)
  }

  // Handle order cancellation
  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    
    // TODO: Implement order cancellation API
    console.log('Cancelling order:', orderId)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner 
          size="lg"
          text="Loading Order Details"
          subtext="Please wait while we fetch your order information"
          className="py-16"
        />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <h3 className="text-lg font-medium">Error Loading Order</h3>
            <p className="text-sm mt-2">{error?.message || 'Order not found'}</p>
          </div>
          <div className="space-x-3">
            <button
              onClick={() => refetch()}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/exchange/orders"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/exchange/orders"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Order {order.orderNumber}
            </h1>
            <p className="text-sm text-gray-600">
              {order.type} transfer • Created {formatJordanTime(order.createdAt, 'dd MMM yyyy')}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {order.canDownload && order.completionProofUrl && (
            <>
              <button
                onClick={() => handleDownload(order.completionProofUrl!, `${order.orderNumber}_screenshot.png`)}
                className="p-2 text-jordan hover:bg-jordan-light rounded-lg transition-colors"
                title="Download screenshot"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Share to WhatsApp"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg transition-colors relative ${
              showChat ? 'bg-jordan text-white' : 'text-jordan hover:bg-jordan-light'
            }`}
            title="Chat with admin"
          >
            <MessageCircle className="w-5 h-5" />
            {order.messages && order.messages.length > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Order Status</h2>
              <div className={`flex items-center px-3 py-1 rounded-full border text-sm font-medium ${getStatusBadgeClass(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="ml-2">{order.status.replace('_', ' ')}</span>
              </div>
            </div>
            <p className="text-gray-600 mb-4">{getStatusDescription(order.status)}</p>
            
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

            {/* Order Actions */}
            {(order.canEdit || order.canCancel) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-2">
                  {order.canEdit && (
                    <Link
                      href={`/exchange/orders/${order.id}/edit`}
                      className="inline-flex items-center justify-center px-4 py-2 bg-jordan text-white rounded-lg font-medium hover:bg-jordan-dark transition-colors"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Order
                    </Link>
                  )}
                  {order.canCancel && (
                    <button
                      onClick={handleCancelOrder}
                      className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-medium text-gray-900">{order.amount.toLocaleString()} JOD</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FileText className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Commission</p>
                    <p className="font-medium text-gray-900">{order.commission.toLocaleString()} JOD</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Net Amount</p>
                    <p className="font-medium text-gray-900">{order.netAmount.toLocaleString()} JOD</p>
                  </div>
                </div>
              </div>

              {/* Type-specific details */}
              <div className="space-y-3">
                {order.type === 'INCOMING' ? (
                  <>
                    {order.senderName && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-600">Sender Name</p>
                          <p className="font-medium text-gray-900">{order.senderName}</p>
                        </div>
                      </div>
                    )}
                    {order.bankName && (
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-600">Bank</p>
                          <p className="font-medium text-gray-900">{order.bankName}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {order.recipientName && (
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-600">Recipient</p>
                          <p className="font-medium text-gray-900">{order.recipientName}</p>
                        </div>
                      </div>
                    )}
                    {order.cliqBankAliasName && (
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-600">CliQ Bank Alias</p>
                          <p className="font-medium text-gray-900">{order.cliqBankAliasName}</p>
                        </div>
                      </div>
                    )}
                    {order.cliqBankAliasMobile && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-600">CliQ Mobile</p>
                          <p className="font-medium text-gray-900">{order.cliqBankAliasMobile}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Screenshots */}
            {(order.paymentProofUrl || order.completionProofUrl) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Screenshots</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {order.paymentProofUrl && (
                    <ScreenshotViewer
                      base64Data={order.paymentProofUrl}
                      title="Payment Proof"
                      filename={`payment_proof_${order.orderNumber}.jpg`}
                      type="payment-proof"
                      showDownload={true}
                      showShare={false}
                    />
                  )}
                  {order.completionProofUrl && (
                    <ScreenshotViewer
                      base64Data={order.completionProofUrl}
                      title="Completion Screenshot"
                      filename={`completion_${order.orderNumber}.jpg`}
                      type="completion-proof"
                      showDownload={order.canDownload}
                      showShare={order.canDownload}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Order Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-medium">{formatJordanTime(order.createdAt, 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                <div>
                  <p className="text-gray-600">Last Updated</p>
                  <p className="font-medium">{formatJordanTime(order.updatedAt || order.createdAt, 'dd MMM yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Chat with Admin</h2>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {order.messages && order.messages.length > 0 ? (
                  order.messages.map((message: OrderMessage) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'EXCHANGE' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.senderType === 'EXCHANGE'
                            ? 'bg-jordan text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderType === 'EXCHANGE' ? 'text-white/70' : 'text-gray-500'
                        }`}>
                          {formatJordanTime(message.createdAt, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs">Start a conversation with the admin</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jordan focus:border-transparent text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-3 py-2 bg-jordan text-white rounded-lg hover:bg-jordan-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Help Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-800 mb-1">Need Help?</h3>
                <p className="text-blue-700 text-sm mb-3">
                  If you have questions about this order, use the chat feature to contact our admin team.
                </p>
                <button
                  onClick={() => setShowChat(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Start Chat →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 