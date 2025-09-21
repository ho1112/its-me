const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

// 환경변수 로드
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateEmbeddingOnly() {
  try {
    console.log('🔍 특정 질문의 임베딩만 업데이트를 시작합니다...');
    
    const targetQuestion = "하고 싶은 일, 원하는 일과 업무, 희망 포지션, 희망 업계";
    
    // DB에서 해당 질문 찾기
    const { data: existingData, error: fetchError } = await supabase
      .from('itsme')
      .select('*')
      .eq('question', targetQuestion)
      .single();
    
    if (fetchError) {
      console.error('❌ DB에서 질문을 찾을 수 없습니다:', fetchError);
      return;
    }
    
    console.log(`✅ DB에서 질문 발견: ID ${existingData.id}`);
    console.log(`📝 질문: ${existingData.question}`);
    console.log(`📝 답변 (한국어): ${existingData.answer_ko.substring(0, 100)}...`);
    
    // 임베딩 재생성
    console.log('🔄 임베딩 재생성을 시작합니다...');
    
    const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
    
    // 임베딩 텍스트 구성
    const embeddingText = `${existingData.question} ${existingData.answer_ko} ${existingData.answer_ja}`;
    console.log(`📝 임베딩 텍스트 길이: ${embeddingText.length}자`);
    
    const result = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: embeddingText,
      config: { outputDimensionality: 3072 }
    });
    
    const embedding = result.embeddings[0].values;
    console.log(`✅ 임베딩 생성 완료: ${embedding.length}차원`);
    
    // 임베딩 업데이트
    const { error: embeddingError } = await supabase
      .from('itsme')
      .update({
        embedding: embedding
      })
      .eq('id', existingData.id);
    
    if (embeddingError) {
      console.error('❌ 임베딩 업데이트 실패:', embeddingError);
      return;
    }
    
    console.log('✅ 임베딩이 성공적으로 재생성되었습니다!');
    console.log('🎉 작업이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

updateEmbeddingOnly();
