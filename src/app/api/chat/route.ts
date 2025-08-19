import { NextRequest, NextResponse } from 'next/server'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { createClient } from '@supabase/supabase-js'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { Document } from '@langchain/core/documents'

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// LangChain 컴포넌트 초기화
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.GEMINI_API_KEY!,
  maxConcurrency: 5,
})

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY!,
  maxOutputTokens: 2048,
})

// 벡터 스토어 생성 - 기본 설정 사용
const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabase,
  tableName: "itsme",
  queryName: "match_documents",
})

// 프롬프트 템플릿 정의
const promptTemplate = ChatPromptTemplate.fromTemplate(`
당신은 이호연이라는 프론트엔드 개발자의 AI 포트폴리오 어시스턴트입니다.

다음은 사용자 질문과 관련된 정보입니다:
{context}

사용자 질문: {question}

위의 정보를 바탕으로 지능적으로 답변해주세요. 관련 정보가 있다면 그것을 활용해서 답변해주세요.
만약 위 정보로 답변할 수 없다면, "죄송합니다. 해당 정보를 찾을 수 없습니다."라고 답변해주세요.

답변은 자연스럽고 친근한 톤으로 작성해주세요.

**중요**: 사용자가 일본어로 질문했다면 반드시 일본어로 답변해주세요. 한국어로 질문했다면 한국어로 답변해주세요.
`)

// RAG 체인 구성
const ragChain = RunnableSequence.from([
  {
    context: async (input: { question: string }) => {
      try {
        // 벡터 검색으로 관련 문서 찾기
        console.log(`🔍 LangChain 벡터 검색 시작: "${input.question}"`)
        const results = await vectorStore.similaritySearch(input.question, 3)
        console.log(`✅ 검색 결과: ${results.length}개`)
        
        // 디버깅: 각 문서의 내용 확인
        results.forEach((doc: Document, index: number) => {
          console.log(`📄 문서 ${index + 1}:`)
          console.log(`  - pageContent: ${doc.pageContent}`)
          console.log(`  - metadata:`, doc.metadata)
        })
        
        // 언어별로 적절한 답변 데이터 선택
        const hasJapaneseChars = (text: string): boolean => {
          const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
          return japaneseRegex.test(text)
        }
        
        const isJapaneseQuestion = hasJapaneseChars(input.question)
        console.log(`🌐 일본어 질문 여부: ${isJapaneseQuestion}`)
        
        // 새로운 구조: 질문 + 답변을 조합해서 컨텍스트 구성
        return results.map((doc: Document) => {
          const question = doc.pageContent        // 질문
          const answerKo = doc.metadata?.answer_ko  // 한국어 답변
          const answerJa = doc.metadata?.answer_ja  // 일본어 답변
          
          // 질문과 답변을 조합
          let context = `질문: ${question}\n답변: ${answerKo}`
          
          // 일본어 질문이면 일본어 답변도 포함
          if (isJapaneseQuestion && answerJa) {
            context += `\n일본어 답변: ${answerJa}`
            console.log(`🇯🇵 일본어 답변 포함: ${answerJa}`)
          }
          
          console.log(`📝 컨텍스트 구성: ${context.substring(0, 50)}...`)
          return context
        }).join('\n\n')
      } catch (error) {
        console.error('❌ LangChain 벡터 검색 실패:', error)
        // 에러 발생 시 빈 컨텍스트 반환
        return "관련 정보를 찾을 수 없습니다."
      }
    },
    question: (input: { question: string }) => input.question
  },
  promptTemplate,
  model,
  new StringOutputParser()
])

export async function POST(request: NextRequest) {
  try {
    const { message, language = 'ko' } = await request.json()
    
    if (!message) {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { status: 400 }
      )
    }

    // Supabase 연결 테스트
    console.log('🔌 Supabase 연결 테스트 시작...')
    const { data: testData, error: testError } = await supabase
      .from('itsme')
      .select('id, question')
      .limit(1)
    
    if (testError) {
      console.error('❌ Supabase 연결 실패:', testError)
      return NextResponse.json(
        { error: '데이터베이스 연결에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    console.log('✅ Supabase 연결 성공:', testData?.length || 0, '개 데이터')

    // LangChain RAG 체인 실행
    console.log(`🤖 LangChain RAG 체인 실행: "${message}"`)
    
    const response = await ragChain.invoke({
      question: message
    })

    console.log(`✅ LangChain 응답 생성 완료:`, response.substring(0, 100) + '...')

    // 이미지 정보 추출 - ragChain과 동일한 검색을 다시 실행하여 이미지 경로들 가져오기
    const { data: imageResults } = await supabase
      .from('itsme')
      .select('image_paths')
      .textSearch('question', message)  // 질문과 유사한 항목 검색
      .limit(1)
    
    const imagePaths = imageResults?.[0]?.image_paths || []
    console.log(`🖼️ 이미지 경로들: ${imagePaths}`)
    
    return NextResponse.json({
      response,
      language,
      imagePaths,  // 이미지 경로들 추가
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