import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { randomUUID } from 'crypto'
import { saveFile } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slackToken, channelId, stats, mergedData, teamData, customSince, customUntil, weekDates } = body

    if (!slackToken || !channelId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 엑셀 파일 생성 (기존 로직 재사용)
    const mergedSheetData: any[] = []
    if (mergedData) {
      mergedData.daily.forEach((day: any) => {
        mergedSheetData.push({
          'date': day.date,
          'inputTokens': day.inputTokens,
          'outputTokens': day.outputTokens,
          'cacheCreationTokens': day.cacheCreationTokens,
          'cacheReadTokens': day.cacheReadTokens,
          'totalTokens': day.totalTokens,
          'totalCost': day.totalCost.toFixed(2),
          'modelsUsed': day.modelsUsed.join(', ')
        })

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
      })

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

    const detailData: any[] = []
    teamData.forEach((member: any) => {
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
          'modelsUsed': day.modelsUsed.join(', ')
        })

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
      })

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
      detailData.push({})
    })

    const summaryData = stats?.members.map((member: any) => ({
      '파일명': member.name,
      'totalCost': member.cost.toFixed(2),
      'totalTokens': member.tokens,
      'percentage': member.percentage.toFixed(1)
    }))

    const wb = XLSX.utils.book_new()

    if (mergedData) {
      const wsMerged = XLSX.utils.json_to_sheet(mergedSheetData)
      XLSX.utils.book_append_sheet(wb, wsMerged, '전체 통합')
    }

    const wsDetail = XLSX.utils.json_to_sheet(detailData)
    const wsSummary = XLSX.utils.json_to_sheet(summaryData || [])

    XLSX.utils.book_append_sheet(wb, wsDetail, '파일별 상세')
    XLSX.utils.book_append_sheet(wb, wsSummary, '요약')

    // Buffer로 변환
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
    const buffer = Buffer.from(excelBuffer)
    const filename = `Claude_Usage_${new Date().toISOString().split('T')[0]}.xlsx`

    // DB에 파일 저장
    const fileId = randomUUID()
    await saveFile(
      fileId,
      buffer,
      filename,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    // 다운로드 링크 생성
    const downloadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://claude-ccusage-dashboard.vercel.app'}/api/download/${fileId}`

    // 통계 메시지 생성
    const summary = `📊 *Claude Max 팀 사용량 리포트*

💰 총 비용: *$${stats?.totalCost.toFixed(2)}*
🎯 총 토큰: *${((stats?.totalTokens || 0) / 1000000).toFixed(1)}M*
📁 파일 개수: *${stats?.totalMembers}개*
📅 기간: ${customSince || weekDates.since} ~ ${customUntil || weekDates.until}

📥 *엑셀 다운로드:* ${downloadUrl}
⏰ *링크 유효시간:* 5분

_링크는 5분 후 또는 다운로드 후 만료됩니다._`

    // Slack 메시지 전송
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channelId,
        text: summary
      })
    })

    const result = await response.json()

    // Slack 전송 실패해도 URL은 반환
    if (result.ok) {
      return NextResponse.json({
        ok: true,
        fileId,
        downloadUrl,
        expiresIn: '5분',
        slackSent: true
      })
    } else {
      return NextResponse.json({
        ok: true, // URL은 성공적으로 생성됨
        fileId,
        downloadUrl,
        expiresIn: '5분',
        slackSent: false,
        slackError: result.error
      })
    }

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
