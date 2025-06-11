'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Home,
  Users,
  FileText,
  BarChart3,
  CreditCard,
  MessageSquare,
  Settings,
  HelpCircle,
  X
} from 'lucide-react'

interface AdminMobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminMobileMenu({ isOpen, onClose }: AdminMobileMenuProps) {
  const router = useRouter()

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: Home,
      description: 'Overview and analytics'
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: FileText,
      description: 'Manage all transfers'
    },
    {
      name: 'Exchange Offices',
      href: '/admin/exchanges',
      icon: Users,
      description: 'User management'
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      description: 'Reports and insights'
    },
    {
      name: 'Financial Config',
      href: '/admin/financial',
      icon: CreditCard,
      description: 'Banks and commissions'
    },
    {
      name: 'Messages',
      href: '/admin/messages',
      icon: MessageSquare,
      description: 'Communication center'
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      description: 'System configuration'
    },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Mobile Menu Panel */}
      <div className="fixed top-0 left-0 bottom-0 w-80 max-w-full bg-white z-50 lg:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
              <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center p-3 rounded-lg text-gray-700 hover:text-jordan hover:bg-jordan-light transition-colors duration-200 group"
                  >
                    <Icon className="w-6 h-6 mr-3 group-hover:text-jordan" />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500 group-hover:text-jordan-dark">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-jordan rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">A</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">System Administrator</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                href="/admin/help"
                onClick={onClose}
                className="flex items-center text-sm text-gray-600 hover:text-jordan"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help & Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 