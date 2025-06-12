import { Download, Eye } from 'lucide-react'
import { createDownloadUrlFromBase64 } from '@/utils/simple-file-upload'

interface ImageDisplayProps {
  base64Data: string
  alt: string
  filename?: string
  className?: string
}

export default function ImageDisplay({ 
  base64Data, 
  alt, 
  filename = 'image.jpg',
  className = ''
}: ImageDisplayProps) {
  const handleDownload = () => {
    createDownloadUrlFromBase64(base64Data, filename)
  }

  const handleView = () => {
    const newWindow = window.open()
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>${alt}</title></head>
          <body style="margin:0;padding:20px;background:#f5f5f5;">
            <img src="${base64Data}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.1);" />
          </body>
        </html>
      `)
      newWindow.document.close()
    }
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Image Preview */}
      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <img
          src={base64Data}
          alt={alt}
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
        />
        
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
            <button
              onClick={handleView}
              className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              title="View full size"
            >
              <Eye className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              title="Download image"
            >
              <Download className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Image Info */}
      <div className="mt-2 text-xs text-gray-500">
        <div className="font-medium">{alt}</div>
        <div>
          Size: {((base64Data.length * 3) / 4 / 1024).toFixed(1)} KB
        </div>
      </div>
    </div>
  )
} 