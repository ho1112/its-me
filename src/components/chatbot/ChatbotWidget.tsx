'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatImage } from './ChatImage'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  imagePaths?: string[] | null
}

// 다국어 텍스트 정의
const languageTexts = {
  ko: {
    welcome: '안녕하세요! 저는 이력서 챗봇입니다. 궁금한 점이 있으시면 언제든 물어보세요! 🚀',
    title: '💬 잇츠 미 AI 포트폴리오',
    subtitle: '궁금한 점이 있으시면 언제든 물어보세요!',
    placeholder: '질문을 입력하세요... (예: 경력, 기술, 프로젝트 등)',
    send: '전송',
    sending: '전송 중...',
    error: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    languageToggle: '🇯🇵 日本語',
    themeToggle: '🌙'
  },
  ja: {
    welcome: 'こんにちは！履歴書チャットボットです。ご質問がございましたら、いつでもお聞かせください！🚀',
    title: '💬 イッツミ AIポートフォリオ',
    subtitle: 'ご質問がございましたら、いつでもお聞かせください！',
    placeholder: '質問を入力してください... (例: 経歴、技術、プロジェクトなど)',
    send: '送信',
    sending: '送信中...',
    error: '申し訳ございません。一時的なエラーが発生しました。しばらくしてから再度お試しください。',
    languageToggle: '🇰🇷 한국어',
    themeToggle: '🌙'
  }
}

export default function ChatbotWidget() {
  // 언어 감지 함수
  const getLanguage = () => {
    // 1. 쿼리 파라미터 우선 (블로그 삽입용)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLang = urlParams.get('lang');
      if (queryLang === 'ja' || queryLang === 'ko') {
        return queryLang;
      }
      
      // 2. URL 경로 감지 (독립 운용용)
      const path = window.location.pathname;
      if (path.includes('/ja')) return 'ja';
      if (path.includes('/ko')) return 'ko';
    }
    
    // 3. 기본값
    return 'ko';
  };

  // 테마 감지 함수
  const getTheme = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const theme = urlParams.get('theme');
      return theme === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  };

  const [currentLang, setCurrentLang] = useState<'ko' | 'ja'>('ko');
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 언어와 테마 초기화
  useEffect(() => {
    const detectedLang = getLanguage();
    const detectedTheme = getTheme();
    setCurrentLang(detectedLang);
    setCurrentTheme(detectedTheme);
    
    // 테마 적용
    document.documentElement.classList.toggle('dark', detectedTheme === 'dark');
  }, []);

  // 언어 변경 함수
  const toggleLanguage = () => {
    const newLang = currentLang === 'ko' ? 'ja' : 'ko';
    setCurrentLang(newLang);
    
    // URL 업데이트 (쿼리 파라미터)
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLang);
    window.history.pushState({}, '', url.toString());
  };

  // 테마 변경 함수
  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    
    // 테마 적용
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    
    // URL 업데이트 (쿼리 파라미터)
    const url = new URL(window.location.href);
    url.searchParams.set('theme', newTheme);
    window.history.pushState({}, '', url.toString());
  };

  // 환영 메시지 표시
  useEffect(() => {
    if (chatMessages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        content: languageTexts[currentLang].welcome,
        role: 'assistant',
        timestamp: new Date()
      }
      setChatMessages([welcomeMessage])
    }
  }, [chatMessages.length, currentLang])

  // 스크롤을 맨 아래로 이동
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // API 주소를 전체 경로로 변경합니다.
      // 로컬 테스트 시에는 'http://localhost:3000/api/chat'
      // Vercel 배포 후에는 'https://its-me-vert.vercel.app/api/chat'
      const apiUrl = process.env.NODE_ENV === 'production'
        ? 'https://its-me-vert.vercel.app/api/chat' // Vercel 배포 주소
        : 'http://localhost:3000/api/chat';       // Next.js 개발 서버 주소

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue, language: currentLang }),
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: 'assistant',
          timestamp: new Date(),
          imagePaths: data.imagePaths || null
        }
        setChatMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('API 호출 실패')
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: languageTexts[currentLang].error,
        role: 'assistant',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh] shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-gray-700 dark:to-gray-600 text-white p-6 rounded-t-lg flex-shrink-0 relative">
          {/* 언어 변경 버튼 */}
          <Button
            onClick={toggleLanguage}
            className="absolute top-4 right-16 bg-white/20 hover:bg-white/30 text-white border-white/30"
            size="sm"
          >
            {languageTexts[currentLang].languageToggle}
          </Button>
          
          {/* 테마 변경 버튼 */}
          <Button
            onClick={toggleTheme}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white border-white/30"
            size="sm"
          >
            {currentTheme === 'light' ? '🌙' : '☀️'}
          </Button>
          
          <CardTitle className="text-2xl font-bold text-center">
            {languageTexts[currentLang].title}
          </CardTitle>
          <p className="text-blue-100 dark:text-gray-300 text-center mt-2">
            {languageTexts[currentLang].subtitle}
          </p>
        </CardHeader>
        
        <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {chatMessages.map((message) => (
              <ChatImage
                key={message.id}
                message={message.content}
                isUser={message.role === 'user'}
                imagePaths={message.imagePaths}
                timestamp={message.timestamp.toISOString()}
              />
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 폼 */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-b-lg flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={languageTexts[currentLang].placeholder}
                disabled={isLoading}
                className="flex-1 border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-3 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <Button 
                type="submit" 
                disabled={isLoading || !inputValue.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading ? languageTexts[currentLang].sending : languageTexts[currentLang].send}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 위젯이 로드될 때 React와 ReactDOM을 전역으로 노출
if (typeof window !== 'undefined') {
  // React와 ReactDOM을 전역으로 노출
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
  
  // 위젯 컴포넌트를 전역으로 노출 (default 속성으로)
  (window as any).ItsMeChatbot = {
    default: ChatbotWidget,
    ChatbotWidget,
    React,
    ReactDOM
  };
}
