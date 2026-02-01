import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { saveReport } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stats, mergedData, teamData, customSince, customUntil, weekDates, userName } = body

    // DB에 리포트 데이터 저장
    const reportId = randomUUID()
    const period = `${customSince || weekDates.since} ~ ${customUntil || weekDates.until}`

    // 원본 데이터
    const rawData = {
      mergedData,
      teamData,
      customSince,
      customUntil,
      weekDates
    }

    // 요약 통계
    const summary = {
      totalCost: stats?.totalCost || 0,
      totalTokens: stats?.totalTokens || 0,
      totalMembers: stats?.totalMembers || 0,
      members: stats?.members || []
    }

    await saveReport(reportId, userName || null, period, rawData, summary)

    // 리포트 URL
    const reportsUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reports`

    return NextResponse.json({
      ok: true,
      reportId,
      reportsUrl,
      message: '리포트가 성공적으로 저장되었습니다.'
    })

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
