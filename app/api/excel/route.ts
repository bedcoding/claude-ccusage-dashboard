import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getReportsByIds } from '@/lib/db'

// 선택한 리포트들로 엑셀 파일 생성
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

    // 선택한 리포트들 조회
    const reports = await getReportsByIds(reportIds)

    if (reports.length === 0) {
      return NextResponse.json(
        { error: '리포트를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 엑셀 시트 데이터 생성
    const mergedSheetData: any[] = []
    const detailData: any[] = []
    const summaryData: any[] = []

    // 각 리포트의 데이터 합치기
    reports.forEach(report => {
      const { mergedData, teamData } = report.rawData

      // 전체 통합 시트
      if (mergedData && mergedData.daily && Array.isArray(mergedData.daily)) {
        mergedSheetData.push({ '기간': report.period })
        mergedData.daily.forEach((day: any) => {
          mergedSheetData.push({
            'date': day.date,
            'inputTokens': day.inputTokens,
            'outputTokens': day.outputTokens,
            'cacheCreationTokens': day.cacheCreationTokens,
            'cacheReadTokens': day.cacheReadTokens,
            'totalTokens': day.totalTokens,
            'totalCost': day.totalCost.toFixed(2),
            'modelsUsed': day.modelsUsed?.join(', ') || ''
          })

          if (day.modelBreakdowns && Array.isArray(day.modelBreakdowns)) {
            day.modelBreakdowns.forEach((model: any) => {
              mergedSheetData.push({
                'date': '',
                'inputTokens': model.inputTokens,
                'outputTokens': model.outputTokens,
                'cacheCreationTokens': model.cacheCreationTokens,
                'cacheReadTokens': model.cacheReadTokens,
                'totalTokens': model.inputTokens + model.outputTokens + model.cacheCreationTokens + model.cacheReadTokens,
                'totalCost': model.cost.toFixed(2),
                'modelsUsed': `  └ ${model.modelName}`
              })
            })
          }
        })

        if (mergedData.totals) {
          mergedSheetData.push({
            'date': '전체 총계',
            'inputTokens': mergedData.totals.inputTokens,
            'outputTokens': mergedData.totals.outputTokens,
            'cacheCreationTokens': mergedData.totals.cacheCreationTokens,
            'cacheReadTokens': mergedData.totals.cacheReadTokens,
            'totalTokens': mergedData.totals.totalTokens,
            'totalCost': mergedData.totals.totalCost.toFixed(2),
            'modelsUsed': ''
          })
        }
        mergedSheetData.push({}) // 빈 줄
      }

      // 파일별 상세
      detailData.push({ '기간': report.period })
      if (teamData && Array.isArray(teamData)) {
        teamData.forEach((member: any) => {
          if (member.data?.daily && Array.isArray(member.data.daily)) {
            member.data.daily.forEach((day: any) => {
              detailData.push({
                '파일명': member.name,
                'date': day.date,
                'inputTokens': day.inputTokens,
                'outputTokens': day.outputTokens,
                'cacheCreationTokens': day.cacheCreationTokens,
                'cacheReadTokens': day.cacheReadTokens,
                'totalTokens': day.totalTokens,
                'totalCost': day.totalCost.toFixed(2),
                'modelsUsed': day.modelsUsed?.join(', ') || ''
              })

              if (day.modelBreakdowns && Array.isArray(day.modelBreakdowns)) {
                day.modelBreakdowns.forEach((model: any) => {
                  detailData.push({
                    '파일명': '',
                    'date': '',
                    'inputTokens': model.inputTokens,
                    'outputTokens': model.outputTokens,
                    'cacheCreationTokens': model.cacheCreationTokens,
                    'cacheReadTokens': model.cacheReadTokens,
                    'totalTokens': model.inputTokens + model.outputTokens + model.cacheCreationTokens + model.cacheReadTokens,
                    'totalCost': model.cost.toFixed(2),
                    'modelsUsed': `  └ ${model.modelName}`
                  })
                })
              }
            })
          }

          if (member.data?.totals) {
            detailData.push({
              '파일명': `${member.name} 총계`,
              'date': '',
              'inputTokens': member.data.totals.inputTokens,
              'outputTokens': member.data.totals.outputTokens,
              'cacheCreationTokens': member.data.totals.cacheCreationTokens,
              'cacheReadTokens': member.data.totals.cacheReadTokens,
              'totalTokens': member.data.totals.totalTokens,
              'totalCost': member.data.totals.totalCost.toFixed(2),
              'modelsUsed': ''
            })
          }
          detailData.push({})
        })
      }
      detailData.push({}) // 빈 줄
    })

    // 요약 (전체 리포트의 요약)
    reports.forEach(report => {
      summaryData.push({ '기간': report.period })
      if (report.summary?.members && Array.isArray(report.summary.members)) {
        report.summary.members.forEach((member: any) => {
          summaryData.push({
            '파일명': member.name,
            'totalCost': member.cost.toFixed(2),
            'totalTokens': member.tokens,
            'percentage': member.percentage.toFixed(1)
          })
        })
      }
      summaryData.push({}) // 빈 줄
    })

    // 엑셀 파일 생성
    const wb = XLSX.utils.book_new()

    if (mergedSheetData.length > 0) {
      const wsMerged = XLSX.utils.json_to_sheet(mergedSheetData)
      XLSX.utils.book_append_sheet(wb, wsMerged, '전체 통합')
    }

    const wsDetail = XLSX.utils.json_to_sheet(detailData)
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)

    XLSX.utils.book_append_sheet(wb, wsDetail, '파일별 상세')
    XLSX.utils.book_append_sheet(wb, wsSummary, '요약')

    // Buffer로 변환
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    const buffer = Buffer.from(excelBuffer)
    const filename = `Claude_Usage_${new Date().toISOString().split('T')[0]}.xlsx`

    // 파일 응답
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('[Excel] 에러:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
