'use client'

import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client';
import { Button } from '@/components/ui/button'
import { NO_ANSWER_KEYWORD, RECOMMENDATION_TOPICS } from '@/utils/constants'
import suggestionDecks from '@/data/suggestions.json'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatImage } from './ChatImage'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  imagePaths?: string[] | null
  suggestions?: string[]
  topic?: string
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

interface ChatbotProps {
  apiUrl: string;
  initialLang?: 'ko' | 'ja';
  initialTheme?: 'light' | 'dark';
}

export default function Chatbot({ apiUrl, initialLang = 'ja', initialTheme = 'light' }: ChatbotProps) {
  // 언어는 props로만 제어됩니다 (URL 파라미터 직접 읽지 않음)

  const [currentLang, setCurrentLang] = useState<'ko' | 'ja'>(initialLang);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(initialTheme);
  const [isMinimized, setIsMinimized] = useState(true);
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [shownTopics, setShownTopics] = useState<Set<string>>(new Set())
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set())


  // 언어 초기화
  useEffect(() => {
    setCurrentLang(initialLang);
    
    // 환영 메시지도 여기서 생성 (언어 설정 후)
    const welcomeMessage: Message = {
      id: 'welcome',
      content: languageTexts[initialLang].welcome,
      role: 'assistant',
      timestamp: new Date(),
      suggestions: suggestionDecks.initial[initialLang] || suggestionDecks.initial.ko,
      topic: RECOMMENDATION_TOPICS.INITIAL
    }
    setChatMessages([welcomeMessage])
  }, [initialLang]);

  // 테마 초기화 및 변경 감지
  useEffect(() => {
    setCurrentTheme(initialTheme);
  }, [initialTheme]);

  // 추천질문 버튼 렌더링 함수
  const renderSuggestions = (suggestions: string[], topic: string, messageId: string) => {
    // 사용되지 않은 추천질문들만 필터링
    const availableSuggestions = suggestions.filter(suggestion => !usedSuggestions.has(suggestion));
    
    // 사용 가능한 추천질문이 없으면 렌더링하지 않음
    if (availableSuggestions.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-2">
        <p className={`text-sm ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-center`}>
          💡 {currentLang === 'ko' ? '추천 질문' : 'おすすめの質問'}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {availableSuggestions.slice(0, 3).map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className={`text-xs px-3 py-1 h-auto ${currentTheme === 'dark' ? 'bg-gray-700 hover:bg-chomin-dark hover:text-white text-chomin-light' : 'bg-white hover:bg-chomin hover:text-white text-chomin'} border-chomin hover:border-chomin-dark transition-all duration-200`}
              onClick={async () => {
                // 사용된 추천질문을 기록
                setUsedSuggestions(prev => new Set(Array.from(prev).concat(suggestion)));
                
                // 해당 메시지의 추천질문을 즉시 제거하기 위해 메시지 업데이트
                setChatMessages(prev => prev.map(msg => 
                  msg.id === messageId 
                    ? { ...msg, suggestions: undefined, topic: undefined }
                    : msg
                ));
                
                // 사용자 메시지를 채팅창에 먼저 추가
                const userMessage: Message = {
                  id: Date.now().toString(),
                  content: suggestion,
                  role: 'user',
                  timestamp: new Date()
                }
                setChatMessages(prev => [...prev, userMessage])
                
                // 추천질문을 자동으로 전송
                setInputValue(suggestion);
                setIsLoading(true);
                
                try {
                  const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-chat-history': 'true', // 첫 메시지가 아님을 표시
                      'x-used-suggestions': JSON.stringify(Array.from(usedSuggestions))
                    },
                    body: JSON.stringify({ message: suggestion, language: currentLang }),
                  })

                  if (response.ok) {
                    const data = await response.json()
                    // NO_ANSWER 키워드 제거
                    const cleanResponse = data.response.replace(NO_ANSWER_KEYWORD, '').trim();
                    const assistantMessage: Message = {
                      id: (Date.now() + 1).toString(),
                      content: cleanResponse,
                      role: 'assistant',
                      timestamp: new Date(),
                      imagePaths: data.imagePaths || null,
                      suggestions: data.suggestions || null,
                      topic: data.topic || null
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
                  setInputValue('') // 입력창 비우기
                }
              }}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // 언어 변경 시 환영 메시지 업데이트 (props 변경 감지)
  useEffect(() => {
    setCurrentLang(initialLang);
    
    // 환영 메시지도 업데이트
    if (chatMessages.length > 0 && chatMessages[0]?.id === 'welcome') {
      const updatedWelcomeMessage: Message = {
        id: 'welcome',
        content: languageTexts[initialLang].welcome,
        role: 'assistant',
        timestamp: new Date(),
        suggestions: suggestionDecks.initial[initialLang] || suggestionDecks.initial.ko,
        topic: 'initial'
      }
      setChatMessages(prev => [updatedWelcomeMessage, ...prev.slice(1)])
    }
  }, [initialLang, chatMessages.length])

  // 최소화/확장 토글 함수
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // 스크롤 위치 감지 및 자동 스크롤
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10 // 10px 여유
    setShouldAutoScroll(isAtBottom)
  }

  // 조건부 자동 스크롤
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, shouldAutoScroll])



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
          'x-chat-history': 'true', // 첫 메시지가 아님을 표시
          'x-used-suggestions': JSON.stringify(Array.from(usedSuggestions))
        },
        body: JSON.stringify({ message: inputValue, language: currentLang }),
      })

      if (response.ok) {
        const data = await response.json()
        // NO_ANSWER 키워드 제거하고 깔끔하게 표시
        const cleanResponse = data.response.replace('NO_ANSWER', '').trim();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: cleanResponse,
          role: 'assistant',
          timestamp: new Date(),
          imagePaths: data.imagePaths || null,
          suggestions: data.suggestions || null,
          topic: data.topic || null
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
    <div className="w-full h-auto flex items-center justify-center p-4">
      <Card className={`w-full max-w-4xl shadow-2xl border border-gray-200 ${currentTheme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'} flex flex-col transition-all duration-300 not-prose ${
        isMinimized ? 'h-auto min-h-[80px]' : 'h-[600px]'
      }`}>
        <CardHeader 
          className={`group ${currentTheme === 'dark' ? 'bg-chomin-dark hover:bg-chomin' : 'bg-chomin hover:bg-chomin-dark'} text-white p-4 rounded-t-lg flex-shrink-0 cursor-pointer transition-all duration-200`}
          onClick={toggleMinimize}
        >
          <div className="flex items-center justify-between">
            {/* 왼쪽 로고 */}
            <div className="flex-shrink-0">
              <img
                src="https://its-me-vert.vercel.app/images/ui/logo_white.svg"
                alt="Logo"
                className="w-12 h-12"
              />
            </div>
            {/* 중앙 제목/부제목 */}
            <div className="flex-1 text-center">
              <CardTitle className="text-xl font-bold">
                {languageTexts[currentLang].title}
              </CardTitle>
              <p className="text-white text-center mt-1 text-sm">
                {languageTexts[currentLang].subtitle}
              </p>
            </div>
            {/* 오른쪽 클릭 아이콘 */}
            {/*
              클릭 아이콘 저작권:
              <a href="https://www.flaticon.com/kr/free-icons/-">Freepik - Flaticon</a>
            */}
            <div className="flex-shrink-0 text-white hover:text-gray-200 transition-colors">
              <img
                src="https://its-me-vert.vercel.app/images/ui/click.svg"
                alt={isMinimized ? 'Expand' : 'Minimize'}
                className={`w-10 h-10 brightness-0 invert group-hover:brightness-0 group-hover:invert group-hover:animate-bounce ${
                  isMinimized ? 'animate-slow-ping' : ''
                }`}
              />
            </div>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
            {/* 메시지 영역 */}
            <div 
              className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0"
              onScroll={handleScroll}
            >
              {chatMessages.map((message) => (
                <div key={message.id}>
                  <ChatImage
                    message={message.content}
                    isUser={message.role === 'user'}
                    imagePaths={message.imagePaths}
                    timestamp={message.timestamp.toISOString()}
                  />
                               {/* 추천질문 표시 */}
             {message.role === 'assistant' && message.suggestions && message.topic &&
               renderSuggestions(message.suggestions, message.topic, message.id)
             }
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`${currentTheme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} rounded-2xl px-4 py-3 border`}>
                                      <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-chomin rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-chomin rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-chomin rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  </div>
                </div>
                            )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 폼 */}
            <div className={`p-6 border-t ${currentTheme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'} rounded-b-lg flex-shrink-0`}>
              <form onSubmit={handleSubmit} className="flex space-x-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={languageTexts[currentLang].placeholder}
                  disabled={isLoading}
                  className={`flex-1 border-2 ${currentTheme === 'dark' ? 'border-gray-600 bg-gray-800 text-gray-100' : 'border-gray-200 bg-white text-gray-900'} focus:border-chomin focus:ring-2 focus:ring-chomin-light rounded-xl px-4 py-3 text-base`}
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-chomin hover:bg-chomin-dark px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
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
    default: Chatbot,
    Chatbot,
    React,
    ReactDOM
  };
}
