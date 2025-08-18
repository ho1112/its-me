-- Supabase에서 벡터 유사도 검색을 위한 함수 생성
-- 이 SQL을 Supabase SQL 에디터에서 실행해야 합니다

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id integer,
  question text,
  answer_ko text,
  answer_ja text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    itsme.id,
    itsme.question,
    itsme.answer_ko,
    itsme.answer_ja,
    1 - (itsme.embedding <=> query_embedding) AS similarity
  FROM itsme
  WHERE 1 - (itsme.embedding <=> query_embedding) > match_threshold
  ORDER BY itsme.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
