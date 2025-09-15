// 스마트 업로드: 새로운 데이터만 추가하는 스크립트
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 환경변수 로드
require('dotenv').config({ path: '.env' })

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// JSON 데이터 읽기
async function loadData() {
  try {
    const dataPath = path.join(__dirname, '../src/data/itsme.json')
    const rawData = fs.readFileSync(dataPath, 'utf8')
    return JSON.parse(rawData)
  } catch (error) {
    console.error('❌ JSON 파일 읽기 실패:', error.message)
    process.exit(1)
  }
}

// 새로운 데이터만 찾아서 업로드
async function smartUpload() {
  try {
    console.log('🚀 스마트 업로드를 시작합니다...')
    
    // 1. 로컬 JSON 데이터 로드
    const localData = await loadData()
    console.log(`📊 로컬 데이터: ${localData.length}개`)
    
    // 2. DB에서 기존 데이터 조회
    const { data: existingData, error: fetchError } = await supabase
      .from('itsme')
      .select('question, answer_ko, answer_ja, tags, image_paths, metadata')
    
    if (fetchError) {
      console.error('❌ 기존 데이터 조회 실패:', fetchError.message)
      process.exit(1)
    }
    
    console.log(`📊 DB 기존 데이터: ${existingData.length}개`)
    
    // 3. 새로운 데이터 찾기 (질문 텍스트 기준으로 비교)
    const existingQuestions = new Set(existingData.map(item => item.question))
    const newData = localData.filter(item => !existingQuestions.has(item.question))
    
    console.log(`🆕 새로운 데이터: ${newData.length}개`)
    
    if (newData.length === 0) {
      console.log('✅ 새로운 데이터가 없습니다. 모든 데이터가 최신 상태입니다!')
      return
    }
    
    // 4. 새로운 데이터 출력
    console.log('\n📝 새로 추가될 데이터:')
    newData.forEach((item, index) => {
      console.log(`${index + 1}. ${item.question}`)
    })
    
    // 5. 새로운 데이터만 업로드
    const { data: insertedData, error: insertError } = await supabase
      .from('itsme')
      .insert(newData)
      .select()
    
    if (insertError) {
      console.error('❌ 데이터 업로드 실패:', insertError.message)
      process.exit(1)
    }
    
    console.log(`\n✅ ${insertedData.length}개의 새로운 데이터를 성공적으로 업로드했습니다!`)
    
    // 6. 업로드된 데이터의 ID 출력
    insertedData.forEach((item, index) => {
      console.log(`📝 ${index + 1}. ID: ${item.id}, 질문: ${item.question}`)
    })
    
    return insertedData
    
  } catch (error) {
    console.error('❌ 스마트 업로드 중 오류 발생:', error.message)
    process.exit(1)
  }
}

// 실행
smartUpload()
