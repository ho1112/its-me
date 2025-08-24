import React from 'react'
import { createRoot } from 'react-dom/client'
import ChatbotWidget from '@/components/chatbot/ChatbotWidget'

// Vite의 ?inline 기능을 사용해, 빌드된 CSS의 내용을 문자열로 가져옵니다
// @ts-ignore - Vite의 ?inline 기능을 위한 타입 무시
import cssString from '@/app/globals.css?inline';

function initWidget() {
  const container = document.getElementById('its-me-chatbot-container');
  if (!container) return;

  // Shadow DOM 루트 생성
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Shadow DOM 안에 React 앱을 렌더링할 div 생성
  const appRoot = document.createElement('div');
  shadowRoot.appendChild(appRoot);

  // CSS를 Shadow DOM 내부에 직접 주입
  const styleElement = document.createElement('style');
  styleElement.textContent = cssString;
  shadowRoot.appendChild(styleElement);

  // URL 파라미터에서 설정 읽기
  const urlParams = new URLSearchParams(window.location.search);
  const lang = (urlParams.get('lang') || 'ja') as 'ja' | 'ko';
  const theme = (urlParams.get('theme') || 'light') as 'light' | 'dark';
  
  // data-api-url 속성에서 API URL 읽기
  const scriptElement = document.currentScript as HTMLScriptElement;
  const apiUrl = scriptElement?.getAttribute('data-api-url') || 'https://its-me-vert.vercel.app/api/chat';

  // Shadow DOM 내부에 테마 클래스 적용
  if (theme === 'dark') {
    appRoot.classList.add('dark');
  } else {
    appRoot.classList.remove('dark');
  }

  // React 앱을 Shadow DOM 안에 렌더링
  const root = createRoot(appRoot);
  root.render(
    <React.StrictMode>
      <ChatbotWidget apiUrl={apiUrl} initialLang={lang} initialTheme={theme} />
    </React.StrictMode>
  );
}

// DOM 로드 완료 후 위젯 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
