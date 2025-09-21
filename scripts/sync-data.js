#!/usr/bin/env node

/**
 * 완전 통합 데이터 동기화 스크립트
 * 
 * 기능:
 * 1. 초기 작업: DB가 비어있을 때 모든 데이터 업로드 + 임베딩 생성
 * 2. 증분 업데이트: 신규/수정/임베딩 누락 자동 감지 및 처리
 * 3. 강제 전체 재업로드: --force 옵션
 * 4. 특정 질문 처리: --question 옵션
 * 
 * 사용법:
 * node scripts/sync-data.js                    # 자동 감지
 * node scripts/sync-data.js --force           # 강제 전체 재업로드
 * node scripts/sync-data.js --question "질문"  # 특정 질문만 처리
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

// 환경변수 로드
require('dotenv').config({ path: '.env' });

// 명령행 인수 파싱
const args = process.argv.slice(2);
const isForceMode = args.includes('--force');
const questionIndex = args.indexOf('--question');
const specificQuestion = questionIndex !== -1 && args[questionIndex + 1] ? args[questionIndex + 1] : null;

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Google AI Studio 임베딩 API 클라이언트 생성
const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.error('❌ Gemini API 키가 설정되지 않았습니다!');
  process.exit(1);
}

const genAI = new GoogleGenAI(geminiApiKey);

// 통계 추적
const stats = {
  new: 0,
  updated: 0,
  embeddingGenerated: 0,
  skipped: 0,
  errors: 0
};

/**
 * 임베딩 생성 함수
 */
async function generateEmbedding(text) {
  try {
    const result = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: { outputDimensionality: 3072 }
    });
    
    return result.embeddings[0].values;
  } catch (error) {
    console.error('❌ 임베딩 생성 실패:', error.message);
    throw error;
  }
}

/**
 * 깊은 객체 비교 함수
 */
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }
  
  return obj1 === obj2;
}

/**
 * 데이터 비교 및 상태 분류
 */
function classifyDataStatus(localData, dbData) {
  const status = {
    new: [],           // 신규 추가
    updated: [],       // 수정됨
    embeddingMissing: [], // 임베딩 누락
    same: []           // 동일
  };

  for (const localItem of localData) {
    const dbItem = dbData.find(db => db.question === localItem.question);
    
    if (!dbItem) {
      // 신규 추가
      status.new.push(localItem);
    } else if (!dbItem.embedding || dbItem.embedding.length === 0) {
      // 임베딩 누락
      status.embeddingMissing.push({ local: localItem, db: dbItem });
    } else if (
      dbItem.answer_ko !== localItem.answer_ko ||
      dbItem.answer_ja !== localItem.answer_ja ||
      !deepEqual(dbItem.image_paths, localItem.image_paths) ||
      !deepEqual(dbItem.tags, localItem.tags) ||
      !deepEqual(dbItem.metadata || null, localItem.metadata || null)
    ) {
      // 수정됨
      status.updated.push({ local: localItem, db: dbItem });
    } else {
      // 동일
      status.same.push(localItem);
    }
  }

  return status;
}

/**
 * 신규 데이터 업로드
 */
async function uploadNewData(items) {
  if (items.length === 0) return;

  console.log(`\n🆕 신규 데이터 업로드: ${items.length}개`);
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      console.log(`📝 ${i + 1}/${items.length}: ${item.question}`);
      
      // 임베딩 생성
      const embeddingText = `${item.question} ${item.answer_ko} ${item.answer_ja}`;
      const embedding = await generateEmbedding(embeddingText);
      
      // 데이터 삽입
      const { error } = await supabase
        .from('itsme')
        .insert({
          question: item.question,
          answer_ko: item.answer_ko,
          answer_ja: item.answer_ja,
          image_paths: item.image_paths,
          tags: item.tags,
          metadata: item.metadata || null,
          embedding: embedding
        });

      if (error) {
        console.error(`❌ 업로드 실패: ${item.question}`, error.message);
        stats.errors++;
      } else {
        console.log(`✅ 업로드 완료: ${item.question}`);
        stats.new++;
        stats.embeddingGenerated++;
      }
    } catch (error) {
      console.error(`❌ 처리 실패: ${item.question}`, error.message);
      stats.errors++;
    }
  }
}

/**
 * 수정된 데이터 업데이트
 */
async function updateModifiedData(items) {
  if (items.length === 0) return;

  console.log(`\n🔄 수정된 데이터 업데이트: ${items.length}개`);
  
  for (let i = 0; i < items.length; i++) {
    const { local, db } = items[i];
    try {
      console.log(`📝 ${i + 1}/${items.length}: ${local.question}`);
      
      // 임베딩 재생성
      const embeddingText = `${local.question} ${local.answer_ko} ${local.answer_ja}`;
      const embedding = await generateEmbedding(embeddingText);
      
      // 데이터 업데이트
      const { error } = await supabase
        .from('itsme')
        .update({
          answer_ko: local.answer_ko,
          answer_ja: local.answer_ja,
          image_paths: local.image_paths,
          tags: local.tags,
          metadata: local.metadata || null,
          embedding: embedding
        })
        .eq('id', db.id);

      if (error) {
        console.error(`❌ 업데이트 실패: ${local.question}`, error.message);
        stats.errors++;
      } else {
        console.log(`✅ 업데이트 완료: ${local.question}`);
        stats.updated++;
        stats.embeddingGenerated++;
      }
    } catch (error) {
      console.error(`❌ 처리 실패: ${local.question}`, error.message);
      stats.errors++;
    }
  }
}

/**
 * 임베딩 누락 데이터 처리
 */
async function generateMissingEmbeddings(items) {
  if (items.length === 0) return;

  console.log(`\n🔧 임베딩 누락 데이터 처리: ${items.length}개`);
  
  for (let i = 0; i < items.length; i++) {
    const { local, db } = items[i];
    try {
      console.log(`📝 ${i + 1}/${items.length}: ${local.question}`);
      
      // 임베딩 생성
      const embeddingText = `${local.question} ${local.answer_ko} ${local.answer_ja}`;
      const embedding = await generateEmbedding(embeddingText);
      
      // 임베딩만 업데이트
      const { error } = await supabase
        .from('itsme')
        .update({ embedding: embedding })
        .eq('id', db.id);

      if (error) {
        console.error(`❌ 임베딩 업데이트 실패: ${local.question}`, error.message);
        stats.errors++;
      } else {
        console.log(`✅ 임베딩 생성 완료: ${local.question}`);
        stats.embeddingGenerated++;
      }
    } catch (error) {
      console.error(`❌ 처리 실패: ${local.question}`, error.message);
      stats.errors++;
    }
  }
}

/**
 * 특정 질문 처리
 */
async function processSpecificQuestion(localData, dbData, targetQuestion) {
  console.log(`\n🎯 특정 질문 처리: "${targetQuestion}"`);
  
  const localItem = localData.find(item => item.question === targetQuestion);
  if (!localItem) {
    console.error(`❌ 로컬 데이터에서 질문을 찾을 수 없습니다: ${targetQuestion}`);
    return;
  }

  const dbItem = dbData.find(db => db.question === targetQuestion);
  if (!dbItem) {
    // 신규 추가
    console.log('📝 신규 질문으로 처리됩니다.');
    await uploadNewData([localItem]);
  } else {
    // 기존 질문 수정
    console.log('📝 기존 질문 수정으로 처리됩니다.');
    await updateModifiedData([{ local: localItem, db: dbItem }]);
  }
}

/**
 * 강제 전체 재업로드
 */
async function forceFullReupload(localData) {
  console.log('\n💥 강제 전체 재업로드 모드');
  
  // 모든 데이터 삭제
  console.log('🗑️ 기존 데이터 삭제 중...');
  const { error: deleteError } = await supabase
    .from('itsme')
    .delete()
    .neq('id', 0); // 모든 데이터 삭제

  if (deleteError) {
    console.error('❌ 데이터 삭제 실패:', deleteError.message);
    return;
  }

  console.log('✅ 기존 데이터 삭제 완료');
  
  // 모든 데이터 재업로드
  await uploadNewData(localData);
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log('🚀 완전 통합 데이터 동기화를 시작합니다...');
    
    // 로컬 데이터 읽기
    const dataPath = path.join(__dirname, '../src/data/itsme.json');
    const localData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`📊 로컬 데이터: ${localData.length}개`);

    if (isForceMode) {
      // 강제 전체 재업로드
      await forceFullReupload(localData);
    } else if (specificQuestion) {
      // 특정 질문 처리
      const { data: dbData, error } = await supabase
        .from('itsme')
        .select('*');
      
      if (error) {
        console.error('❌ DB 데이터 조회 실패:', error.message);
        return;
      }
      
      await processSpecificQuestion(localData, dbData, specificQuestion);
    } else {
      // 자동 감지 모드
      const { data: dbData, error } = await supabase
        .from('itsme')
        .select('*');
      
      if (error) {
        console.error('❌ DB 데이터 조회 실패:', error.message);
        return;
      }
      
      console.log(`📊 DB 데이터: ${dbData.length}개`);
      
      if (dbData.length === 0) {
        // 초기 작업: 모든 데이터 업로드
        console.log('\n🌟 초기 작업: 모든 데이터 업로드');
        await uploadNewData(localData);
      } else {
        // 증분 업데이트: 상태 분류 및 처리
        console.log('\n🔍 증분 업데이트: 상태 분류 중...');
        const status = classifyDataStatus(localData, dbData);
        
        console.log(`📈 상태 분류 결과:`);
        console.log(`   🆕 신규: ${status.new.length}개`);
        console.log(`   🔄 수정: ${status.updated.length}개`);
        console.log(`   🔧 임베딩 누락: ${status.embeddingMissing.length}개`);
        console.log(`   ✅ 동일: ${status.same.length}개`);
        
        stats.skipped = status.same.length;
        
        // 각 상태별 처리
        await uploadNewData(status.new);
        await updateModifiedData(status.updated);
        await generateMissingEmbeddings(status.embeddingMissing);
      }
    }

    // 결과 요약
    console.log('\n🎉 동기화 완료!');
    console.log(`📊 처리 결과:`);
    console.log(`   🆕 신규 추가: ${stats.new}개`);
    console.log(`   🔄 수정 완료: ${stats.updated}개`);
    console.log(`   🔧 임베딩 생성: ${stats.embeddingGenerated}개`);
    console.log(`   ✅ 건너뛰기: ${stats.skipped}개`);
    console.log(`   ❌ 오류: ${stats.errors}개`);

  } catch (error) {
    console.error('❌ 전체 작업 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
main();
