import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const slackToken = formData.get('slackToken') as string
    const channelId = formData.get('channelId') as string
    const file = formData.get('file') as Blob
    const comment = formData.get('comment') as string

    if (!slackToken || !channelId || !file) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Slack API 호출
    const slackFormData = new FormData()
    slackFormData.append('file', file)
    slackFormData.append('channels', channelId)
    slackFormData.append('initial_comment', comment)

    const response = await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackToken}`
      },
      body: slackFormData
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
