import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

// 월별 대시보드 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || new Date().getFullYear().toString()
    const month = searchParams.get('month') || (new Date().getMonth() + 1).toString().padStart(2, '0')
    const team = searchParams.get('team') || null
    const member = searchParams.get('member') || null

    const pool = getPool()

    // 해당 월의 모든 리포트 조회 (period 필드에서 월 추출)
    // period 형식: "20260201 ~ 20260228" 또는 "YYYYMMDD ~ YYYYMMDD"
    const yearMonth = `${year}${month.padStart(2, '0')}`

    let query = `
      SELECT id, reporter_name, team_name, period, raw_data, summary, created_at
      FROM reports
      WHERE period LIKE $1
    `
    const params: any[] = [`${yearMonth}%`]

    if (team) {
      query += ` AND team_name = $${params.length + 1}`
      params.push(team)
    }

    if (member) {
      query += ` AND reporter_name = $${params.length + 1}`
      params.push(member)
    }

    query += ` ORDER BY created_at DESC`

    const result = await pool.query(query, params)

    // 팀 목록 조회
    const teamsResult = await pool.query(`
      SELECT DISTINCT team_name
      FROM reports
      WHERE team_name IS NOT NULL AND team_name != ''
      ORDER BY team_name
    `)
    const teams = teamsResult.rows.map(r => r.team_name)

    if (result.rows.length === 0) {
      return NextResponse.json({
        teams,
        summary: {
          totalCost: 0,
          totalTokens: 0,
          totalMembers: 0,
          inputTokens: 0,
          outputTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
        },
        dailyData: [],
        modelData: [],
        memberData: [],
      })
    }

    // 데이터 집계
    const dailyMap = new Map<string, {
      date: string
      totalCost: number
      totalTokens: number
      inputTokens: number
      outputTokens: number
      cacheCreationTokens: number
      cacheReadTokens: number
    }>()

    const modelMap = new Map<string, {
      cost: number
      totalTokens: number
      inputTokens: number
      outputTokens: number
      cacheCreationTokens: number
      cacheReadTokens: number
      requestCount: number
    }>()

    const memberMap = new Map<string, {
      name: string
      teamName: string
      cost: number
      totalTokens: number
      inputTokens: number
      outputTokens: number
      cacheCreationTokens: number
      cacheReadTokens: number
    }>()

    let totalSummary = {
      totalCost: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    }

    const memberSet = new Set<string>()

    result.rows.forEach(report => {
      const { mergedData } = report.raw_data || {}
      const summary = report.summary || {}
      const totals = mergedData?.totals || {}
      const reporterName = report.reporter_name || 'Unknown'
      const teamName = report.team_name || 'Unknown'

      memberSet.add(`${teamName}:${reporterName}`)

      // 토큰 상세는 mergedData.totals에서 가져옴
      const inputTokens = totals.inputTokens || 0
      const outputTokens = totals.outputTokens || 0
      const cacheCreationTokens = totals.cacheCreationTokens || 0
      const cacheReadTokens = totals.cacheReadTokens || 0

      // 멤버별 집계
      const memberKey = `${teamName}:${reporterName}`
      const existingMember = memberMap.get(memberKey)
      if (existingMember) {
        existingMember.cost += summary.totalCost || 0
        existingMember.totalTokens += summary.totalTokens || 0
        existingMember.inputTokens += inputTokens
        existingMember.outputTokens += outputTokens
        existingMember.cacheCreationTokens += cacheCreationTokens
        existingMember.cacheReadTokens += cacheReadTokens
      } else {
        memberMap.set(memberKey, {
          name: reporterName,
          teamName: teamName,
          cost: summary.totalCost || 0,
          totalTokens: summary.totalTokens || 0,
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          cacheCreationTokens: cacheCreationTokens,
          cacheReadTokens: cacheReadTokens,
        })
      }

      // 일별 데이터 집계
      if (mergedData?.daily && Array.isArray(mergedData.daily)) {
        mergedData.daily.forEach((day: any) => {
          const existing = dailyMap.get(day.date)
          if (existing) {
            existing.totalCost += day.totalCost || 0
            existing.totalTokens += day.totalTokens || 0
            existing.inputTokens += day.inputTokens || 0
            existing.outputTokens += day.outputTokens || 0
            existing.cacheCreationTokens += day.cacheCreationTokens || 0
            existing.cacheReadTokens += day.cacheReadTokens || 0
          } else {
            dailyMap.set(day.date, {
              date: day.date,
              totalCost: day.totalCost || 0,
              totalTokens: day.totalTokens || 0,
              inputTokens: day.inputTokens || 0,
              outputTokens: day.outputTokens || 0,
              cacheCreationTokens: day.cacheCreationTokens || 0,
              cacheReadTokens: day.cacheReadTokens || 0,
            })
          }

          // 모델별 집계
          if (day.modelBreakdowns && Array.isArray(day.modelBreakdowns)) {
            day.modelBreakdowns.forEach((model: any) => {
              const existing = modelMap.get(model.modelName)
              const tokens = (model.inputTokens || 0) + (model.outputTokens || 0) +
                           (model.cacheCreationTokens || 0) + (model.cacheReadTokens || 0)
              if (existing) {
                existing.cost += model.cost || 0
                existing.totalTokens += tokens
                existing.inputTokens += model.inputTokens || 0
                existing.outputTokens += model.outputTokens || 0
                existing.cacheCreationTokens += model.cacheCreationTokens || 0
                existing.cacheReadTokens += model.cacheReadTokens || 0
                existing.requestCount += 1
              } else {
                modelMap.set(model.modelName, {
                  cost: model.cost || 0,
                  totalTokens: tokens,
                  inputTokens: model.inputTokens || 0,
                  outputTokens: model.outputTokens || 0,
                  cacheCreationTokens: model.cacheCreationTokens || 0,
                  cacheReadTokens: model.cacheReadTokens || 0,
                  requestCount: 1,
                })
              }
            })
          }
        })
      }

      // 전체 요약 집계
      totalSummary.totalCost += summary.totalCost || 0
      totalSummary.totalTokens += summary.totalTokens || 0
      totalSummary.inputTokens += inputTokens
      totalSummary.outputTokens += outputTokens
      totalSummary.cacheCreationTokens += cacheCreationTokens
      totalSummary.cacheReadTokens += cacheReadTokens
    })

    // 날짜순 정렬
    const dailyData = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    // 모델별 데이터 (비용 내림차순)
    const modelData = Array.from(modelMap.entries()).map(([name, data]) => ({
      name,
      ...data,
      percentage: totalSummary.totalCost > 0
        ? ((data.cost / totalSummary.totalCost) * 100).toFixed(1)
        : '0',
    })).sort((a, b) => b.cost - a.cost)

    // 멤버별 데이터 (비용 내림차순)
    const memberData = Array.from(memberMap.values())
      .sort((a, b) => b.cost - a.cost)

    return NextResponse.json({
      teams,
      summary: {
        ...totalSummary,
        totalMembers: memberSet.size,
      },
      dailyData,
      modelData,
      memberData,
    })

  } catch (error) {
    console.error('[Dashboard] 에러:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
