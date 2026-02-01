import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { saveReport } from '@/lib/db'
import { REPORTS_URL } from '@/lib/constants'
import type { CcusageData } from '@/app/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userName, ccusageData, since, until } = body

    if (!userName || !ccusageData) {
      return NextResponse.json(
        { ok: false, error: 'userName과 ccusageData가 필요합니다.' },
        { status: 400 }
      )
    }

    // ccusageData 검증
    if (!ccusageData.daily || !ccusageData.totals) {
      return NextResponse.json(
        { ok: false, error: 'ccusageData 형식이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const data = ccusageData as CcusageData

    // DB에 리포트 데이터 저장
    const reportId = randomUUID()

    // 날짜 범위 계산
    const dates = data.daily.map(d => d.date).sort()
    const sinceDate = since || dates[0] || ''
    const untilDate = until || dates[dates.length - 1] || ''
    const period = `${sinceDate} ~ ${untilDate}`

    // 원본 데이터
    const rawData = {
      mergedData: data,
      teamData: [{
        name: userName,
        fileName: `${userName}.json`,
        data: data
      }],
      customSince: sinceDate,
      customUntil: untilDate,
      weekDates: {
        since: sinceDate,
        until: untilDate,
        display: `${sinceDate} ~ ${untilDate}`
      }
    }

    // 요약 통계
    const summary = {
      totalCost: data.totals.totalCost || 0,
      totalTokens: data.totals.totalTokens || 0,
      totalMembers: 1,
      members: [{
        name: userName,
        cost: data.totals.totalCost || 0,
        tokens: data.totals.totalTokens || 0,
        percentage: 100
      }]
    }

    await saveReport(reportId, userName, period, rawData, summary)

    const reportsUrl = REPORTS_URL

    return NextResponse.json({
      ok: true,
      reportId,
      reportsUrl,
      message: '리포트가 성공적으로 저장되었습니다.',
      summary: {
        userName,
        period,
        totalCost: data.totals.totalCost,
        totalTokens: data.totals.totalTokens
      }
    })

  } catch (error) {
    console.error('Save raw report error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
