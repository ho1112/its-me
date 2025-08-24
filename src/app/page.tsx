'use client'

import { useEffect, useState } from 'react'
import Chatbot from '@/components/chatbot/Chatbot'

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [lang, setLang] = useState<'ja' | 'ko'>('ja')

  useEffect(() => {
    // URL 파라미터에서 테마와 언어 읽기
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const themeParam = urlParams.get('theme') as 'light' | 'dark'
      const langParam = urlParams.get('lang') as 'ja' | 'ko'
      
      if (themeParam === 'dark' || themeParam === 'light') {
        setTheme(themeParam)
      }
      
      if (langParam === 'ja' || langParam === 'ko') {
        setLang(langParam)
      }
    }
  }, [])

  return (
    <main>
      {/* AI 챗봇 위젯 - 화면 중앙에 고정 표시 */}
      <Chatbot
        apiUrl="/api/chat"
        initialTheme={theme}
        initialLang={lang}
      />
    </main>
  )
}
