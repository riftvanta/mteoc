/**
 * Simple file upload utility using base64 encoding
 * Stores files directly in database - no external storage needed
 */

export interface SimpleUploadResult {
  success: boolean
  base64Data?: string
  error?: string
}

/**
 * Convert file to base64 string for database storage
 */
export const convertFileToBase64 = (file: File): Promise<SimpleUploadResult> => {
  return new Promise((resolve) => {
    // Validate file size (max 2MB for base64 storage)
    if (file.size > 2 * 1024 * 1024) {
      resolve({
        success: false,
        error: 'File size must be less than 2MB'
      })
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      resolve({
        success: false,
        error: 'Only JPEG, PNG, and WebP images are allowed'
      })
      return
    }

    const reader = new FileReader()
    
    reader.onload = () => {
      const base64Data = reader.result as string
      resolve({
        success: true,
        base64Data
      })
    }
    
    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file'
      })
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Create a downloadable URL from base64 data
 */
export const createDownloadUrlFromBase64 = (base64Data: string, filename: string) => {
  const link = document.createElement('a')
  link.href = base64Data
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Display base64 image in an img element
 */
export const displayBase64Image = (base64Data: string, imgElement: HTMLImageElement) => {
  imgElement.src = base64Data
}

/**
 * Upload payment proof (base64 version)
 */
export const uploadPaymentProofSimple = async (file: File): Promise<SimpleUploadResult> => {
  return convertFileToBase64(file)
}

/**
 * Upload completion proof (base64 version)
 */
export const uploadCompletionProofSimple = async (file: File): Promise<SimpleUploadResult> => {
  return convertFileToBase64(file)
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