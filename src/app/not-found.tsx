import React from 'react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              404 - Page Not Found
            </h1>
            <p className="text-gray-600 text-sm">
              The page you're looking for doesn't exist.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="w-full bg-jordan hover:bg-jordan-dark text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 block"
            >
              Return to Home
            </Link>
            
            <div className="text-xs text-gray-400 mt-6">
              MTEOC Transfer Management System
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 