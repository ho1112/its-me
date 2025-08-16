import ChatbotWidget from '@/components/chatbot/ChatbotWidget'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center">
          잇츠 미 (It's Me)
        </h1>
        <p className="text-xl text-center mt-4">
          AI 기반 인터랙티브 포트폴리오
        </p>
        <p className="text-lg text-center mt-6 text-gray-600">
          오른쪽 하단의 💬 버튼을 클릭하여 챗봇과 대화해보세요!
        </p>
      </div>
      
      {/* 챗봇 위젯 */}
      <ChatbotWidget />
    </main>
  )
}
