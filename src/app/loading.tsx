import React from 'react'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'

export default function Loading() {
  return (
    <LoadingSpinner 
      fullScreen 
      text="Loading..."
      subtext="Please wait while we load your content"
    />
  )
} 