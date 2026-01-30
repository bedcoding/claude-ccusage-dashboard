'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function DownloadPage() {
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileInfo, setFileInfo] = useState<any>(null)

  useEffect(() => {
    fetchFileInfo()
  }, [id])

  const fetchFileInfo = async () => {
    try {
      const res = await fetch(`/api/download/${id}/info`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '파일을 찾을 수 없습니다.')
        return
      }

      setFileInfo(data)
    } catch (err) {
      setError('파일 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/download/${id}`)

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '다운로드에 실패했습니다.')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileInfo.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      alert('다운로드가 완료되었습니다.')
    } catch (err) {
      alert('다운로드에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">파일 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">파일을 찾을 수 없습니다</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const stats = fileInfo.stats

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📊 Claude Max 팀 사용량 리포트
          </h1>
          <p className="text-gray-500 text-sm">
            생성 시간: {new Date(fileInfo.createdAt).toLocaleString('ko-KR')}
          </p>
        </div>

        {/* 통계 정보 */}
        {stats && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📈 요약</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">총 비용</div>
                <div className="text-2xl font-bold text-blue-600">${stats.totalCost.toFixed(2)}</div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">총 토큰</div>
                <div className="text-2xl font-bold text-green-600">
                  {(stats.totalTokens / 1000000).toFixed(1)}M
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">파일 개수</div>
                <div className="text-2xl font-bold text-purple-600">{stats.totalMembers}</div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">기간</div>
                <div className="text-xs font-semibold text-orange-600">
                  {stats.period || '최근 1주일'}
                </div>
              </div>
            </div>

            {/* 팀원별 통계 */}
            {stats.members && stats.members.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">👥 팀원별 사용량</h3>
                <div className="space-y-2">
                  {stats.members.map((member: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{member.name}</div>
                        <div className="text-sm text-gray-500">
                          {((member.tokens || 0) / 1000000).toFixed(2)}M 토큰
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">${member.cost.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{member.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 다운로드 버튼 */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📥 엑셀 파일 다운로드</h2>
          <p className="text-gray-600 mb-6">
            파일명: <span className="font-mono text-sm">{fileInfo.filename}</span>
          </p>
          <button
            onClick={handleDownload}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            다운로드
          </button>
          <p className="text-sm text-gray-500 mt-4">
            최대 5개의 파일이 보관되며, 새 파일 생성 시 가장 오래된 파일이 삭제됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
