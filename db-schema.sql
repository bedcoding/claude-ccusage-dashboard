-- 리포트 데이터 저장 테이블 (파일 제거, 데이터만 저장)
DROP TABLE IF EXISTS temp_files;
DROP TABLE IF EXISTS reports;

CREATE TABLE reports (
    id VARCHAR(255) PRIMARY KEY,
    reporter_name VARCHAR(200),             -- 리포트 작성자 이름
    team_name VARCHAR(200),                 -- 팀명
    period VARCHAR(200) NOT NULL,           -- 기간 (예: "2026-01-23 ~ 2026-01-30")
    raw_data JSONB NOT NULL,                -- 원본 데이터 (teamData, mergedData 등)
    summary JSONB,                          -- 요약 통계 (totalCost, totalTokens 등)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 생성 시간 인덱스
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
