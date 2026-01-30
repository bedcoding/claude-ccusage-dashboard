import { NextRequest, NextResponse } from 'next/server'
import { getReports } from '@/lib/db'

// 최근 5개 리포트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const reports = await getReports()
    return NextResponse.json({ reports })

  } catch (error) {
    console.error('[Reports] 에러:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
