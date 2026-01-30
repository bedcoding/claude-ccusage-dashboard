import { NextRequest, NextResponse } from 'next/server'
import { fileStore } from '@/lib/fileStore'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 파일 가져오기
    const file = fileStore.get(id)

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없거나 만료되었습니다.' },
        { status: 404 }
      )
    }

    // 파일 다운로드 후 즉시 삭제
    fileStore.delete(id)

    // 파일 응답
    return new NextResponse(file.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
        'Content-Length': file.buffer.length.toString(),
      },
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
