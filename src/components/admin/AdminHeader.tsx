'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { 
  Menu, 
  X, 
  Bell, 
  Settings, 
  LogOut, 
  Shield,
  Home,
  Users,
  FileText,
  BarChart3,
  CreditCard,
  MessageSquare
} from 'lucide-react'
import { AdminMobileMenu } from './AdminMobileMenu'

export function AdminHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { logout, user } = useAuth()
  const router = useRouter()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleLogout = async () => {
    await logout()
  }

  // Mock notifications - will be replaced with real-time data
  const notifications = [
    { id: 1, message: '3 new orders pending review', time: '2 min ago', type: 'order' },
    { id: 2, message: 'Exchange cancellation request', time: '5 min ago', type: 'cancellation' },
    { id: 3, message: 'New exchange registration', time: '10 min ago', type: 'user' },
  ]

  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 lg:z-30">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Mobile Menu Button & Logo */}
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jordan"
              aria-label="Open menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
            
            <div className="flex items-center ml-2 lg:ml-0">
              <div className="w-8 h-8 bg-jordan rounded-lg flex items-center justify-center mr-3">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-500">MTEOC Transfer System</p>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jordan relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown - Fixed positioning */}
              {showNotifications && (
                <>
                  {/* Mobile Full Screen Dropdown */}
                  <div className="fixed inset-x-4 top-20 bg-white rounded-lg shadow-xl border border-gray-200 z-50 sm:hidden">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                          <p className="text-sm text-gray-900 leading-relaxed">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 text-center border-t border-gray-200">
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-sm text-jordan hover:text-jordan-dark font-medium transition-colors duration-150"
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>

                  {/* Desktop Dropdown */}
                  <div className="hidden sm:block absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                          <p className="text-sm text-gray-900 leading-relaxed">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 text-center border-t border-gray-200">
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="text-sm text-jordan hover:text-jordan-dark font-medium transition-colors duration-150"
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => router.push('/admin/settings')}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-jordan"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">{user?.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <AdminMobileMenu 
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Notifications Overlay for Mobile */}
      {showNotifications && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </>
  )
} 