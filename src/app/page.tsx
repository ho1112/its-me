import ChatbotWidget from '@/components/chatbot/ChatbotWidget'

export default function Home() {
  return (
    <main>
      {/* AI 챗봇 위젯 - 화면 중앙에 고정 표시 */}
      <ChatbotWidget
        apiUrl="/api/chat"
        initialLang="ko"
        initialTheme="light"
      />
    </main>
  )
}
