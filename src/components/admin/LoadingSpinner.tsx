'use client'

import React from 'react'
import { Loader2, Shield } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  subtext?: string
  fullScreen?: boolean
  icon?: 'default' | 'shield'
  className?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  subtext,
  fullScreen = false,
  icon = 'default',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  const SpinnerIcon = icon === 'shield' ? Shield : Loader2

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-jordan rounded-full flex items-center justify-center mx-auto mb-4 relative">
              {icon === 'shield' ? (
                <>
                  <Shield className="w-8 h-8 text-white" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-jordan-light animate-spin"></div>
                </>
              ) : (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              )}
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {text}
            </h1>
            {subtext && (
              <p className="text-gray-600 text-sm">
                {subtext}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <SpinnerIcon className={`${sizeClasses[size]} text-jordan animate-spin mb-3`} />
      <p className={`${textSizeClasses[size]} font-medium text-gray-900 mb-1`}>
        {text}
      </p>
      {subtext && (
        <p className="text-sm text-gray-600 text-center max-w-sm">
          {subtext}
        </p>
      )}
    </div>
  )
}

// Inline loading spinner for buttons and small spaces
export function InlineSpinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md', className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6'
  }

  return (
    <Loader2 className={`${sizeClasses[size]} text-current animate-spin ${className}`} />
  )
}

// Table loading spinner for data tables
export function TableLoadingSpinner({ text = 'Loading data...', rows = 5 }: { text?: string, rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-jordan animate-spin mb-4" />
        <p className="text-gray-600 font-medium">{text}</p>
      </div>
    </div>
  )
}

// Card loading spinner for dashboard cards
export function CardLoadingSpinner({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-jordan animate-spin" />
        </div>
      ))}
    </div>
  )
} 