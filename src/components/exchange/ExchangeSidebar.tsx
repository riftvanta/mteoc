'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { 
  Building2,
  FileText,
  PlusCircle,
  BarChart3,
  MessageSquare,
  HelpCircle,
  LogOut
} from 'lucide-react'

export function ExchangeSidebar() {
  const pathname = usePathname()
  const { exchangeName, logout } = useAuth()

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/exchange',
      icon: Building2,
      current: pathname === '/exchange'
    },
    {
      name: 'My Orders',
      href: '/exchange/orders',
      icon: FileText,
      current: pathname.startsWith('/exchange/orders') && pathname !== '/exchange/orders/new'
    },
    {
      name: 'New Order',
      href: '/exchange/orders/new',
      icon: PlusCircle,
      current: pathname === '/exchange/orders/new'
    },
    {
      name: 'Reports',
      href: '/exchange/reports',
      icon: BarChart3,
      current: pathname.startsWith('/exchange/reports')
    },
    {
      name: 'Messages',
      href: '/exchange/messages',
      icon: MessageSquare,
      current: pathname.startsWith('/exchange/messages')
    },
  ]

  const bottomItems = [
    {
      name: 'Help',
      href: '/exchange/help',
      icon: HelpCircle,
      current: pathname.startsWith('/exchange/help')
    },
  ]

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo & Title */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-jordan rounded-lg flex items-center justify-center mr-3">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{exchangeName}</h1>
          <p className="text-xs text-gray-500">Exchange Office</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                ${item.current
                  ? 'bg-jordan text-white'
                  : 'text-gray-700 hover:text-jordan hover:bg-jordan-light'
                }
              `}
            >
              <Icon 
                className={`
                  w-5 h-5 mr-3 flex-shrink-0
                  ${item.current
                    ? 'text-white'
                    : 'text-gray-400 group-hover:text-jordan'
                  }
                `}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-4 py-4 border-t border-gray-200 space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                ${item.current
                  ? 'bg-jordan text-white'
                  : 'text-gray-700 hover:text-jordan hover:bg-jordan-light'
                }
              `}
            >
              <Icon 
                className={`
                  w-5 h-5 mr-3 flex-shrink-0
                  ${item.current
                    ? 'text-white'
                    : 'text-gray-400 group-hover:text-jordan'
                  }
                `}
              />
              {item.name}
            </Link>
          )
        })}
      </div>

      {/* Footer - Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 group"
        >
          <LogOut className="w-5 h-5 mr-3 flex-shrink-0 text-gray-400 group-hover:text-red-500" />
          Sign out
        </button>
      </div>
    </div>
  )
} 