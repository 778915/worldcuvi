-- Quota Savior: Search Result Caching Table
CREATE TABLE IF NOT EXISTS cached_searches (
    query_hash TEXT PRIMARY KEY,    -- 검색어와 정렬 옵션을 조합한 해시값
    query_text TEXT NOT NULL,       -- 실제 검색어
    results JSONB NOT NULL,         -- 유튜브 API 응답 데이터 (최적화된 형태)
    hit_count INTEGER DEFAULT 1,    -- 얼마나 자주 검색되었는지
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 캐시 만료 시간
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 만료 시간 기준 인덱스 (자동 삭제 스케줄러 대비)
CREATE INDEX IF NOT EXISTS idx_cached_searches_expires ON cached_searches(expires_at);
