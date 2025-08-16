import { NextRequest, NextResponse } from 'next/server'

// 임시 응답 데이터 (나중에 RAG 파이프라인으로 교체)
const mockResponses: { [key: string]: string } = {
  '안녕': '안녕하세요! 저는 이력서 챗봇입니다. 궁금한 점이 있으시면 언제든 물어보세요!',
  '이름': '안녕하세요! 저는 이호연입니다. 프론트엔드 개발자로 일하고 있습니다.',
  '경력': '프론트엔드 개발 경험은 총 5년입니다. React, Vue.js, TypeScript를 주로 사용해왔습니다.',
  '기술': '주요 기술 스택은 React, TypeScript, Next.js, Tailwind CSS입니다. 백엔드로는 Node.js, Python도 다룰 수 있습니다.',
  '프로젝트': '최근에는 Next.js와 TypeScript를 활용한 웹 애플리케이션 개발에 집중하고 있습니다. 이력서 챗봇도 그 중 하나입니다!',
  '연락처': '이메일: leehoyeon@example.com, GitHub: @ho1112로 연락 가능합니다.',
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { status: 400 }
      )
    }

    // 임시 로직: 키워드 기반 응답 (나중에 RAG로 교체)
    let response = '죄송합니다. 해당 질문에 대한 답변을 준비하지 못했습니다. 다른 질문을 해주세요!'
    
    for (const [keyword, reply] of Object.entries(mockResponses)) {
      if (message.includes(keyword)) {
        response = reply
        break
      }
    }

    // 실제 API 호출 시에는 여기서 RAG 파이프라인 실행
    // const ragResponse = await executeRAGPipeline(message)
    
    // 응답 지연 시뮬레이션 (실제 AI 응답 시간과 비슷하게)
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
