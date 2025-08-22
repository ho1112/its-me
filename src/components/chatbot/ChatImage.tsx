import React from 'react'
import { getImageUrl, isValidImage } from '@/utils/imageUtils'

interface ChatImageProps {
  message: string
  isUser: boolean
  imagePaths?: string[] | null
  timestamp?: string
}

export const ChatImage: React.FC<ChatImageProps> = ({
  message,
  isUser,
  imagePaths,
  timestamp
}) => {
  const imageUrls = imagePaths?.map(path => getImageUrl(path)).filter((url): url is string => url !== null) || []
  const showImages = imageUrls.length > 0

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
          ? 'bg-chomin text-white' 
          : 'bg-gray-200 text-gray-800'
      }`}>
        <div className="text-sm">{message}</div>
        
        {/* 여러 이미지 표시 */}
        {showImages && (
          <div className="mt-3 space-y-2">
            {imageUrls.map((imageUrl, index) => (
              <img
                key={index}
                src={imageUrl}
                alt={`답변 관련 이미지 ${index + 1}`}
                className="max-w-full h-auto rounded-lg shadow-sm"
                onError={(e) => {
                  console.error('이미지 로드 실패:', imageUrl)
                  e.currentTarget.style.display = 'none'
                }}
              />
            ))}
          </div>
        )}
        
        {/* 타임스탬프 */}
        {timestamp && (
          <div className={`text-xs mt-2 ${
            isUser ? 'text-white' : 'text-gray-500'
          }`}>
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}
