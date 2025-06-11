'use client'

import React from 'react'
import { useAuthGuard } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'
import { ExchangeHeader } from '@/components/exchange/ExchangeHeader'
import { ExchangeSidebar } from '@/components/exchange/ExchangeSidebar'

interface ExchangeLayoutProps {
  children: React.ReactNode
}

export default function ExchangeLayout({ children }: ExchangeLayoutProps) {
  const { isAuthenticated, isLoading } = useAuthGuard('exchange')

  // Show loading state while authentication is being checked
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner 
          size="lg"
          text="Loading Exchange Dashboard"
          subtext="Please wait while we prepare your interface"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <ExchangeHeader />
      
      {/* Desktop/Tablet Layout */}
      <div className="lg:flex">
        {/* Sidebar - Hidden on mobile, shown on larger screens */}
        <div className="hidden lg:block lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16">
          <ExchangeSidebar />
        </div>
        
        {/* Main Content */}
        <div className="lg:pl-64">
          <main className="pt-16 lg:pt-0">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
} 