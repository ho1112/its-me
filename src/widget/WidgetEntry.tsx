// src/WidgetEntry.tsx

import React, { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'

// Tailwind CSS를 포함한 전역 스타일을 불러옵니다.
import '@/app/globals.css' 

// 1. 간단한 로딩 인디케이터 컴포넌트를 만듭니다.
const LoadingIndicator = () => {
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '600px',
    fontSize: '24px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  };
  const dotStyle: React.CSSProperties = {
    animation: 'blink 1.4s infinite both',
    margin: '0 2px',
  };
  const dot2Style: React.CSSProperties = { ...dotStyle, animationDelay: '0.2s' };
  const dot3Style: React.CSSProperties = { ...dotStyle, animationDelay: '0.4s' };

  // 로딩 애니메이션을 위한 스타일 태그를 동적으로 추가합니다.
  const keyframes = `
    @keyframes blink {
      0%, 80%, 100% { opacity: 0; }
      40% { opacity: 1; }
    }
  `;
  
  return (
    <div style={style}>
      <style>{keyframes}</style>
      <span style={dotStyle}>.</span>
      <span style={dot2Style}>.</span>
      <span style={dot3Style}>.</span>
    </div>
  );
};

// 2. 메인 챗봇 위젯을 '지연 로딩(lazy loading)'하도록 설정합니다.
const ChatbotWidget = lazy(() => import('@/components/chatbot/ChatbotWidget'));

// 3. 위젯 초기화 함수
function initWidget() {
  const container = document.getElementById('its-me-chatbot-container');
  if (!container) {
    console.error("챗봇을 삽입할 '#its-me-chatbot-container' div를 찾을 수 없습니다.");
    return;
  }

  // 외부에서 전달된 설정값들을 읽어옵니다.
  const script = document.currentScript as HTMLScriptElement;
  const apiUrl = script.getAttribute('data-api-url') || 'https://its-me-vert.vercel.app/api/chat';
  const lang = new URLSearchParams(script?.src.split('?')[1] || '').get('lang') || 'ko';
  const theme = new URLSearchParams(script?.src.split('?')[1] || '').get('theme') || 'light';
  
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      {/* 4. Suspense를 사용해 로딩 상태를 React가 직접 관리하도록 합니다. */}
      <Suspense fallback={<LoadingIndicator />}>
        <ChatbotWidget apiUrl={apiUrl} initialLang={lang} initialTheme={theme} />
      </Suspense>
    </React.StrictMode>
  );
  
  console.log('🎉 Its-Me 챗봇 위젯이 초기화되었습니다!');
}

// DOM이 준비되면 위젯 초기화를 시작합니다.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
