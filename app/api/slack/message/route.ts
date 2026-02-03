import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP, createRateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting - Slack 메시지는 분당 5회로 제한
  const clientIP = getClientIP(request)
  const rateLimit = checkRateLimit(`slack-message:${clientIP}`, {
    windowMs: 60 * 1000,
    maxRequests: 5
  })

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetTime)
  }

  try {
    const body = await request.json()
    const { slackToken, channelId, text } = body

    if (!slackToken || !channelId || !text) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Slack API 호출 (chat.postMessage)
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channelId,
        text: text
      })
    })

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
