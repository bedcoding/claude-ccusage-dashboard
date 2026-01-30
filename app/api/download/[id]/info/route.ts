import { NextRequest, NextResponse } from 'next/server'
import { getFileInfo } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 파일 정보 가져오기 (데이터 제외)
    const fileInfo = await getFileInfo(id)

    if (!fileInfo) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없거나 삭제되었습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      filename: fileInfo.filename,
      stats: fileInfo.stats,
      createdAt: fileInfo.createdAt,
    })

  } catch (error) {
    console.error('[FileInfo] 에러:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
