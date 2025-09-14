// 1. itsme.json 파일 DB업로드
// 2. 임베딩 생성 (generate-embeddings.js)
// 3. 테스트

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
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인해주세요.')
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
    console.error('❌ JSON 파일을 읽을 수 없습니다:', error.message)
    process.exit(1)
  }
}

// 데이터 업로드
// node scripts/upload-data.js
async function uploadData() {
  try {
    console.log('🚀 데이터 업로드를 시작합니다...')
    
    const data = await loadData()
    console.log(`📊 총 ${data.length}개의 데이터를 업로드합니다.`)
    
    // 기존 데이터 삭제 (선택사항)
    const { error: deleteError } = await supabase
      .from('itsme')
      .delete()
      .neq('id', 0) // 모든 데이터 삭제
    
    if (deleteError) {
      console.log('⚠️ 기존 데이터 삭제 중 오류 (무시하고 진행):', deleteError.message)
    } else {
      console.log('🗑️ 기존 데이터를 삭제했습니다.')
    }
    
    // 새 데이터 업로드
    const { data: insertedData, error: insertError } = await supabase
      .from('itsme')
      .insert(data)
      .select()
    
    if (insertError) {
      console.error('❌ 데이터 업로드 실패:', insertError.message)
      process.exit(1)
    }
    
    console.log(`✅ ${insertedData.length}개의 데이터를 성공적으로 업로드했습니다!`)
    
    // 업로드된 데이터 확인
    console.log('\n📋 업로드된 데이터:')
    insertedData.forEach((item, index) => {
      console.log(`${index + 1}. ${item.question} (${item.tags?.join(', ') || '태그 없음'})`)
    })
    
  } catch (error) {
    console.error('❌ 업로드 중 오류 발생:', error.message)
    process.exit(1)
  }
}

// 메인 실행
async function main() {
  try {
    await uploadData()
    console.log('\n🎉 모든 작업이 완료되었습니다!')
  } catch (error) {
    console.error('❌ 메인 실행 중 오류:', error.message)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  main()
}

module.exports = { uploadData, loadData }
