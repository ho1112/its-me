// src/WidgetEntry.tsx

import React from 'react'
import { createRoot } from 'react-dom/client'
import ChatbotWidget from '@/components/chatbot/ChatbotWidget'

// ★★★ Tailwind CSS를 포함한 전역 스타일은 여전히 필요합니다 ★★★
import '@/app/globals.css'

// 위젯 자동 초기화 함수
function initWidget() {
  const container = document.getElementById('its-me-chatbot-container');
  if (!container) {
    console.error("챗봇을 삽입할 '#its-me-chatbot-container' div를 찾을 수 없습니다.");
    return;
  }

  // 1. 순수 JS/HTML/CSS로 로딩 UI를 즉시 삽입합니다.
  //    React가 시작되기 전이므로, 이 코드는 무조건 화면에 보입니다.
  container.innerHTML = `
    <style>
      .itsme-loader-container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 600px;
        font-family: sans-serif;
      }
      .itsme-loader-dots span {
        animation: itsme-blink 1.4s infinite both;
        margin: 0 2px;
        font-size: 24px;
        color: #9ca3af;
      }
      .itsme-loader-dots span:nth-child(2) { animation-delay: 0.2s; }
      .itsme-loader-dots span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes itsme-blink {
        0%, 80%, 100% { opacity: 0; }
        40% { opacity: 1; }
      }
    </style>
    <div class="itsme-loader-container">
      <div class="itsme-loader-dots">
        <span>.</span><span>.</span><span>.</span>
      </div>
    </div>
  `;
  
  // 2. 외부 설정값을 읽어옵니다.
  const script = document.currentScript as HTMLScriptElement;
  const apiUrl = script.getAttribute('data-api-url') || 'https://its-me-vert.vercel.app/api/chat';
  const lang = new URLSearchParams(script?.src.split('?')[1] || '').get('lang') || 'ko';
  const theme = new URLSearchParams(script?.src.split('?')[1] || '').get('theme') || 'light';

  // 3. 이제 React를 불러와서, 로딩 UI를 덮어쓰며 렌더링합니다.
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ChatbotWidget apiUrl={apiUrl} initialLang={lang} initialTheme={theme} />
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
