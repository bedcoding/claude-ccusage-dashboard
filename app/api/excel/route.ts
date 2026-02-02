import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getReportsByIds } from '@/lib/db'

// 선택한 리포트들로 엑셀 파일 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportIds, type = 'merged' } = body // type: 'merged' | 'individual'

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

    // 날짜별 데이터 합산을 위한 맵
    const dailyMap: Map<string, {
      inputTokens: number
      outputTokens: number
      cacheCreationTokens: number
      cacheReadTokens: number
      totalTokens: number
      totalCost: number
      modelsUsed: Set<string>
      modelBreakdowns: Map<string, {
        inputTokens: number
        outputTokens: number
        cacheCreationTokens: number
        cacheReadTokens: number
        cost: number
      }>
    }> = new Map()

    // 전체 총계용
    const grandTotals = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
      totalCost: 0
    }

    // 각 리포트의 데이터 합치기
    reports.forEach(report => {
      const { mergedData, teamData } = report.rawData

      // 전체 통합 시트 - 날짜별로 합산
      if (mergedData && mergedData.daily && Array.isArray(mergedData.daily)) {
        mergedData.daily.forEach((day: any) => {
          const existing = dailyMap.get(day.date)
          if (existing) {
            existing.inputTokens += day.inputTokens || 0
            existing.outputTokens += day.outputTokens || 0
            existing.cacheCreationTokens += day.cacheCreationTokens || 0
            existing.cacheReadTokens += day.cacheReadTokens || 0
            existing.totalTokens += day.totalTokens || 0
            existing.totalCost += day.totalCost || 0
            if (day.modelsUsed) {
              day.modelsUsed.forEach((m: string) => existing.modelsUsed.add(m))
            }
            // 모델별 breakdown 합산
            if (day.modelBreakdowns && Array.isArray(day.modelBreakdowns)) {
              day.modelBreakdowns.forEach((model: any) => {
                const existingModel = existing.modelBreakdowns.get(model.modelName)
                if (existingModel) {
                  existingModel.inputTokens += model.inputTokens || 0
                  existingModel.outputTokens += model.outputTokens || 0
                  existingModel.cacheCreationTokens += model.cacheCreationTokens || 0
                  existingModel.cacheReadTokens += model.cacheReadTokens || 0
                  existingModel.cost += model.cost || 0
                } else {
                  existing.modelBreakdowns.set(model.modelName, {
                    inputTokens: model.inputTokens || 0,
                    outputTokens: model.outputTokens || 0,
                    cacheCreationTokens: model.cacheCreationTokens || 0,
                    cacheReadTokens: model.cacheReadTokens || 0,
                    cost: model.cost || 0
                  })
                }
              })
            }
          } else {
            const modelBreakdowns = new Map()
            if (day.modelBreakdowns && Array.isArray(day.modelBreakdowns)) {
              day.modelBreakdowns.forEach((model: any) => {
                modelBreakdowns.set(model.modelName, {
                  inputTokens: model.inputTokens || 0,
                  outputTokens: model.outputTokens || 0,
                  cacheCreationTokens: model.cacheCreationTokens || 0,
                  cacheReadTokens: model.cacheReadTokens || 0,
                  cost: model.cost || 0
                })
              })
            }
            dailyMap.set(day.date, {
              inputTokens: day.inputTokens || 0,
              outputTokens: day.outputTokens || 0,
              cacheCreationTokens: day.cacheCreationTokens || 0,
              cacheReadTokens: day.cacheReadTokens || 0,
              totalTokens: day.totalTokens || 0,
              totalCost: day.totalCost || 0,
              modelsUsed: new Set(day.modelsUsed || []),
              modelBreakdowns
            })
          }
        })

        // 총계 합산
        if (mergedData.totals) {
          grandTotals.inputTokens += mergedData.totals.inputTokens || 0
          grandTotals.outputTokens += mergedData.totals.outputTokens || 0
          grandTotals.cacheCreationTokens += mergedData.totals.cacheCreationTokens || 0
          grandTotals.cacheReadTokens += mergedData.totals.cacheReadTokens || 0
          grandTotals.totalTokens += mergedData.totals.totalTokens || 0
          grandTotals.totalCost += mergedData.totals.totalCost || 0
        }
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

    // 합산된 날짜별 데이터를 mergedSheetData에 추가
    // 날짜순으로 정렬
    const sortedDates = Array.from(dailyMap.keys()).sort()

    sortedDates.forEach(date => {
      const day = dailyMap.get(date)!
      mergedSheetData.push({
        'date': date,
        'inputTokens': day.inputTokens,
        'outputTokens': day.outputTokens,
        'cacheCreationTokens': day.cacheCreationTokens,
        'cacheReadTokens': day.cacheReadTokens,
        'totalTokens': day.totalTokens,
        'totalCost': day.totalCost.toFixed(2),
        'modelsUsed': Array.from(day.modelsUsed).join(', ')
      })

      // 모델별 breakdown 추가
      day.modelBreakdowns.forEach((model, modelName) => {
        mergedSheetData.push({
          'date': '',
          'inputTokens': model.inputTokens,
          'outputTokens': model.outputTokens,
          'cacheCreationTokens': model.cacheCreationTokens,
          'cacheReadTokens': model.cacheReadTokens,
          'totalTokens': model.inputTokens + model.outputTokens + model.cacheCreationTokens + model.cacheReadTokens,
          'totalCost': model.cost.toFixed(2),
          'modelsUsed': `  └ ${modelName}`
        })
      })
    })

    // 전체 총계 추가
    if (grandTotals.totalTokens > 0) {
      mergedSheetData.push({
        'date': '전체 총계',
        'inputTokens': grandTotals.inputTokens,
        'outputTokens': grandTotals.outputTokens,
        'cacheCreationTokens': grandTotals.cacheCreationTokens,
        'cacheReadTokens': grandTotals.cacheReadTokens,
        'totalTokens': grandTotals.totalTokens,
        'totalCost': grandTotals.totalCost.toFixed(2),
        'modelsUsed': ''
      })
    }

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

    if (type === 'individual') {
      // 사람별 다운로드: 각 사람(리포트)별로 시트 생성
      reports.forEach(report => {
        const { mergedData } = report.rawData
        const sheetName = (report.reporterName || report.period || 'Unknown').substring(0, 31) // 시트명 31자 제한
        const sheetData: any[] = []

        if (mergedData && mergedData.daily && Array.isArray(mergedData.daily)) {
          mergedData.daily.forEach((day: any) => {
            sheetData.push({
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
                sheetData.push({
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
            sheetData.push({
              'date': '총계',
              'inputTokens': mergedData.totals.inputTokens,
              'outputTokens': mergedData.totals.outputTokens,
              'cacheCreationTokens': mergedData.totals.cacheCreationTokens,
              'cacheReadTokens': mergedData.totals.cacheReadTokens,
              'totalTokens': mergedData.totals.totalTokens,
              'totalCost': mergedData.totals.totalCost.toFixed(2),
              'modelsUsed': ''
            })
          }
        }

        if (sheetData.length > 0) {
          const ws = XLSX.utils.json_to_sheet(sheetData)
          XLSX.utils.book_append_sheet(wb, ws, sheetName)
        }
      })

      // 전체 요약 시트 추가
      if (summaryData.length > 0) {
        const wsSummary = XLSX.utils.json_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, wsSummary, '전체 요약')
      }
    } else {
      // 통합 다운로드: 기존 로직
      if (mergedSheetData.length > 0) {
        const wsMerged = XLSX.utils.json_to_sheet(mergedSheetData)
        XLSX.utils.book_append_sheet(wb, wsMerged, '전체 통합')
      }

      const wsDetail = XLSX.utils.json_to_sheet(detailData)
      const wsSummary = XLSX.utils.json_to_sheet(summaryData)

      XLSX.utils.book_append_sheet(wb, wsDetail, '파일별 상세')
      XLSX.utils.book_append_sheet(wb, wsSummary, '요약')
    }

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
