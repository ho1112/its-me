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
    error: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  },
  ja: {
    welcome: 'こんにちは！履歴書チャットボットです。ご質問がございましたら、いつでもお聞かせください！🚀',
    title: '💬 イッツミ AIポートフォリオ',
    subtitle: 'ご質問がございましたら、いつでもお聞かせください！',
    placeholder: '質問を入力してください... (例: 経歴、技術、プロジェクトなど)',
    send: '送信',
    sending: '送信中...',
    error: '申し訳ございません。一時的なエラーが発生しました。しばらくしてから再度お試しください。'
  }
}

interface ChatbotWidgetProps {
  apiUrl: string;
}

export default function ChatbotWidget({ apiUrl }: ChatbotWidgetProps) {
  // 언어 감지 함수
  const getLanguage = () => {
    // 1. 쿼리 파라미터 (블로그 삽입용)
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
    return 'ja';
  };

  const [currentLang, setCurrentLang] = useState<'ko' | 'ja'>('ja');
  const [isMinimized, setIsMinimized] = useState(true);
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 언어 초기화
  useEffect(() => {
    const detectedLang = getLanguage();
    setCurrentLang(detectedLang);
    
    // 환영 메시지도 여기서 생성 (언어 설정 후)
    const welcomeMessage: Message = {
      id: 'welcome',
      content: languageTexts[detectedLang].welcome,
      role: 'assistant',
      timestamp: new Date()
    }
    setChatMessages([welcomeMessage])
  }, []);

  // 테마는 URL 파라미터로만 제어됩니다
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const theme = urlParams.get('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // 언어 변경 시 환영 메시지 업데이트 (URL 파라미터 변경 감지)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLang = urlParams.get('lang');
      if (queryLang === 'ja' || queryLang === 'ko') {
        setCurrentLang(queryLang);
        
        // 환영 메시지도 업데이트
        if (chatMessages.length > 0 && chatMessages[0]?.id === 'welcome') {
          const updatedWelcomeMessage: Message = {
            id: 'welcome',
            content: languageTexts[queryLang].welcome,
            role: 'assistant',
            timestamp: new Date()
          }
          setChatMessages(prev => [updatedWelcomeMessage, ...prev.slice(1)])
        }
      }
    }
  }, [chatMessages.length])

  // 최소화/확장 토글 함수
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

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
      // props로 받은 apiUrl을 사용합니다.
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
    <div className="w-full h-auto flex items-center justify-center p-2">
      <Card className={`w-full max-w-xl shadow-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 flex flex-col transition-all duration-300 ${
        isMinimized ? 'h-auto min-h-[80px]' : 'h-auto min-h-[600px]'
      }`}>
        <CardHeader 
          className="group bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-gray-700 dark:to-gray-600 text-white p-4 rounded-t-lg flex-shrink-0 cursor-pointer hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          onClick={toggleMinimize}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <CardTitle className="text-xl font-bold">
                {languageTexts[currentLang].title}
              </CardTitle>
              <p className="text-blue-100 dark:text-gray-300 text-center mt-1 text-sm">
                {languageTexts[currentLang].subtitle}
              </p>
            </div>
            <div className="text-blue-100 hover:text-white transition-colors">
              <img
                src="https://its-me-vert.vercel.app/images/ui/click.svg"
                alt={isMinimized ? 'Expand' : 'Minimize'}
                className={`w-10 h-10 group-hover:brightness-0 group-hover:invert group-hover:animate-bounce ${
                  isMinimized ? 'animate-slow-ping' : ''
                }`}
              />
            </div>
          </div>
        </CardHeader>
        
        {!isMinimized && (
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
        )}
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
