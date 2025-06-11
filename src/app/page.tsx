import React from 'react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              MTEOC Transfer
            </h1>
            <p className="text-gray-600 text-sm">
              Financial Transfer Management System
            </p>
          </div>

          <div className="mb-8">
            <div className="w-20 h-20 bg-jordan rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Secure financial transfer management for exchange offices with real-time processing and communication.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/auth/login"
              className="w-full bg-jordan hover:bg-jordan-dark text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 block"
            >
              Sign In
            </Link>
            
            <div className="text-xs text-gray-400 mt-6">
              Mobile-optimized for exchange offices in Jordan
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-white/80 text-sm">
            Secure • Real-time • Mobile-first
          </p>
        </div>
      </div>
    </div>
  )
} 