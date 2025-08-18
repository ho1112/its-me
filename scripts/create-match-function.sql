-- LangChain과 호환되는 벡터 검색 함수 (id 타입 수정)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(3072),
  match_count INT,
  filter JSONB
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    itsme.id::bigint,
    itsme.question AS content,        -- 질문을 content로
    jsonb_build_object(
      'answer_ko', itsme.answer_ko,  -- 한국어 답변
      'answer_ja', itsme.answer_ja   -- 일본어 답변
    ) AS metadata,
    1 - (itsme.embedding <=> query_embedding) AS similarity
  FROM
    itsme
  ORDER BY
    itsme.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;