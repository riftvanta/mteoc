'use client'

import React from 'react'
import { Shield } from 'lucide-react'

export function AdminLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-scale-in">
          {/* Animated Shield Icon */}
          <div className="w-16 h-16 bg-jordan rounded-full flex items-center justify-center mx-auto mb-4 relative animate-pulse-soft">
            <Shield className="w-8 h-8 text-white" />
            {/* Animated Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-jordan-light opacity-60">
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-jordan-light animate-spin"></div>
            </div>
            {/* Secondary Ring */}
            <div className="absolute -inset-2 rounded-full border border-jordan-light opacity-30 animate-pulse"></div>
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Admin Dashboard
          </h1>
          
          <p className="text-gray-600 text-sm mb-6">
            Please wait while we prepare your administrative interface
          </p>
          
          {/* Enhanced Loading Animation */}
          <div className="flex justify-center space-x-1 mb-6">
            <div 
              className="w-2 h-2 bg-jordan rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div 
              className="w-2 h-2 bg-jordan rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div 
              className="w-2 h-2 bg-jordan rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
          
          {/* Enhanced Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-jordan to-jordan-dark h-2 rounded-full animate-loading-progress relative">
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
          
          {/* Status Text */}
          <p className="text-xs text-gray-400 animate-fade-in-row">
            Initializing admin controls and security checks...
          </p>
          
          {/* Additional Loading Indicator */}
          <div className="mt-4 flex justify-center">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 