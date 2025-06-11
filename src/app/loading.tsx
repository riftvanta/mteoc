import React from 'react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-jordan rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="loading-spinner w-8 h-8"></div>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Loading...
            </h1>
            <p className="text-gray-600 text-sm">
              Please wait while we load your content
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 