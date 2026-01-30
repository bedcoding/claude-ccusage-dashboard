-- 임시 파일 저장 테이블
CREATE TABLE IF NOT EXISTS temp_files (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    data BYTEA NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 만료 시간 인덱스 (빠른 정리를 위해)
CREATE INDEX IF NOT EXISTS idx_temp_files_expires_at ON temp_files(expires_at);

-- 만료된 파일 자동 정리 (선택사항)
-- 주기적으로 실행하거나, PostgreSQL cron 확장을 사용할 수 있습니다
-- DELETE FROM temp_files WHERE expires_at < NOW();
