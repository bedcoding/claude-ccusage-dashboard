import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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
