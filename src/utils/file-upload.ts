import { supabase } from '@/lib/supabase/client'
import { validateFileUpload } from '@/utils/validation'
import imageCompression from 'browser-image-compression'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface UploadOptions {
  compress?: boolean
  maxSizeMB?: number
  maxWidthOrHeight?: number
  bucket?: string
  folder?: string
}

/**
 * Upload file to Supabase Storage with compression and validation
 */
export const uploadFile = async (
  file: File,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  try {
    // Validate file
    const validation = validateFileUpload(file)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    const {
      compress = true,
      maxSizeMB = 1,
      maxWidthOrHeight = 1920,
      bucket = 'order-documents',
      folder = 'payment-proofs'
    } = options

    let processedFile = file

    // Compress image if requested
    if (compress && file.type.startsWith('image/')) {
      try {
        processedFile = await imageCompression(file, {
          maxSizeMB,
          maxWidthOrHeight,
          useWebWorker: true,
          fileType: file.type
        })
      } catch (compressionError) {
        console.warn('Image compression failed, using original file:', compressionError)
        processedFile = file
      }
    }

    // Generate unique file path
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split('.').pop()
    const uniqueFileName = `${fileName}_${timestamp}_${randomSuffix}.${fileExtension}`
    const filePath = `${folder}/${uniqueFileName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, processedFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      return {
        success: false,
        error: `Upload failed: ${error.message}`
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl
    }

  } catch (error) {
    console.error('File upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    }
  }
}

/**
 * Upload payment proof screenshot for incoming transfers
 */
export const uploadPaymentProof = async (
  file: File,
  orderId: string
): Promise<UploadResult> => {
  return uploadFile(file, `payment_proof_${orderId}`, {
    compress: true,
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    bucket: 'order-documents',
    folder: 'payment-proofs'
  })
}

/**
 * Upload completion proof screenshot for outgoing transfers (admin only)
 */
export const uploadCompletionProof = async (
  file: File,
  orderId: string
): Promise<UploadResult> => {
  return uploadFile(file, `completion_proof_${orderId}`, {
    compress: true,
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    bucket: 'order-documents',
    folder: 'completion-proofs'
  })
}

/**
 * Delete file from Supabase Storage
 */
export const deleteFile = async (
  filePath: string,
  bucket: string = 'order-documents'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown delete error'
    }
  }
}

/**
 * Get signed URL for secure file access (if needed)
 */
export const getSignedUrl = async (
  filePath: string,
  expiresIn: number = 3600,
  bucket: string = 'order-documents'
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      url: data.signedUrl
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Mobile camera capture utilities
 */
export const captureFromCamera = (): Promise<File | null> => {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Use back camera on mobile
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      resolve(file || null)
    }
    
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/**
 * Create download link for file
 */
export const downloadFile = (url: string, filename: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Share file to WhatsApp (mobile)
 */
export const shareToWhatsApp = async (url: string, text: string = '') => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Transfer Receipt',
        text: text,
        url: url
      })
    } catch (error) {
      console.log('Native sharing failed, falling back to WhatsApp URL')
      // Fallback to WhatsApp URL
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
      window.open(whatsappUrl, '_blank')
    }
  } else {
    // Fallback for browsers without Web Share API
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
    window.open(whatsappUrl, '_blank')
  }
} 