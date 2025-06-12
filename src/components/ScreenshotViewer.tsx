'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Eye, Download, Share2, X, ZoomIn, ZoomOut, RotateCw, Move, FileText } from 'lucide-react'
import { createDownloadUrlFromBase64 } from '@/utils/simple-file-upload'

interface ScreenshotViewerProps {
  base64Data: string
  title: string
  filename: string
  type: 'payment-proof' | 'completion-proof'
  showDownload?: boolean
  showShare?: boolean
  className?: string
}

export default function ScreenshotViewer({
  base64Data,
  title,
  filename,
  type,
  showDownload = true,
  showShare = true,
  className = ''
}: ScreenshotViewerProps) {
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [touchDistance, setTouchDistance] = useState(0)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [imageError, setImageError] = useState(false)
  
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if data is base64 or file path
  const isBase64Data = base64Data.startsWith('data:')
  const isValidImagePath = base64Data.startsWith('/') || base64Data.startsWith('http')
  const hasValidData = isBase64Data || isValidImagePath

  // Get image source for display
  const getImageSrc = () => {
    if (isBase64Data) {
      return base64Data
    } else if (isValidImagePath) {
      // For file paths, we'll show a placeholder or handle differently
      return base64Data
    }
    return ''
  }

  const handleDownload = () => {
    if (isBase64Data) {
      createDownloadUrlFromBase64(base64Data, filename)
    } else if (isValidImagePath) {
      // For file paths, create a download link
      const link = document.createElement('a')
      link.href = base64Data
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleShare = async () => {
    const text = `${title} - ${filename}`
    
    if (navigator.share && isBase64Data) {
      try {
        // Convert base64 to blob for sharing
        const response = await fetch(base64Data)
        const blob = await response.blob()
        const file = new File([blob], filename, { type: blob.type })
        
        await navigator.share({
          title: title,
          text: text,
          files: [file]
        })
      } catch (error) {
        console.log('Native sharing failed, falling back to WhatsApp')
        fallbackToWhatsApp(text)
      }
    } else {
      fallbackToWhatsApp(text)
    }
  }

  const fallbackToWhatsApp = (text: string) => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  // Reset transform states
  const resetTransform = useCallback(() => {
    setZoom(100)
    setRotation(0)
    setPanX(0)
    setPanY(0)
  }, [])

  // Hide/show controls on mobile
  const hideControlsTemporarily = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setIsControlsVisible(false)
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(true)
    }, 3000)
  }, [])

  // Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const touch1 = touches[0]
    const touch2 = touches[1]
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
  }

  // Mobile touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - start dragging
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY })
      hideControlsTemporarily()
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      setTouchDistance(getTouchDistance(e.touches))
      setIsDragging(false)
    }
  }, [panX, panY, hideControlsTemporarily])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault() // Prevent scrolling
    
    if (e.touches.length === 1 && isDragging && zoom > 100) {
      // Single touch drag (only when zoomed in)
      const touch = e.touches[0]
      setPanX(touch.clientX - dragStart.x)
      setPanY(touch.clientY - dragStart.y)
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const newDistance = getTouchDistance(e.touches)
      if (touchDistance > 0) {
        const scale = newDistance / touchDistance
        const newZoom = Math.max(50, Math.min(300, zoom * scale))
        setZoom(newZoom)
        setTouchDistance(newDistance)
      }
    }
  }, [isDragging, zoom, dragStart, touchDistance])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setTouchDistance(0)
  }, [])

  // Mouse handlers for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY })
    }
  }, [zoom, panX, panY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 100) {
      setPanX(e.clientX - dragStart.x)
      setPanY(e.clientY - dragStart.y)
    }
  }, [isDragging, zoom, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Double tap to zoom (mobile)
  const [lastTap, setLastTap] = useState(0)
  const handleDoubleClick = useCallback(() => {
    if (zoom === 100) {
      setZoom(200)
    } else {
      resetTransform()
    }
  }, [zoom, resetTransform])

  const handleTouchTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTap < 300) {
      handleDoubleClick()
    }
    setLastTap(now)
  }, [lastTap, handleDoubleClick])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showFullscreen) return
      
      switch (e.key) {
        case 'Escape':
          setShowFullscreen(false)
          resetTransform()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case 'r':
        case 'R':
          handleRotate()
          break
        case '0':
          resetTransform()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFullscreen, resetTransform, handleZoomIn, handleZoomOut, handleRotate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  // Get file size for display
  const getFileSize = () => {
    if (isBase64Data) {
      return ((base64Data.length * 3) / 4 / 1024).toFixed(1) + ' KB'
    }
    return 'File attachment'
  }

  // Handle image load error
  const handleImageError = () => {
    setImageError(true)
  }

  // If no valid data, show fallback
  if (!hasValidData || !base64Data) {
    return (
      <div className={`bg-gray-50 rounded-lg border border-gray-200 overflow-hidden ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{title}</h3>
              <p className="text-sm text-gray-500">No image data available</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
            <div className="text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No image to display</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // For file paths that aren't base64, show a simple file attachment view
  if (!isBase64Data && isValidImagePath) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{title}</h3>
              <p className="text-sm text-gray-500">{getFileSize()}</p>
            </div>
            {/* Mobile-optimized action buttons */}
            <div className="flex items-center space-x-1 ml-2">
              {showDownload && (
                <button
                  onClick={handleDownload}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors touch-manipulation"
                  title="Download"
                  aria-label="Download attachment"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
              {showShare && (
                <button
                  onClick={handleShare}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors touch-manipulation"
                  title="Share"
                  aria-label="Share attachment"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* File attachment preview */}
          <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">File Attachment</p>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{base64Data}</p>
              {showDownload && (
                <button
                  onClick={handleDownload}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Download File
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Thumbnail View */}
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm ${className}`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{title}</h3>
              <p className="text-sm text-gray-500">
                {getFileSize()}
              </p>
            </div>
            {/* Mobile-optimized action buttons (44px touch targets) */}
            <div className="flex items-center space-x-1 ml-2">
              {!imageError && (
                <button
                  onClick={() => setShowFullscreen(true)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                  title="View fullscreen"
                  aria-label="View fullscreen"
                >
                  <Eye className="w-5 h-5" />
                </button>
              )}
              {showDownload && (
                <button
                  onClick={handleDownload}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors touch-manipulation"
                  title="Download"
                  aria-label="Download image"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
              {showShare && !imageError && (
                <button
                  onClick={handleShare}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors touch-manipulation"
                  title="Share"
                  aria-label="Share image"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile-optimized thumbnail image */}
          {!imageError ? (
            <div 
              className="relative group cursor-pointer touch-manipulation" 
              onClick={() => setShowFullscreen(true)}
              onTouchEnd={handleTouchTap}
            >
              <img
                src={getImageSrc()}
                alt={title}
                className="w-full h-32 sm:h-40 object-cover rounded-lg border border-gray-200 group-hover:opacity-90 transition-opacity"
                loading="lazy"
                onError={handleImageError}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center rounded-lg">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white rounded-full p-3 shadow-lg">
                    <ZoomIn className="w-5 h-5 text-gray-700" />
                  </div>
                </div>
              </div>
              {/* Touch indicator for mobile */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity sm:hidden">
                Tap to view
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 sm:h-40 bg-gray-100 rounded-lg border border-gray-200">
              <div className="text-center">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Unable to load image</p>
                <p className="text-xs text-gray-500 mt-1">Click download to save file</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-Optimized Fullscreen Modal */}
      {showFullscreen && !imageError && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div 
            ref={containerRef}
            className="relative w-full h-full flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Mobile-optimized header with larger touch targets */}
            <div className={`absolute top-0 left-0 right-0 z-10 transition-all duration-300 ${
              isControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
            }`}>
              <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="text-white flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium truncate">{title}</h3>
                  <p className="text-xs sm:text-sm text-gray-300 truncate">{filename}</p>
                </div>
                
                {/* Close button - always visible */}
                <button
                  onClick={() => {
                    setShowFullscreen(false)
                    resetTransform()
                  }}
                  className="min-w-[44px] min-h-[44px] ml-2 flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-manipulation"
                  title="Close"
                  aria-label="Close viewer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Mobile control panel - bottom */}
            <div className={`absolute bottom-0 left-0 right-0 z-10 transition-all duration-300 ${
              isControlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
            }`}>
              <div className="p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent">
                {/* Zoom and rotation controls */}
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center space-x-2 px-4 py-2 bg-black bg-opacity-50 rounded-lg">
                    <span className="text-white text-sm font-medium min-w-[60px] text-center">
                      {zoom}%
                    </span>
                  </div>
                  
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 300}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={handleRotate}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-manipulation"
                    title="Rotate"
                    aria-label="Rotate image"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>

                  <button
                    onClick={resetTransform}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-manipulation"
                    title="Reset"
                    aria-label="Reset view"
                  >
                    <Move className="w-5 h-5" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center space-x-3">
                  {showDownload && (
                    <button
                      onClick={handleDownload}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-manipulation"
                      title="Download"
                      aria-label="Download image"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  {showShare && (
                    <button
                      onClick={handleShare}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors touch-manipulation"
                      title="Share"
                      aria-label="Share image"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Image Container with touch support */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                ref={imageRef}
                src={getImageSrc()}
                alt={title}
                className="max-w-none max-h-none shadow-2xl touch-manipulation select-none"
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  cursor: zoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                }}
                onDoubleClick={handleDoubleClick}
                onTouchEnd={handleTouchTap}
                onError={handleImageError}
                draggable={false}
              />
            </div>

            {/* Mobile instructions - only show on first load */}
            <div className={`absolute bottom-20 left-1/2 transform -translate-x-1/2 transition-all duration-300 ${
              isControlsVisible ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="bg-black bg-opacity-70 text-white text-xs px-3 py-2 rounded-full">
                <p className="hidden sm:block">Pinch to zoom • Drag to pan • Double-tap to reset</p>
                <p className="sm:hidden">Pinch & drag • Double-tap to reset</p>
              </div>
            </div>

            {/* Touch interaction indicator */}
            {zoom > 100 && (
              <div className="absolute top-1/2 left-4 transform -translate-y-1/2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded opacity-50">
                {zoom > 100 ? 'Draggable' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Keyboard controls
export function useScreenshotViewerKeyboard() {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close any open fullscreen viewers
        const event = new CustomEvent('close-screenshot-viewer')
        window.dispatchEvent(event)
      }
    })
  }
} 