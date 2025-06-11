'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Building2,
  FileText,
  PlusCircle,
  MessageSquare,
  HelpCircle,
  X,
  BarChart3
} from 'lucide-react'

interface ExchangeMobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function ExchangeMobileMenu({ isOpen, onClose }: ExchangeMobileMenuProps) {
  const router = useRouter()
  const pathname = usePathname()

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/exchange',
      icon: Building2,
      description: 'Overview and balance',
      current: pathname === '/exchange'
    },
    {
      name: 'My Orders',
      href: '/exchange/orders',
      icon: FileText,
      description: 'View all your orders',
      current: pathname.startsWith('/exchange/orders') && pathname !== '/exchange/orders/new'
    },
    {
      name: 'New Order',
      href: '/exchange/orders/new',
      icon: PlusCircle,
      description: 'Create new transfer',
      current: pathname === '/exchange/orders/new'
    },
    {
      name: 'Reports',
      href: '/exchange/reports',
      icon: BarChart3,
      description: 'View analytics & reports'
    },
    {
      name: 'Messages',
      href: '/exchange/messages',
      icon: MessageSquare,
      description: 'Chat with admin'
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
              <p className="text-sm text-gray-500">Exchange Dashboard</p>
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
                    className={`flex items-center p-3 rounded-lg transition-colors duration-200 group ${
                      item.current
                        ? 'bg-jordan text-white'
                        : 'text-gray-700 hover:text-jordan hover:bg-jordan-light'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mr-3 ${
                      item.current ? 'text-white' : 'group-hover:text-jordan'
                    }`} />
                    <div className="flex-1">
                      <div className={`font-medium ${
                        item.current ? 'text-white' : ''
                      }`}>{item.name}</div>
                      <div className={`text-sm ${
                        item.current ? 'text-white/80' : 'text-gray-500 group-hover:text-jordan-dark'
                      }`}>
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
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-jordan rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Exchange Office</p>
                <p className="text-xs text-gray-500">Financial Transfer System</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/exchange/help"
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