'use client'

import React from 'react'
import { useAuthGuard } from '@/hooks/useAuth'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isLoading, isAuthenticated, isAdmin } = useAuthGuard('admin')

  // Show nothing while checking authentication - let the auth guard handle redirects
  if (isLoading || !isAuthenticated || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <AdminHeader />
      
      {/* Desktop/Tablet Layout */}
      <div className="lg:flex">
        {/* Sidebar - Hidden on mobile, shown on larger screens */}
        <div className="hidden lg:block lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16">
          <AdminSidebar />
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