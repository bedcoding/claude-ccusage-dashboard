import { NextRequest, NextResponse } from 'next/server'
import { getReports } from '@/lib/db'

// 리포트 목록 조회 (페이징)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    const data = await getReports(page, limit)
    return NextResponse.json(data)

  } catch (error) {
    console.error('[Reports] 에러:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
