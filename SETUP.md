# PostgreSQL DB 설정 가이드

## 1. 환경 변수 설정

`.env.local` 파일을 열고 비밀번호를 입력하세요:

```env
DATABASE_URL="postgresql://study:YOUR_PASSWORD_HERE@pg1101.gabiadb.com:5432/study"
```

`YOUR_PASSWORD_HERE`를 실제 비밀번호로 교체하세요.

## 2. 테이블 생성

가비아 DB에 접속하여 `db-schema.sql` 파일의 내용을 실행하세요.

### 방법 1: psql 명령어 사용

```bash
psql "postgresql://study:YOUR_PASSWORD@pg1101.gabiadb.com:5432/study" -f db-schema.sql
```

### 방법 2: 가비아 웹 콘솔 사용

1. 가비아 호스팅 관리 페이지 접속
2. PostgreSQL 관리 도구 접속
3. SQL 쿼리 실행 창에서 아래 내용 실행:

```sql
-- 임시 파일 저장 테이블
CREATE TABLE IF NOT EXISTS temp_files (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    data BYTEA NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 만료 시간 인덱스
CREATE INDEX IF NOT EXISTS idx_temp_files_expires_at ON temp_files(expires_at);
```

### 방법 3: Node.js 스크립트 사용

프로젝트에서 아래 명령어 실행:

```bash
node -e "require('pg').Pool({connectionString:process.env.DATABASE_URL}).query(require('fs').readFileSync('db-schema.sql','utf8'))"
```

## 3. Vercel 환경 변수 설정

Vercel에 배포한 경우, Vercel 프로젝트 설정에서도 환경 변수를 추가하세요:

1. Vercel Dashboard 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. `DATABASE_URL` 추가: `postgresql://study:YOUR_PASSWORD@pg1101.gabiadb.com:5432/study`

## 4. 테스트

개발 서버 실행:

```bash
npm run dev
```

슬랙 전송 버튼을 눌러 파일이 정상적으로 생성되고 다운로드되는지 확인하세요.

## 주요 변경사항

- ✅ 메모리 저장소 → PostgreSQL DB 저장으로 변경
- ✅ Vercel serverless 인스턴스 문제 해결
- ✅ 파일 TTL 5분 (자동 만료)
- ✅ 다운로드 후 즉시 삭제
- ✅ 만료된 파일 자동 정리

## 문제 해결

### DB 연결 오류

```
Error: DATABASE_URL 환경 변수가 설정되지 않았습니다.
```

→ `.env.local` 파일에 `DATABASE_URL`이 올바르게 설정되었는지 확인하세요.

### 테이블이 없음

```
Error: relation "temp_files" does not exist
```

→ `db-schema.sql`을 실행하여 테이블을 생성하세요.
