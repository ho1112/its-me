(function() {
  'use strict';
  
  // 위젯 설정
  const WIDGET_CONFIG = {
    // 기본값
    defaultLang: 'ko',
    defaultTheme: 'light',
    // API 엔드포인트
    apiUrl: 'https://its-me-vert.vercel.app/api/chat',
    // 위젯 스타일
    widgetId: 'itsme-chatbot-widget',
    // CSS 격리를 위한 클래스
    widgetClass: 'itsme-widget'
  };
  
  // URL 파라미터 파싱
  function getUrlParams() {
    const script = document.currentScript || document.querySelector('script[src*="widget.js"]');
    if (!script) return {};
    
    const src = script.src;
    const url = new URL(src);
    return {
      lang: url.searchParams.get('lang') || WIDGET_CONFIG.defaultLang,
      theme: url.searchParams.get('theme') || WIDGET_CONFIG.defaultTheme
    };
  }
  
  // CSS 스타일 주입 (격리된 스타일)
  function injectStyles() {
    if (document.getElementById('itsme-widget-styles')) return;
    
    const styles = `
      .${WIDGET_CONFIG.widgetClass} {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        width: 350px;
        max-height: 500px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        border: 1px solid #e5e7eb;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      
      .${WIDGET_CONFIG.widgetClass}.dark {
        background: #1f2937;
        border-color: #374151;
        color: #f9fafb;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-header {
        padding: 16px;
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .${WIDGET_CONFIG.widgetClass}.dark .widget-header {
        background: #111827;
        border-bottom-color: #374151;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-toggle {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-toggle:hover {
        background: #e5e7eb;
      }
      
      .${WIDGET_CONFIG.widgetClass}.dark .widget-toggle:hover {
        background: #374151;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-body {
        padding: 16px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-input {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 12px;
        box-sizing: border-box;
      }
      
      .${WIDGET_CONFIG.widgetClass}.dark .widget-input {
        background: #374151;
        border-color: #4b5563;
        color: #f9fafb;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-button {
        width: 100%;
        padding: 12px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-button:hover {
        background: #2563eb;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }
      
      .${WIDGET_CONFIG.widgetClass} .message {
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .${WIDGET_CONFIG.widgetClass} .message.user {
        background: #dbeafe;
        color: #1e40af;
        margin-left: 20px;
      }
      
      .${WIDGET_CONFIG.widgetClass}.dark .message.user {
        background: #1e3a8a;
        color: #93c5fd;
      }
      
      .${WIDGET_CONFIG.widgetClass} .message.assistant {
        background: #f3f4f6;
        color: #374151;
        margin-right: 20px;
      }
      
      .${WIDGET_CONFIG.widgetClass}.dark .message.assistant {
        background: #374151;
        color: #f9fafb;
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-minimized {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        background: #3b82f6;
        color: white;
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
      }
      
      .${WIDGET_CONFIG.widgetClass} .widget-minimized:hover {
        transform: scale(1.05);
      }
      
      .${WIDGET_CONFIG.widgetClass} .hidden {
        display: none;
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'itsme-widget-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
  
  // 다국어 텍스트
  const TEXTS = {
    ko: {
      title: '💬 잇츠 미 AI 포트폴리오',
      placeholder: '질문을 입력하세요...',
      send: '전송',
      sending: '전송 중...',
      welcome: '안녕하세요! 궁금한 점이 있으시면 언제든 물어보세요! 🚀'
    },
    ja: {
      title: '💬 イッツミ AIポートフォリオ',
      placeholder: '質問を入力してください...',
      send: '送信',
      sending: '送信中...',
      welcome: 'こんにちは！ご質問がございましたら、いつでもお聞かせください！🚀'
    }
  };
  
  // 위젯 HTML 생성
  function createWidgetHTML(lang) {
    const texts = TEXTS[lang] || TEXTS.ko;
    
    return `
      <div class="widget-header">
        <h3 class="widget-title">${texts.title}</h3>
        <button class="widget-toggle" onclick="toggleWidget()">−</button>
      </div>
      <div class="widget-body">
        <div class="message assistant">${texts.welcome}</div>
        <div id="messages"></div>
        <input type="text" class="widget-input" placeholder="${texts.placeholder}" id="messageInput">
        <button class="widget-button" onclick="sendMessage()" id="sendButton">${texts.send}</button>
      </div>
    `;
  }
  
  // 위젯 생성 및 삽입
  function createWidget() {
    // 이미 존재하면 생성하지 않음
    if (document.getElementById(WIDGET_CONFIG.widgetId)) return;
    
    const params = getUrlParams();
    const lang = params.lang;
    const theme = params.theme;
    
    // 스타일 주입
    injectStyles();
    
    // 위젯 컨테이너 생성
    const widget = document.createElement('div');
    widget.id = WIDGET_CONFIG.widgetId;
    widget.className = `${WIDGET_CONFIG.widgetClass} ${theme}`;
    widget.innerHTML = createWidgetHTML(lang);
    
    // 페이지에 삽입
    document.body.appendChild(widget);
    
    // 전역 함수 등록
    window.toggleWidget = toggleWidget;
    window.sendMessage = sendMessage;
    
    // 이벤트 리스너 등록
    const input = document.getElementById('messageInput');
    if (input) {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }
    
    console.log(`🚀 잇츠미 위젯 로드 완료: lang=${lang}, theme=${theme}`);
  }
  
  // 위젯 토글 (최소화/최대화)
  function toggleWidget() {
    const widget = document.getElementById(WIDGET_CONFIG.widgetId);
    const body = widget.querySelector('.widget-body');
    const header = widget.querySelector('.widget-header');
    const toggleBtn = widget.querySelector('.widget-toggle');
    
    if (body.classList.contains('hidden')) {
      // 최대화
      body.classList.remove('hidden');
      header.classList.remove('hidden');
      toggleBtn.textContent = '−';
      widget.style.width = '350px';
      widget.style.height = 'auto';
    } else {
      // 최소화
      body.classList.add('hidden');
      header.classList.add('hidden');
      toggleBtn.textContent = '+';
      widget.style.width = '60px';
      widget.style.height = '60px';
    }
  }
  
  // 메시지 전송
  async function sendMessage() {
    const input = document.getElementById('messageInput');
    const button = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messages');
    
    if (!input || !input.value.trim()) return;
    
    const message = input.value.trim();
    const params = getUrlParams();
    
    // 사용자 메시지 표시
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.textContent = message;
    messagesContainer.appendChild(userMessage);
    
    // 입력 필드 비우기
    input.value = '';
    
    // 버튼 비활성화
    button.disabled = true;
    button.textContent = TEXTS[params.lang]?.sending || TEXTS.ko.sending;
    
    try {
      // API 호출
      const response = await fetch(WIDGET_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          language: params.lang
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // AI 응답 표시
      const aiMessage = document.createElement('div');
      aiMessage.className = 'message assistant';
      aiMessage.textContent = data.response;
      messagesContainer.appendChild(aiMessage);
      
      // 스크롤을 아래로
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
    } catch (error) {
      console.error('위젯 API 오류:', error);
      
      // 에러 메시지 표시
      const errorMessage = document.createElement('div');
      errorMessage.className = 'message assistant';
      errorMessage.textContent = '죄송합니다. 일시적인 오류가 발생했습니다.';
      messagesContainer.appendChild(errorMessage);
    } finally {
      // 버튼 복원
      button.disabled = false;
      button.textContent = TEXTS[params.lang]?.send || TEXTS.ko.send;
    }
  }
  
  // DOM 로드 완료 후 위젯 생성
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
  
})();
