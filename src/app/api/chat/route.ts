import { NextRequest, NextResponse } from 'next/server'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { createClient } from '@supabase/supabase-js'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { Document } from '@langchain/core/documents'
import suggestionDecks from '@/data/suggestions.json'
import { NO_ANSWER_KEYWORD, RECOMMENDATION_TOPICS } from '@/utils/constants'

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

const today = new Date();
const todayString = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
  timeZone: 'Asia/Tokyo',
}).format(today);

// 추천질문 생성 함수
function generateSuggestions(
  language: string, 
  searchResults: Document[], 
  isFirstMessage: boolean = false,
  isSearchFailed: boolean = false
) {
  // 대화 시작 시
  if (isFirstMessage) {
    return {
      suggestions: suggestionDecks.initial[language as keyof typeof suggestionDecks.initial] || suggestionDecks.initial.ko,
      topic: RECOMMENDATION_TOPICS.INITIAL
    };
  }
  
  // 검색 실패 시
  if (isSearchFailed) {
    return {
      suggestions: suggestionDecks.fallback[language as keyof typeof suggestionDecks.fallback] || suggestionDecks.fallback.ko,
      topic: RECOMMENDATION_TOPICS.FALLBACK
    };
  }
  
  // 검색 성공 시 - 태그 기반으로 적절한 follow_up 덱 선택
  if (searchResults.length > 0) {
    // 모든 검색 결과의 태그를 수집
    const allTags = searchResults.flatMap(doc => {
      const metadata = doc.metadata as any;
      return metadata.tags || [];
    });
    
    // follow_up 덱 중에서 태그가 가장 많이 일치하는 것을 선택
    let bestMatch = null;
    let maxMatchCount = 0;
    
    for (const deck of suggestionDecks.follow_up) {
      const matchCount = deck.tags.filter(tag => allTags.includes(tag)).length;
      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        bestMatch = deck;
      }
    }
    
    if (bestMatch && maxMatchCount > 0) {
      return {
        suggestions: bestMatch[language as keyof typeof bestMatch] || bestMatch.ko,
        topic: bestMatch.tags.join(',') // 태그들을 쉼표로 구분하여 topic으로 사용
      };
    }
  }
  
  // 기본값: 추천질문 없음
  return {
    suggestions: [],
    topic: null
  };
}

// 언어별 프롬프트 템플릿 정의
const promptTemplateKo = ChatPromptTemplate.fromTemplate(`
당신은 이호연이라는 프론트엔드 개발자의 AI 포트폴리오 어시스턴트입니다.
현재 날짜는 ${todayString} 입니다. 이 날짜를 기준으로 나이 계산 등의 요청에 답변해주세요.

다음은 사용자 질문과 관련된 정보입니다:
{context}

사용자 질문: {question}

위의 정보를 바탕으로 지능적으로 답변해주세요. 관련 정보가 있다면 그것을 활용해서 답변해주세요.
만약 위 정보로 답변할 수 없다면, 반드시 '${NO_ANSWER_KEYWORD}'를 포함해서 답변해주세요.

답변은 자연스럽고 친근한 톤으로 작성해주세요.

**중요**: 답변에서 마크다운 문법(**, __, *** 등)을 사용하지 마세요. 깔끔하고 읽기 쉬운 일반 텍스트로 작성해주세요.

**중요**: 사용자가 한국어로 질문했다면 한국어로, 다른 언어로 질문했다면 해당 언어로 답변해주세요.
`)

const promptTemplateJa = ChatPromptTemplate.fromTemplate(`
あなたは李虎演(イ・ホヨン)というフロントエンド開発者のAIポートフォリオアシスタントです。
現在の日付は${todayString}です。この日付を基準に年齢計算などのご要望にお答えください。

以下はユーザーのご質問に関連する情報です：
{context}

ユーザーのご質問：{question}

上記の情報を基に、知的にお答えください。関連情報がある場合は、それを活用してお答えください。
上記の情報でお答えできない場合は、必ず'${NO_ANSWER_KEYWORD}'を含めてお答えください。

お答えは自然で親しみやすいトーンで作成してください。

**重要**：お答えでマークダウン記法（**、__、***など）を使用しないでください。読みやすく、きれいな通常のテキストで作成してください。

**重要**：ユーザーが日本語で質問した場合は日本語で、他の言語で質問した場合はその言語でお答えください。
`)

// RAG 체인 구성 (언어별로 동적 생성)
function createRagChain(language: string) {
  const promptTemplate = language === 'ja' ? promptTemplateJa : promptTemplateKo;
  
  return RunnableSequence.from([
    {
      context: async (input: { question: string }) => {
        try {
            // 벡터 검색으로 관련 문서 찾기 (유사도 임계값 0.5 적용)
  console.log(`🔍 LangChain 벡터 검색 시작: "${input.question}"`)
  const resultsWithScore = await vectorStore.similaritySearchWithScore(input.question, 10)
  const results = resultsWithScore
    .filter(([doc, score]) => score > 0.5)
    .slice(0, 3)
    .map(([doc]) => doc)
  console.log(`✅ 검색 결과: ${results.length}개 (임계값 0.5 이상)`)
          
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
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { message, language = 'ko' } = await request.json()
    
    if (!message) {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
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
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      )
    }
    
    console.log('✅ Supabase 연결 성공:', testData?.length || 0, '개 데이터')

    // LangChain RAG 체인 실행
    console.log(`🤖 LangChain RAG 체인 실행: "${message}"`)
    
    // 언어에 따라 RAG 체인 생성
    const ragChain = createRagChain(language);
    const response = await ragChain.invoke({
      question: message
    })

    console.log(`✅ LangChain 응답 생성 완료:`, response.substring(0, 100) + '...')

    // 벡터 검색 결과를 다시 가져와서 추천질문 생성에 사용 (임계값 0.7 적용)
    const searchResultsWithScore = await vectorStore.similaritySearchWithScore(message, 10);
    const searchResults = searchResultsWithScore
      .filter(([doc, score]) => score > 0.5)
      .slice(0, 3)
      .map(([doc]) => doc);
    
    // 추천질문 생성
    const isFirstMessage = !request.headers.get('x-chat-history'); // 간단한 첫 메시지 체크
    const isSearchFailed = searchResults.length === 0 || response.includes(NO_ANSWER_KEYWORD);
    
    const suggestions = generateSuggestions(language, searchResults, isFirstMessage, isSearchFailed);

    // 이미지 정보 추출 - ragChain과 동일한 검색을 다시 실행하여 이미지 경로들 가져오기
    const { data: imageResults } = await supabase
      .from('itsme')
      .select('image_paths')
      .textSearch('question', message)  // 질문과 유사한 항목 검색
      .limit(1)
    
    const imagePaths = imageResults?.[0]?.image_paths || []

    
    return NextResponse.json({
      response,
      language,
      imagePaths,  // 이미지 경로들 추가
      suggestions: suggestions.suggestions, // 추천질문 추가
      topic: suggestions.topic, // 주제 추가
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error: any) {
    console.error('Chat API Error:', error)
    
    // 할당량 초과 에러 처리
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.' },
        { 
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      )
    }
    
    // 모델을 찾을 수 없는 에러 처리
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'AI 모델을 찾을 수 없습니다. 설정을 확인해주세요.' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      )
    }
    
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    )
  }
}