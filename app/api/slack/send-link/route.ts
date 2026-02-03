import { NextRequest, NextResponse } from 'next/server'
import { REPORTS_URL } from '@/lib/constants'
import { checkRateLimit, getClientIP, createRateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting - 링크 전송은 분당 3회로 제한
  const clientIP = getClientIP(request)
  const rateLimit = checkRateLimit(`slack-link:${clientIP}`, {
    windowMs: 60 * 1000,
    maxRequests: 3
  })

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetTime)
  }

  try {
    const body = await request.json()
    const { slackToken, channelId, customMessage } = body

    if (!slackToken || !channelId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const reportsUrl = REPORTS_URL

    const message = customMessage || `📊 Claude Max 팀 사용량 리포트가 작성되었습니다.\n📥 리포트 확인하기: ${reportsUrl}`

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
