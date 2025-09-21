const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경변수 로드
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSpecificQuestion() {
  try {
    console.log('🔍 특정 질문 업데이트를 시작합니다...');
    
    // itsme.json 파일 읽기
    const dataPath = path.join(__dirname, '../src/data/itsme.json');
    const localData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // 업데이트할 질문 찾기
    const targetQuestion = "하고 싶은 일, 원하는 일과 업무, 희망 포지션, 희망 업계";
    const targetData = localData.find(item => item.question === targetQuestion);
    
    if (!targetData) {
      console.error(`❌ 질문을 찾을 수 없습니다: ${targetQuestion}`);
      return;
    }
    
    console.log(`📝 업데이트할 질문: ${targetQuestion}`);
    console.log(`📝 새로운 답변 (한국어): ${targetData.answer_ko.substring(0, 100)}...`);
    console.log(`📝 새로운 답변 (일본어): ${targetData.answer_ja.substring(0, 100)}...`);
    
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
    
    // 답변 업데이트
    const { error: updateError } = await supabase
      .from('itsme')
      .update({
        answer_ko: targetData.answer_ko,
        answer_ja: targetData.answer_ja,
        image_paths: targetData.image_paths,
        tags: targetData.tags,
        metadata: targetData.metadata || null
      })
      .eq('id', existingData.id);
    
    if (updateError) {
      console.error('❌ 업데이트 실패:', updateError);
      return;
    }
    
    console.log('✅ 질문 답변이 성공적으로 업데이트되었습니다!');
    
    // 임베딩 재생성
    console.log('🔄 임베딩 재생성을 시작합니다...');
    
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    
    // 임베딩 텍스트 구성
    const embeddingText = `${targetData.question} ${targetData.answer_ko} ${targetData.answer_ja}`;
    
    try {
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(embeddingText);
      
      const embedding = result.embedding.values;
      
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
      
    } catch (embeddingError) {
      console.error('❌ 임베딩 생성 실패:', embeddingError);
      return;
    }
    
    console.log('🎉 특정 질문 업데이트가 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

updateSpecificQuestion();
