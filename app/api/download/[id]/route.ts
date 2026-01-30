import { NextRequest, NextResponse } from 'next/server'
import { getFile, deleteFile, cleanupExpiredFiles } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 만료된 파일 정리 (다운로드 시 자동 정리)
    await cleanupExpiredFiles()

    // DB에서 파일 가져오기
    const file = await getFile(id)

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없거나 만료되었습니다.' },
        { status: 404 }
      )
    }

    // 파일 다운로드 후 즉시 삭제
    await deleteFile(id)

    // 파일 응답 (Buffer를 Uint8Array로 변환)
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`,
        'Content-Length': file.data.length.toString(),
      },
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
