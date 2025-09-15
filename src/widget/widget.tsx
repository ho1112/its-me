import React from 'react'
import { createRoot } from 'react-dom/client'
import Chatbot from '@/components/chatbot/Chatbot'

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
  appRoot.style.cssText = `
    height: 100%;
    overflow: hidden;
    overscroll-behavior: contain;
  `;
  shadowRoot.appendChild(appRoot);

  // CSS를 Shadow DOM 내부에 직접 주입
  const styleElement = document.createElement('style');
  styleElement.textContent = cssString;
  shadowRoot.appendChild(styleElement);

  // ▼▼▼ 핵심 수정: 스크립트 태그의 src에서 URL 파라미터 읽기 ▼▼▼
  // 1. 현재 실행되고 있는 스크립트 태그를 찾습니다
  const scriptElement = document.currentScript as HTMLScriptElement;
  
  // 2. 스크립트 태그의 'src' 주소에서 URL 파라미터를 읽어옵니다
  const scriptUrlParams = new URLSearchParams(scriptElement?.src.split('?')[1] || '');
  const lang = (scriptUrlParams.get('lang') || 'ja') as 'ja' | 'ko';
  const theme = (scriptUrlParams.get('theme') || 'light') as 'light' | 'dark';
  
  // data-api-url 속성에서 API URL 읽기
  const apiUrl = scriptElement?.getAttribute('data-api-url') || 'https://its-me-vert.vercel.app/api/chat';
  // ▲▲▲

  // React 앱을 Shadow DOM 안에 렌더링
  const root = createRoot(appRoot);
  root.render(
    <React.StrictMode>
      <Chatbot apiUrl={apiUrl} initialLang={lang} initialTheme={theme} />
    </React.StrictMode>
  );
}

// DOM 로드 완료 후 위젯 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}
