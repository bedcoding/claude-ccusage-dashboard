'use client'

import { useEffect, useState } from 'react'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '리포트를 불러오는데 실패했습니다.')
        return
      }

      setReports(data.reports)
    } catch (err) {
      setError('리포트를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleDownloadExcel = async () => {
    if (selectedIds.length === 0) {
      alert('다운로드할 리포트를 선택하세요.')
      return
    }

    try {
      const res = await fetch('/api/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds: selectedIds })
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '다운로드에 실패했습니다.')
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Claude_Usage_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('다운로드에 실패했습니다.')
    }
  }

  // 선택된 리포트들의 통계 합계
  const selectedReports = reports.filter(r => selectedIds.includes(r.id))
  const totalCost = selectedReports.reduce((sum, r) => sum + (r.summary?.totalCost || 0), 0)
  const totalTokens = selectedReports.reduce((sum, r) => sum + (r.summary?.totalTokens || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">리포트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">오류 발생</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-gray-400 text-5xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">리포트가 없습니다</h1>
          <p className="text-gray-600">아직 생성된 리포트가 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📊 Claude Max 팀 사용량 리포트
              </h1>
              <p className="text-gray-500">최근 {reports.length}개의 리포트</p>
            </div>
            <button
              onClick={handleDownloadExcel}
              disabled={selectedIds.length === 0}
              className={`font-bold py-3 px-6 rounded-lg transition-colors ${
                selectedIds.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              📥 엑셀 다운로드 ({selectedIds.length}개 선택)
            </button>
          </div>

          {/* 선택된 리포트 통계 */}
          {selectedIds.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-bold text-gray-700 mb-2">선택된 리포트 합계</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">총 비용</div>
                  <div className="text-xl font-bold text-blue-600">${totalCost.toFixed(2)}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 mb-1">총 토큰</div>
                  <div className="text-xl font-bold text-green-600">
                    {(totalTokens / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 리포트 목록 */}
        <div className="space-y-4">
          {reports.map((report, idx) => (
            <div
              key={report.id}
              className={`bg-white rounded-lg shadow-md p-6 transition-all ${
                selectedIds.includes(report.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* 리포트 헤더 */}
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(report.id)}
                  onChange={() => toggleSelection(report.id)}
                  className="mt-1 w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-1">
                    {report.reporterName || `리포트 #${reports.length - idx}`} - {report.period}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleString('ko-KR')}
                  </p>

                  {/* 통계 */}
                  {report.summary && (
                    <div className="mt-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 rounded p-2">
                          <div className="text-xs text-gray-600">비용</div>
                          <div className="text-lg font-bold text-blue-600">
                            ${report.summary.totalCost?.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <div className="text-xs text-gray-600">토큰</div>
                          <div className="text-lg font-bold text-green-600">
                            {((report.summary.totalTokens || 0) / 1000000).toFixed(1)}M
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded p-2">
                          <div className="text-xs text-gray-600">파일</div>
                          <div className="text-lg font-bold text-purple-600">
                            {report.summary.totalMembers}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 안내 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          💡 <strong>사용 방법:</strong> 원하는 리포트를 체크박스로 선택한 후 "엑셀 다운로드" 버튼을 클릭하세요. 선택한 리포트들의 데이터가 합쳐진 엑셀 파일이 다운로드됩니다.
        </div>
      </div>
    </div>
  )
}
