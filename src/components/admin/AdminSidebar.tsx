'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home,
  Users,
  FileText,
  BarChart3,
  CreditCard,
  MessageSquare,
  Settings,
  Shield,
  HelpCircle
} from 'lucide-react'

export function AdminSidebar() {
  const pathname = usePathname()

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: Home,
      current: pathname === '/admin'
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: FileText,
      current: pathname.startsWith('/admin/orders')
    },
    {
      name: 'Exchange Offices',
      href: '/admin/exchanges',
      icon: Users,
      current: pathname.startsWith('/admin/exchanges')
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      current: pathname.startsWith('/admin/analytics')
    },
    {
      name: 'Financial Config',
      href: '/admin/financial',
      icon: CreditCard,
      current: pathname.startsWith('/admin/financial')
    },
    {
      name: 'Messages',
      href: '/admin/messages',
      icon: MessageSquare,
      current: pathname.startsWith('/admin/messages')
    },
  ]

  const bottomItems = [
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
      current: pathname.startsWith('/admin/settings')
    },
    {
      name: 'Help',
      href: '/admin/help',
      icon: HelpCircle,
      current: pathname.startsWith('/admin/help')
    },
  ]

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo & Title */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="w-8 h-8 bg-jordan rounded-lg flex items-center justify-center mr-3">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Admin</h1>
          <p className="text-xs text-gray-500">MTEOC Transfer</p>
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

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>Version 1.0.0</p>
          <p className="mt-1">© 2025 MTEOC</p>
        </div>
      </div>
    </div>
  )
} 