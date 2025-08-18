import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// 질문을 임베딩으로 변환
async function generateQuestionEmbedding(question: string) {
  try {
    console.log(`🔍 질문 임베딩 생성 시작: "${question}"`)
    
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const result = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: question,
      config: { outputDimensionality: 768 }
    })
    
    if (result.embeddings && result.embeddings[0] && result.embeddings[0].values) {
      const embedding = result.embeddings[0].values
      console.log(`✅ 임베딩 생성 성공: ${embedding.length}차원`)
      console.log(`📊 임베딩 샘플: [${embedding.slice(0, 5).join(', ')}...]`)
      return embedding
    }
    
    console.error('❌ 임베딩 결과가 비어있음')
    return null
  } catch (error) {
    console.error('❌ 질문 임베딩 생성 실패:', error)
    return null
  }
}

// 벡터 유사도 검색으로 관련 답변 찾기
async function findSimilarAnswers(questionEmbedding: number[], message: string) {
  try {
    console.log(`🔍 벡터 검색 시작: ${questionEmbedding.length}차원`)
    console.log(`🔍 임계값: 0.05, 검색 개수: 10`)
    console.log(`🔍 임베딩 타입:`, typeof questionEmbedding, Array.isArray(questionEmbedding))
    
    // 임베딩 배열이 유효한지 확인
    if (!Array.isArray(questionEmbedding) || questionEmbedding.length !== 768) {
      console.error('❌ 잘못된 임베딩 형식:', questionEmbedding.length, '차원')
      return []
    }
    
    // 방법 1: match_documents 함수 사용 (적절한 임계값으로 테스트)
    console.log('🔄 방법 1: match_documents 함수 시도...')
    
    // 적절한 임계값으로 테스트 (너무 낮지 않게)
    const thresholds = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
    
    for (const threshold of thresholds) {
      console.log(`🔍 임계값 ${threshold}로 테스트...`)
      
      const { data: funcData, error: funcError } = await supabase.rpc('match_documents', {
        query_embedding: questionEmbedding,
        match_threshold: threshold,
        match_count: 10
      })
      
      if (funcError) {
        console.error(`❌ 임계값 ${threshold}에서 에러:`, funcError)
        continue
      }
      
      if (funcData && funcData.length > 0) {
        console.log(`✅ 임계값 ${threshold}에서 ${funcData.length}개 결과 발견!`)
        
        // 모든 결과의 질문을 로그로 출력
        console.log(`🔍 발견된 모든 질문들:`)
        funcData.forEach((item: any, index: number) => {
          console.log(`  ${index + 1}. "${item.question}"`)
        })
        
        // 정확한 질문 매칭을 우선적으로 찾기
        console.log(`🔍 정확한 매칭 검색: message="${message}"`)
        funcData.forEach((item: any, index: number) => {
          console.log(`🔍 비교: "${message}" vs "${item.question}" (일치: ${message === item.question})`)
        })
        
        const exactMatch = funcData.find((item: any) => item.question === message)
        if (exactMatch) {
          console.log(`🎯 정확한 질문 매칭 발견: ID=${exactMatch.id}, question="${exactMatch.question}"`)
          return [exactMatch]
        } else {
          console.log(`❌ 정확한 매칭 없음`)
          console.log(`🔄 의미적으로 관련된 데이터 반환: ${funcData.length}개`)
          return funcData  // 정확한 매칭이 없어도 의미적으로 관련된 데이터 반환
        }
        
        funcData.forEach((item: any, index: number) => {
          console.log(`📊 결과 ${index + 1}: ID=${item.id}, 유사도=${item.similarity}`)
        })
        
        // 정확한 매칭이 없으면 계속 다음 임계값 시도
        console.log(`🔄 정확한 매칭이 없어서 다음 임계값 시도...`)
        continue
      } else {
        console.log(`⚠️ 임계값 ${threshold}에서 결과 없음`)
      }
    }
    
    console.log('❌ 적절한 임계값에서 정확한 매칭을 찾을 수 없습니다.')
    
    // 방법 2: 직접 SQL 쿼리 시도 (임시 해결책)
    console.log('🔄 방법 2: 직접 SQL 쿼리 시도...')
    
    // 키워드 기반 검색 추가
    const keywords = message.toLowerCase().split(' ').filter((word: string) => word.length > 1)
    console.log(`🔍 키워드 검색:`, keywords)
    console.log(`🔍 원본 메시지: "${message}"`)
    
    let sqlData: any = null
    let sqlError: any = null
    
    // 키워드가 있으면 키워드 기반 검색 시도
    if (keywords.length > 0) {
      // 정확한 매칭 시도
      console.log(`🔍 정확한 매칭 시도...`)
      console.log(`🔍 비교: message="${message}" vs question="주요기술"`)
      console.log(`🔍 길이 비교: message=${message.length}, "주요기술"=${"주요기술".length}`)
      console.log(`🔍 바이트 비교: message=${Buffer.from(message).length}, "주요기술"=${Buffer.from("주요기술").length}`)
      
      const { data: exactData, error: exactError } = await supabase
        .from('itsme')
        .select('id, question, answer_ko, answer_ja')
        .eq('question', message)
      
      if (!exactError && exactData && exactData.length > 0) {
        console.log(`✅ 정확한 매칭 결과: ${exactData.length}개`)
        exactData.forEach((item: any) => {
          console.log(`📝 매칭된 항목: ID=${item.id}, question="${item.question}"`)
        })
        sqlData = exactData
        sqlError = null
      } else {
        console.log(`⚠️ 정확한 매칭 결과 없음`)
        if (exactError) {
          console.error(`❌ 정확한 매칭 에러:`, exactError)
        }
        console.log(`⚠️ 정확한 매칭 결과 없음, 부분 매칭 시도...`)
        
        // 부분 매칭 시도
        const keywordConditions = keywords.map((keyword: string) => 
          `question.ilike.%${keyword}%`
        ).join(',')
        
        console.log(`🔍 부분 매칭 조건:`, keywordConditions)
        
        const { data: keywordData, error: keywordError } = await supabase
          .from('itsme')
          .select('id, question, answer_ko, answer_ja')
          .or(keywordConditions)
        
        if (!keywordError && keywordData && keywordData.length > 0) {
          console.log(`✅ 부분 매칭 결과: ${keywordData.length}개`)
          sqlData = keywordData
          sqlError = null
        } else {
          console.log(`⚠️ 부분 매칭 결과 없음`)
        }
      }
    }
    
    // 키워드 검색 결과가 없으면 전체 데이터 가져오기
    if (!sqlData) {
      console.log(`🔄 전체 데이터 가져오기...`)
      const { data: allData, error: allError } = await supabase
        .from('itsme')
        .select('id, question, answer_ko, answer_ja')
        .not('embedding', 'is', null)
      
      sqlData = allData
      sqlError = allError
    }
    
    if (sqlError) {
      console.error('❌ 직접 SQL 쿼리 실패:', sqlError)
      return []
    }
    
    console.log(`✅ 직접 SQL 쿼리 결과: ${sqlData?.length || 0}개`)
    
    // 임시로 모든 데이터 반환 (테스트용)
    if (sqlData && sqlData.length > 0) {
      return sqlData.map((item: any) => ({
        ...item,
        similarity: 0.8  // 임시 유사도 값
      }))
    }
    
    return []
  } catch (error) {
    console.error('❌ 벡터 검색 중 오류:', error)
    return []
  }
}

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

    // 1. 질문을 임베딩으로 변환
    const questionEmbedding = await generateQuestionEmbedding(message)
    if (!questionEmbedding) {
      return NextResponse.json(
        { error: '질문 임베딩 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 2. 벡터 유사도 검색으로 관련 답변 찾기
    const similarAnswers = await findSimilarAnswers(questionEmbedding, message)
    
    console.log(`🔍 검색된 관련 답변: ${similarAnswers.length}개`)
    if (similarAnswers.length > 0) {
      similarAnswers.forEach((answer: any, index: number) => {
        console.log(`📝 ${index + 1}. ${answer.question}`)
      })
    }
    
    // 3. AI 응답 생성
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const model = genAI.models.generateContent

    // RAG 컨텍스트 구성 (자연스럽게)
    let ragContext = ''
    
    if (similarAnswers.length > 0) {
      ragContext = `다음은 사용자 질문과 관련된 정보입니다. 이 정보를 바탕으로 지능적으로 답변해주세요:\n\n`
      
      similarAnswers.forEach((answer: any, index: number) => {
        ragContext += `**질문 ${index + 1}**: ${answer.question}\n`
        ragContext += `**답변 ${index + 1}**: ${answer.answer_ko}\n\n`
      })
      
      ragContext += `위의 정보를 참고하여 사용자 질문에 지능적으로 답변해주세요. 관련 정보가 있다면 그것을 활용해서 답변해주세요. 만약 위 정보로 답변할 수 없다면, "죄송합니다. 해당 정보를 찾을 수 없습니다."라고 답변해주세요.\n\n`
    } else {
      ragContext = `관련 정보를 찾을 수 없습니다. "죄송합니다. 해당 정보를 찾을 수 없습니다."라고 답변해주세요.\n\n`
    }
    
    ragContext += `**사용자 질문**: ${message}`

    console.log(`🤖 AI 프롬프트 전송:`, ragContext.substring(0, 200) + '...')

    // AI 응답 생성
    const result = await model({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: ragContext }] }]
    })
    
    const text = result.text || '응답을 생성할 수 없습니다.'

    console.log(`✅ AI 응답 생성 완료:`, text.substring(0, 100) + '...')

    return NextResponse.json({
      response: text,
      language,
      similarAnswers: similarAnswers.length,
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