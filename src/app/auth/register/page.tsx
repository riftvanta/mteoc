'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { Building2, Mail, Lock, ArrowLeft, DollarSign, Percent } from 'lucide-react'
import toast from 'react-hot-toast'
import { isValidJordanianMobile } from '@/utils/validation'

// Validation schema for exchange office registration
const registerSchema = z.object({
  // Exchange Office Details
  exchangeName: z
    .string()
    .min(1, 'Exchange office name is required')
    .min(3, 'Exchange name must be at least 3 characters'),
  
  // Account Credentials
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm the password'),
  
  // Contact Information
  contactInfo: z
    .string()
    .min(1, 'Contact information is required'),
  
  // Financial Configuration
  initialBalance: z
    .number()
    .min(-999999, 'Balance cannot be less than -999,999 JOD')
    .max(999999, 'Balance cannot exceed 999,999 JOD'),
  
  // Commission Rates
  incomingFixed: z
    .number()
    .min(0, 'Fixed commission cannot be negative')
    .max(100, 'Fixed commission cannot exceed 100 JOD'),
  incomingPercentage: z
    .number()
    .min(0, 'Percentage commission cannot be negative')
    .max(10, 'Percentage commission cannot exceed 10%'),
  outgoingFixed: z
    .number()
    .min(0, 'Fixed commission cannot be negative')
    .max(100, 'Fixed commission cannot exceed 100 JOD'),
  outgoingPercentage: z
    .number()
    .min(0, 'Percentage commission cannot be negative')
    .max(10, 'Percentage commission cannot exceed 10%'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { isAdmin, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      initialBalance: 0,
      incomingFixed: 0,
      incomingPercentage: 1,
      outgoingFixed: 0,
      outgoingPercentage: 1,
    },
  })

  // Redirect non-admin users
  React.useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Access denied: Admin privileges required')
      router.push('/dashboard')
    }
  }, [isAdmin, authLoading, router])

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/create-exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          exchangeName: data.exchangeName,
          contactInfo: data.contactInfo,
          initialBalance: data.initialBalance,
          commissionRates: {
            incomingFixed: data.incomingFixed,
            incomingPercentage: data.incomingPercentage,
            outgoingFixed: data.outgoingFixed,
            outgoingPercentage: data.outgoingPercentage,
          },
          allowedBanks: {
            incoming: [], // Will be configured later by admin
            outgoing: [], // Will be configured later by admin
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create exchange account')
      }

      const result = await response.json()
      toast.success(`Exchange office "${data.exchangeName}" created successfully!`)
      router.push('/admin/exchanges')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking admin status
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-jordan rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="loading-spinner w-6 h-6"></div>
            </div>
            <p className="text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </div>
    )
  }

  // Only render for admin users
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-jordan to-jordan-dark py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-jordan rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create Exchange Office Account
            </h1>
            <p className="text-gray-600 text-sm">
              Set up a new exchange office with custom configuration
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Exchange Office Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Exchange Office Details
              </h3>
              
              <div>
                <label htmlFor="exchangeName" className="block text-sm font-medium text-gray-700 mb-2">
                  Exchange Office Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('exchangeName')}
                    type="text"
                    id="exchangeName"
                    className={`
                      w-full pl-10 pr-4 py-3 border rounded-lg text-sm
                      focus:outline-none focus:ring-2 focus:ring-jordan focus:border-transparent
                      ${errors.exchangeName ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                    `}
                    placeholder="Enter exchange office name"
                    disabled={isLoading}
                  />
                </div>
                {errors.exchangeName && (
                  <p className="mt-1 text-sm text-red-600">{errors.exchangeName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Mobile Number *
                </label>
                <input
                  {...register('contactInfo')}
                  type="tel"
                  id="contactInfo"
                  className={`
                    w-full px-4 py-3 border rounded-lg text-sm
                    focus:outline-none focus:ring-2 focus:ring-jordan focus:border-transparent
                    ${errors.contactInfo ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                  `}
                  placeholder="0096277XXXXXXX or 077XXXXXXX"
                  disabled={isLoading}
                />
                {errors.contactInfo && (
                  <p className="mt-1 text-sm text-red-600">{errors.contactInfo.message}</p>
                )}
              </div>
            </div>

            {/* Account Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Account Credentials
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('email')}
                      type="email"
                      id="email"
                      className={`
                        w-full pl-10 pr-4 py-3 border rounded-lg text-sm
                        focus:outline-none focus:ring-2 focus:ring-jordan focus:border-transparent
                        ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                      `}
                      placeholder="exchange@example.com"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('password')}
                      type="password"
                      id="password"
                      className={`
                        w-full pl-10 pr-4 py-3 border rounded-lg text-sm
                        focus:outline-none focus:ring-2 focus:ring-jordan focus:border-transparent
                        ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                      `}
                      placeholder="Enter secure password"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    id="confirmPassword"
                    className={`
                      w-full pl-10 pr-4 py-3 border rounded-lg text-sm
                      focus:outline-none focus:ring-2 focus:ring-jordan focus:border-transparent
                      ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                    `}
                    placeholder="Confirm password"
                    disabled={isLoading}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Financial Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                Financial Configuration
              </h3>
              
              <div>
                <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Balance (JOD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('initialBalance', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    id="initialBalance"
                    className={`
                      w-full pl-10 pr-4 py-3 border rounded-lg text-sm
                      focus:outline-none focus:ring-2 focus:ring-jordan focus:border-transparent
                      ${errors.initialBalance ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                    `}
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </div>
                {errors.initialBalance && (
                  <p className="mt-1 text-sm text-red-600">{errors.initialBalance.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Can be positive, negative, or zero. Exchange office's starting balance.
                </p>
              </div>

              {/* Commission Rates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Incoming Commissions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Incoming Transfer Commission</h4>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Fixed Amount (JOD)</label>
                    <input
                      {...register('incomingFixed', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-jordan focus:border-jordan"
                      placeholder="0.00"
                      disabled={isLoading}
                    />
                    {errors.incomingFixed && (
                      <p className="mt-1 text-xs text-red-600">{errors.incomingFixed.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Percentage (%)</label>
                    <div className="relative">
                      <input
                        {...register('incomingPercentage', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        max="10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-jordan focus:border-jordan pr-8"
                        placeholder="1.00"
                        disabled={isLoading}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Percent className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    {errors.incomingPercentage && (
                      <p className="mt-1 text-xs text-red-600">{errors.incomingPercentage.message}</p>
                    )}
                  </div>
                </div>

                {/* Outgoing Commissions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Outgoing Transfer Commission</h4>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Fixed Amount (JOD)</label>
                    <input
                      {...register('outgoingFixed', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-jordan focus:border-jordan"
                      placeholder="0.00"
                      disabled={isLoading}
                    />
                    {errors.outgoingFixed && (
                      <p className="mt-1 text-xs text-red-600">{errors.outgoingFixed.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Percentage (%)</label>
                    <div className="relative">
                      <input
                        {...register('outgoingPercentage', { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        max="10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-jordan focus:border-jordan pr-8"
                        placeholder="1.00"
                        disabled={isLoading}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Percent className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    {errors.outgoingPercentage && (
                      <p className="mt-1 text-xs text-red-600">{errors.outgoingPercentage.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className={`
                  w-full py-3 px-4 rounded-lg text-white font-medium text-sm
                  transition-colors duration-200 min-h-[44px] flex items-center justify-center
                  ${isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-jordan hover:bg-jordan-dark focus:outline-none focus:ring-2 focus:ring-jordan focus:ring-offset-2'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Creating Account...
                  </>
                ) : (
                  'Create Exchange Office Account'
                )}
              </button>
            </div>
          </form>

          {/* Info Note */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Bank configuration and allowed payment methods can be set up later from the exchange management panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 