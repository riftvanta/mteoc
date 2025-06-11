'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Building2, Shield, ArrowRight, LogOut } from 'lucide-react'
import { InlineSpinner } from '@/components/admin/LoadingSpinner'

export default function DashboardPage() {
  const { isAuthenticated, isAdmin, isExchange, exchangeName, logout, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect based on user role
      if (isAdmin) {
        router.push('/admin')
      } else if (isExchange) {
        router.push('/exchange')
      }
    } else if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isAdmin, isExchange, isLoading, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-jordan rounded-full flex items-center justify-center mx-auto mb-4">
              <InlineSpinner size="md" className="text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Dashboard...
            </h1>
            <p className="text-gray-600 text-sm">
              Please wait while we set up your dashboard
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show welcome screen while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-jordan rounded-full flex items-center justify-center mx-auto mb-4">
              {isAdmin ? (
                <Shield className="w-8 h-8 text-white" />
              ) : (
                <Building2 className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome{isExchange && exchangeName ? `, ${exchangeName}` : ''}!
            </h1>
            <p className="text-gray-600 text-sm">
              {isAdmin 
                ? 'Admin Dashboard - Manage all exchange offices and orders'
                : 'Exchange Office Dashboard - Manage your orders and balance'
              }
            </p>
          </div>

          {/* Redirect Info */}
          <div className="mb-6 p-4 bg-jordan-light rounded-lg">
            <div className="flex items-center justify-center text-jordan-dark">
              <ArrowRight className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                Redirecting to your dashboard...
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push(isAdmin ? '/admin' : '/exchange')}
              className="w-full bg-jordan hover:bg-jordan-dark text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go to {isAdmin ? 'Admin' : 'Exchange'} Dashboard
            </button>
            
            <button
              onClick={logout}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              MTEOC Financial Transfer Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 