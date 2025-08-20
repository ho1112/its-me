// 위젯 엔트리 포인트
import React from 'react'
import { createRoot } from 'react-dom/client'
import ChatbotWidget from '@/components/chatbot/ChatbotWidget'

// ★★★ Tailwind CSS를 포함한 전역 스타일을 불러옵니다 ★★★
import '@/app/globals.css'

// 위젯 자동 초기화 함수
function initWidget() {
  const script = document.currentScript as HTMLScriptElement
  
  // 1. data-api-url 속성에서 API 주소를 읽어옵니다.
  //    없을 경우, Vercel의 실제 주소를 기본값으로 사용합니다.
  //    외부 사이트에서는 data-api-url 없이 사용하면 자동으로 Vercel API 사용
  const apiUrl = script.getAttribute('data-api-url') || 'https://its-me-vert.vercel.app/api/chat'
  
  // 2. URL 파라미터에서 설정값 읽기
  const params = new URLSearchParams(script?.src.split('?')[1] || '')
  const lang = params.get('lang') || 'ko'
  const theme = params.get('theme') || 'light'
  
  // 컨테이너 찾기 (다양한 방법으로 시도)
  let container = document.getElementById('its-me-chatbot-container')
  
  if (!container) {
    // 컨테이너가 없으면 스크립트 태그 바로 다음에 생성
    container = document.createElement('div')
    container.id = 'its-me-chatbot-container'
    container.style.width = '100%'
    container.style.height = '600px'
    
    if (script && script.parentNode) {
      script.parentNode.insertBefore(container, script.nextSibling)
    } else {
      document.body.appendChild(container)
    }
  }
  
  // 3. React 컴포넌트를 렌더링할 때, apiUrl을 prop으로 전달합니다.
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <ChatbotWidget apiUrl={apiUrl} initialLang={lang} initialTheme={theme} />
    </React.StrictMode>
  )
  
  console.log('🎉 Its-Me 챗봇 위젯이 초기화되었습니다!', { apiUrl, lang, theme })
}

// DOM이 준비되면 자동 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget)
} else {
  // 이미 로드된 경우 즉시 실행
  initWidget()
}

// 전역으로 노출 (필요한 경우)
;(window as any).ItsMeChatbot = {
  init: initWidget,
  ChatbotWidget
}
