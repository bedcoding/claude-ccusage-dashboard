import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slackToken, channelId } = body

    if (!slackToken || !channelId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 고정 URL
    const reportsUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reports`

    // 간단한 알림 메시지
    const message = `📊 *Claude Max 팀 사용량 리포트*

📥 *리포트 확인하기:* ${reportsUrl}

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

    if (result.ok) {
      return NextResponse.json({
        ok: true,
        reportsUrl,
        slackSent: true
      })
    } else {
      return NextResponse.json({
        ok: false,
        slackSent: false,
        error: result.error
      })
    }

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
