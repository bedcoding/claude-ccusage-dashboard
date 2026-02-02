import { NextRequest, NextResponse } from 'next/server'
import { getReportsByIds } from '@/lib/db'

// 선택한 리포트들의 통계 데이터 조회
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportIds } = body

    if (!reportIds || reportIds.length === 0) {
      return NextResponse.json(
        { error: '선택된 리포트가 없습니다.' },
        { status: 400 }
      )
    }

    const reports = await getReportsByIds(reportIds)

    if (reports.length === 0) {
      return NextResponse.json(
        { error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 일별 데이터 합산
    const dailyMap = new Map<string, {
      date: string
      totalCost: number
      totalTokens: number
      inputTokens: number
      outputTokens: number
    }>()

    // 사용자별 데이터
    const userStats: Array<{
      name: string
      totalCost: number
      totalTokens: number
    }> = []

    // 모델별 사용량
    const modelMap = new Map<string, { cost: number; tokens: number }>()

    reports.forEach(report => {
      const { mergedData } = report.rawData || {}

      // 사용자별 통계
      userStats.push({
        name: report.reporterName || report.period || 'Unknown',
        totalCost: report.summary?.totalCost || 0,
        totalTokens: report.summary?.totalTokens || 0,
      })

      // 일별 데이터 합산
      if (mergedData?.daily && Array.isArray(mergedData.daily)) {
        mergedData.daily.forEach((day: any) => {
          const existing = dailyMap.get(day.date)
          if (existing) {
            existing.totalCost += day.totalCost || 0
            existing.totalTokens += day.totalTokens || 0
            existing.inputTokens += day.inputTokens || 0
            existing.outputTokens += day.outputTokens || 0
          } else {
            dailyMap.set(day.date, {
              date: day.date,
              totalCost: day.totalCost || 0,
              totalTokens: day.totalTokens || 0,
              inputTokens: day.inputTokens || 0,
              outputTokens: day.outputTokens || 0,
            })
          }

          // 모델별 통계
          if (day.modelBreakdowns && Array.isArray(day.modelBreakdowns)) {
            day.modelBreakdowns.forEach((model: any) => {
              const existing = modelMap.get(model.modelName)
              const tokens = (model.inputTokens || 0) + (model.outputTokens || 0) +
                           (model.cacheCreationTokens || 0) + (model.cacheReadTokens || 0)
              if (existing) {
                existing.cost += model.cost || 0
                existing.tokens += tokens
              } else {
                modelMap.set(model.modelName, {
                  cost: model.cost || 0,
                  tokens: tokens,
                })
              }
            })
          }
        })
      }
    })

    // 날짜순 정렬
    const dailyData = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // 모델별 데이터 배열로 변환
    const modelData = Array.from(modelMap.entries()).map(([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.cost - a.cost)

    // 전체 합계
    const totals = {
      totalCost: userStats.reduce((sum, u) => sum + u.totalCost, 0),
      totalTokens: userStats.reduce((sum, u) => sum + u.totalTokens, 0),
    }

    return NextResponse.json({
      dailyData,
      userStats,
      modelData,
      totals,
    })

  } catch (error) {
    console.error('[Stats] 에러:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
