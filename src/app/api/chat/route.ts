import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const { message, language = 'ko' } = await request.json()
    
    if (!message) {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { status: 400 }
      )
    }

    // Gemini API 키 확인
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // Gemini 모델 초기화 (빠른 응답을 위한 Flash 모델 사용)
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // 언어별 프롬프트 설정
    const languagePrompt = language === 'ja' 
      ? '일본어로 답변해주세요: '
      : '한국어로 답변해주세요: '

    // 임시 포트폴리오 정보 (나중에 RAG 데이터로 교체)
    const portfolioContext = `
    이력서 챗봇입니다. 다음 정보를 바탕으로 답변해주세요:
    
    이름: 이호연
    직함: 프론트엔드 개발자
    경력: 5년
    주요 기술: React, TypeScript, Next.js, Tailwind CSS
    최근 프로젝트: AI 기반 포트폴리오 챗봇 "잇츠미" 개발
    
    사용자 질문: ${message}
    `

    const prompt = `${languagePrompt}${portfolioContext}`

    // AI 응답 생성
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({
      response: text,
      language,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    
    // 할당량 초과 에러 처리
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      )
    }
    
    // 모델을 찾을 수 없는 에러 처리
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'AI 모델을 찾을 수 없습니다. 설정을 확인해주세요.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
