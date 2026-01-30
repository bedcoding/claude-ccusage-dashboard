import { Pool } from 'pg'

// PostgreSQL 연결 풀
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.')
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Vercel serverless 환경에서는 연결 수를 제한
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  return pool
}

// 파일 저장
export async function saveFile(
  id: string,
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<void> {
  const pool = getPool()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5분 후

  // 1. 만료된 파일 삭제
  await pool.query('DELETE FROM temp_files WHERE expires_at < NOW()')

  // 2. 최대 5개 유지 - 오래된 파일부터 삭제
  await pool.query(
    `DELETE FROM temp_files
     WHERE id IN (
       SELECT id FROM temp_files
       ORDER BY created_at DESC
       OFFSET 4
     )`
  )

  // 3. 새 파일 저장
  await pool.query(
    `INSERT INTO temp_files (id, filename, mime_type, data, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE
     SET filename = $2, mime_type = $3, data = $4, expires_at = $5`,
    [id, filename, mimeType, buffer, expiresAt]
  )
}

// 파일 가져오기
export async function getFile(id: string): Promise<{
  filename: string
  mimeType: string
  data: Buffer
} | null> {
  const pool = getPool()

  // 만료된 파일은 제외
  const result = await pool.query(
    `SELECT filename, mime_type, data
     FROM temp_files
     WHERE id = $1 AND expires_at > NOW()`,
    [id]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    filename: row.filename,
    mimeType: row.mime_type,
    data: row.data,
  }
}

// 파일 삭제
export async function deleteFile(id: string): Promise<void> {
  const pool = getPool()
  await pool.query('DELETE FROM temp_files WHERE id = $1', [id])
}

// 만료된 파일 정리 (주기적으로 호출하거나 다운로드 시 호출)
export async function cleanupExpiredFiles(): Promise<number> {
  const pool = getPool()
  const result = await pool.query(
    'DELETE FROM temp_files WHERE expires_at < NOW() RETURNING id'
  )
  return result.rowCount || 0
}
