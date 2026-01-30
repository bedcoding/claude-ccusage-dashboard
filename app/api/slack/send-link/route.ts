import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { saveReport } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slackToken, channelId, stats, mergedData, teamData, customSince, customUntil, weekDates, userName } = body

    if (!slackToken || !channelId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

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

    // 고정 URL (항상 같은 링크)
    const reportsUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://claude-ccusage-dashboard.vercel.app'}/reports`

    // 통계 메시지 생성
    const message = `📊 *Claude Max 팀 사용량 리포트 생성 완료*

💰 총 비용: *$${stats?.totalCost.toFixed(2)}*
🎯 총 토큰: *${((stats?.totalTokens || 0) / 1000000).toFixed(1)}M*
📁 파일 개수: *${stats?.totalMembers}개*
📅 기간: ${customSince || weekDates.since} ~ ${customUntil || weekDates.until}

📥 *모든 리포트 보기:* ${reportsUrl}

_최근 5개의 리포트를 확인할 수 있습니다._`

    // Slack 메시지 전송
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channelId,
        text: message
      })
    })

    const result = await response.json()

    // Slack 전송 실패해도 URL은 반환
    if (result.ok) {
      return NextResponse.json({
        ok: true,
        reportId,
        reportsUrl,
        slackSent: true
      })
    } else {
      return NextResponse.json({
        ok: true, // URL은 성공적으로 생성됨
        reportId,
        reportsUrl,
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
