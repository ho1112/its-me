// 전체 질문 임베딩 생성(itsme.json 파일 기반)
const { GoogleGenAI } = require('@google/genai')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Google AI Studio 임베딩 API 클라이언트 생성
const geminiApiKey = process.env.GEMINI_API_KEY
if (!geminiApiKey) {
  console.error('❌ Gemini API 키가 설정되지 않았습니다!')
  process.exit(1)
}

const genAI = new GoogleGenAI(geminiApiKey)

// 텍스트를 3072차원 벡터로 변환
async function generateEmbedding(text) {
  try {
    console.log(`📝 텍스트 임베딩 중: ${text.substring(0, 50)}...`);

    // https://ai.google.dev/api/embeddings#embed_content-JAVASCRIPT
    const result = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: { outputDimensionality: 3072 }
    });
    
    const embedding = result.embeddings[0].values;
    console.log(`✅ 임베딩 생성 완료: ${embedding.length}차원`);
    return embedding;

  } catch (error) {
    console.error('❌ 임베딩 생성 실패:', error.message);
    return null;
  }
}

// 모든 데이터에 임베딩 생성 및 Supabase 저장
async function generateAllEmbeddings() {
  try {
    console.log('🚀 gemini-embedding-001 임베딩 생성을 시작합니다...')
    
    // Supabase에서 모든 데이터 가져오기 (metadata 포함)
    const { data: records, error: fetchError } = await supabase
      .from('itsme')
      .select('id, question, answer_ko, answer_ja, metadata')
    
    if (fetchError) {
      console.error('❌ 데이터 조회 실패:', fetchError.message)
      return
    }
    
    console.log(`📊 총 ${records.length}개의 데이터를 처리합니다.`)
    
    // 각 데이터에 임베딩 생성 및 업데이트
    for (const record of records) {
      console.log(`\n🔄 처리 중: ${record.question}`)
      
      // 일본어 우선, 한국어 fallback으로 임베딩 텍스트 구성
      const answerText = record.answer_ja || record.answer_ko
      const combinedText = `${record.question} ${answerText} ${record.answer_ko} ${JSON.stringify(record.metadata || {})}`
      
      console.log(`📝 임베딩 텍스트 구성: ${combinedText.substring(0, 100)}...`)
      
      const embedding = await generateEmbedding(combinedText)
      
      if (embedding) {
        // Supabase에 임베딩 업데이트
        const { error: updateError } = await supabase
          .from('itsme')
          .update({ embedding: embedding })
          .eq('id', record.id)
        
        if (updateError) {
          console.error(`❌ 임베딩 업데이트 실패 (ID: ${record.id}):`, updateError.message)
        } else {
          console.log(`✅ 임베딩 저장 완료: ${record.question}`)
        }
      } else {
        console.log(`⚠️ 임베딩 생성 실패로 건너뜀: ${record.question}`)
      }
      
      // API 호출 제한 방지를 위한 지연 (1초)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('\n🎉 모든 임베딩 생성이 완료되었습니다!')
    
  } catch (error) {
    console.error('❌ 임베딩 생성 중 오류 발생:', error.message)
  }
}

// 메인 실행
async function main() {
  try {
    await generateAllEmbeddings()
  } catch (error) {
    console.error('❌ 메인 실행 중 오류:', error.message)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  main()
}

module.exports = { generateAllEmbeddings, generateEmbedding }
