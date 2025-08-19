/**
 * 이미지 경로를 적절한 URL로 변환하는 유틸리티 함수
 */

export const getImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null
  
  // 외부 URL인 경우 (http로 시작)
  if (imagePath.startsWith('http')) {
    return imagePath
  }
  
  // 로컬 이미지인 경우 - Vercel 배포 주소 사용
  // 위젯이 임베딩된 외부 사이트에서도 이미지에 접근할 수 있도록
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://its-me-vert.vercel.app'
    : 'http://localhost:3000'
  
  // 이미 /images/로 시작하면 그대로, 아니면 추가
  if (imagePath.startsWith('/images/')) {
    return `${baseUrl}${imagePath}`
  }
  
  return `${baseUrl}/images/${imagePath}`
}

/**
 * 이미지가 유효한지 확인하는 함수
 */
export const isValidImage = (imagePath: string | null): boolean => {
  if (!imagePath) return false
  
  // 이미지 파일 확장자 확인
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const hasValidExtension = validExtensions.some(ext => 
    imagePath.toLowerCase().endsWith(ext)
  )
  
  return hasValidExtension
}
