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
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  }

  return pool
}

// 리포트 저장 (최대 1000개만 유지)
export async function saveReport(
  id: string,
  reporterName: string | null,
  period: string,
  rawData: any,
  summary: any
): Promise<void> {
  const pool = getPool()

  // 1. 최대 1000개 유지 - 오래된 리포트부터 삭제
  await pool.query(
    `DELETE FROM reports
     WHERE id IN (
       SELECT id FROM reports
       ORDER BY created_at DESC
       OFFSET 999
     )`
  )

  // 2. 새 리포트 저장
  await pool.query(
    `INSERT INTO reports (id, reporter_name, period, raw_data, summary, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE
     SET reporter_name = $2, period = $3, raw_data = $4, summary = $5, created_at = NOW()`,
    [id, reporterName, period, JSON.stringify(rawData), JSON.stringify(summary)]
  )
}

// 모든 리포트 목록 조회 (최신순, 페이징)
export async function getReports(page: number = 1, limit: number = 100): Promise<{
  reports: Array<{
    id: string
    reporterName: string | null
    period: string
    summary: any
    createdAt: Date
  }>
  total: number
  totalPages: number
  currentPage: number
}> {
  const pool = getPool()

  // 전체 개수 조회
  const countResult = await pool.query('SELECT COUNT(*) FROM reports')
  const total = parseInt(countResult.rows[0].count)
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit

  // 페이징된 데이터 조회
  const result = await pool.query(
    `SELECT id, reporter_name, period, summary, created_at
     FROM reports
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  return {
    reports: result.rows.map(row => ({
      id: row.id,
      reporterName: row.reporter_name,
      period: row.period,
      summary: row.summary,
      createdAt: row.created_at,
    })),
    total,
    totalPages,
    currentPage: page,
  }
}

// 특정 리포트 조회 (원본 데이터 포함)
export async function getReport(id: string): Promise<{
  id: string
  period: string
  rawData: any
  summary: any
  createdAt: Date
} | null> {
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, period, raw_data, summary, created_at
     FROM reports
     WHERE id = $1`,
    [id]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    period: row.period,
    rawData: row.raw_data,
    summary: row.summary,
    createdAt: row.created_at,
  }
}

// 여러 리포트 조회 (원본 데이터 포함)
export async function getReportsByIds(ids: string[]): Promise<Array<{
  id: string
  period: string
  rawData: any
  summary: any
  createdAt: Date
}>> {
  const pool = getPool()

  const result = await pool.query(
    `SELECT id, period, raw_data, summary, created_at
     FROM reports
     WHERE id = ANY($1)
     ORDER BY created_at DESC`,
    [ids]
  )

  return result.rows.map(row => ({
    id: row.id,
    period: row.period,
    rawData: row.raw_data,
    summary: row.summary,
    createdAt: row.created_at,
  }))
}
