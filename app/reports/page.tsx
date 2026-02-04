'use client'

import { useEffect, useState, useMemo } from 'react'
import StatsDashboard from '@/components/StatsDashboard'

type SortBy = 'date' | 'name' | 'cost'
type SortOrder = 'asc' | 'desc'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statsModalOpen, setStatsModalOpen] = useState(false)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
  const limit = 100

  // 정렬 및 필터 상태
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [teamFilter, setTeamFilter] = useState<string>('')
  const [nameFilter, setNameFilter] = useState<string>('')
  const [dateStart, setDateStart] = useState<string>('')
  const [dateEnd, setDateEnd] = useState<string>('')

  useEffect(() => {
    fetchReports()
  }, [currentPage])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?page=${currentPage}&limit=${limit}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '리포트를 불러오는데 실패했습니다.')
        return
      }

      setReports(data.reports)
      setTotalPages(data.totalPages)
      setTotal(data.total)
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

  const handleDownloadExcel = async (type: 'merged' | 'individual') => {
    if (selectedIds.length === 0) {
      alert('다운로드할 리포트를 선택하세요.')
      return
    }

    console.log('[Download] 선택된 엑셀: ', selectedIds)
    console.log('[Download] 리포트 개수: ', selectedIds.length)

    try {
      const res = await fetch('/api/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds: selectedIds, type })
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
      const suffix = type === 'merged' ? '통합' : '사람별'
      a.download = `Claude_Usage_${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('다운로드에 실패했습니다.')
    }
  }

  // 유니크한 팀명 목록 추출
  const uniqueTeams = useMemo(() => {
    const teams = reports
      .map(r => r.teamName)
      .filter((team): team is string => !!team)
    return [...new Set(teams)].sort()
  }, [reports])

  // 유니크한 이름 목록 추출
  const uniqueNames = useMemo(() => {
    const names = reports
      .map(r => r.reporterName)
      .filter((name): name is string => !!name)
    return [...new Set(names)].sort()
  }, [reports])

  // period에서 시작 날짜 추출 (YYYYMMDD ~ YYYYMMDD 형식)
  const extractStartDate = (period: string): string => {
    const match = period?.match(/^(\d{8})/)
    return match ? match[1] : ''
  }

  // 필터링 및 정렬된 리포트
  const filteredReports = useMemo(() => {
    let result = [...reports]

    // 팀명 필터
    if (teamFilter) {
      result = result.filter(r => r.teamName === teamFilter)
    }

    // 이름 필터
    if (nameFilter) {
      result = result.filter(r => r.reporterName === nameFilter)
    }

    // 날짜 필터 (period의 시작 날짜 기준)
    if (dateStart) {
      const startNum = dateStart.replace(/-/g, '')
      result = result.filter(r => {
        const periodStart = extractStartDate(r.period)
        return periodStart >= startNum
      })
    }
    if (dateEnd) {
      const endNum = dateEnd.replace(/-/g, '')
      result = result.filter(r => {
        const periodStart = extractStartDate(r.period)
        return periodStart <= endNum
      })
    }

    // 정렬
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = (a.reporterName || '').localeCompare(b.reporterName || '')
          break
        case 'cost':
          comparison = (a.summary?.totalCost || 0) - (b.summary?.totalCost || 0)
          break
        case 'date':
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [reports, teamFilter, nameFilter, dateStart, dateEnd, sortBy, sortOrder])

  // 필터 초기화
  const resetFilters = () => {
    setSortBy('date')
    setSortOrder('desc')
    setTeamFilter('')
    setNameFilter('')
    setDateStart('')
    setDateEnd('')
  }

  const hasActiveFilters = teamFilter || nameFilter || dateStart || dateEnd || sortBy !== 'date' || sortOrder !== 'desc'

  // 팀 > 이름 2단계 그룹화
  const groupedByTeam = useMemo(() => {
    const teamGroups: { [team: string]: { [name: string]: typeof filteredReports } } = {}

    filteredReports.forEach(report => {
      const team = report.teamName || '(팀 없음)'
      const name = report.reporterName || '이름 없음'

      if (!teamGroups[team]) teamGroups[team] = {}
      if (!teamGroups[team][name]) teamGroups[team][name] = []
      teamGroups[team][name].push(report)
    })

    return Object.entries(teamGroups).map(([team, members]) => {
      const memberList = Object.entries(members).map(([name, reports]) => ({
        name,
        reports,
        totalCost: reports.reduce((sum, r) => sum + (r.summary?.totalCost || 0), 0),
        totalTokens: reports.reduce((sum, r) => sum + (r.summary?.totalTokens || 0), 0),
        count: reports.length
      }))

      return {
        team,
        members: memberList,
        totalCost: memberList.reduce((sum, m) => sum + m.totalCost, 0),
        totalTokens: memberList.reduce((sum, m) => sum + m.totalTokens, 0),
        count: memberList.reduce((sum, m) => sum + m.count, 0)
      }
    })
  }, [filteredReports])

  const toggleTeam = (team: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev)
      if (next.has(team)) {
        next.delete(team)
      } else {
        next.add(team)
      }
      return next
    })
  }

  const toggleMember = (key: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedTeams(new Set(groupedByTeam.map(g => g.team)))
    const allMemberKeys: string[] = []
    groupedByTeam.forEach(g => {
      g.members.forEach(m => {
        allMemberKeys.push(`${g.team}-${m.name}`)
      })
    })
    setExpandedMembers(new Set(allMemberKeys))
  }

  const collapseAll = () => {
    setExpandedTeams(new Set())
    setExpandedMembers(new Set())
  }

  // 선택된 리포트들의 통계 합계
  const selectedReports = reports.filter(r => selectedIds.includes(r.id))
  const totalCost = selectedReports.reduce((sum, r) => sum + (r.summary?.totalCost || 0), 0)
  const totalTokens = selectedReports.reduce((sum, r) => sum + (r.summary?.totalTokens || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">리포트를 불러오는 중...</p>
              </div>
            </div>
          </div>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1200px] mx-auto">
        {/* 헤더 */}
        <header className="header">
          <div className="flex items-center justify-between">
            <div>
              <h1>📊 엑셀 다운로드</h1>
              <p>저장된 사용량 데이터를 엑셀 파일로 다운로드합니다</p>
              {totalPages > 1 && (
                <p className="text-sm text-gray-500 mt-1">
                  전체 {total}개 중 {reports.length}개 표시 (페이지 {currentPage}/{totalPages})
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadExcel('merged')}
                disabled={selectedIds.length === 0}
                className={`font-bold py-3 px-4 rounded-lg transition-colors ${
                  selectedIds.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                title="선택한 리포트들의 데이터를 날짜별로 합산하여 다운로드"
              >
                📥 통합 다운로드
              </button>
              <button
                onClick={() => handleDownloadExcel('individual')}
                disabled={selectedIds.length === 0}
                className={`font-bold py-3 px-4 rounded-lg transition-colors ${
                  selectedIds.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                title="선택한 리포트들을 사람별로 시트를 나눠서 다운로드"
              >
                📊 사람별 다운로드
              </button>
              <button
                onClick={() => setStatsModalOpen(true)}
                disabled={selectedIds.length === 0}
                className={`font-bold py-3 px-4 rounded-lg transition-colors ${
                  selectedIds.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
                title="선택한 리포트들의 통계를 차트로 확인"
              >
                📈 통계 보기
              </button>
            </div>
          </div>

          {/* 선택된 리포트 통계 */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-bold text-gray-700 mb-2">
                선택된 리포트 합계
              </p>
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
        </header>

        {/* 필터 및 정렬 */}
        <div id="report-list" className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div className="flex flex-wrap items-end gap-4">
              {/* 정렬 */}
              <div className="flex gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">정렬</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">날짜순</option>
                    <option value="name">이름순</option>
                    <option value="cost">비용순</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">순서</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">내림차순</option>
                    <option value="asc">오름차순</option>
                  </select>
                </div>
              </div>

              {/* 팀명 필터 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">팀명</label>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                >
                  <option value="">전체</option>
                  {uniqueTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* 이름 필터 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">이름</label>
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                >
                  <option value="">전체</option>
                  {uniqueNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* 날짜 필터 */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">시작일</label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">종료일</label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 초기화 버튼 */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕ 초기화
                </button>
              )}
            </div>

            {/* 필터 결과 및 그룹 제어 */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {filteredReports.length === reports.length
                  ? `전체 ${reports.length}개`
                  : `${reports.length}개 중 ${filteredReports.length}개 표시`}
                {groupedByTeam.length > 0 && ` (${groupedByTeam.length}팀)`}
              </div>
              {groupedByTeam.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                  >
                    전체 펼치기
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                  >
                    전체 접기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 리포트 목록 */}
        <div className="space-y-4">
          {filteredReports.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-gray-400 text-4xl mb-2">🔍</div>
              <p className="text-gray-600">필터 조건에 맞는 리포트가 없습니다.</p>
              <button
                onClick={resetFilters}
                className="mt-3 text-blue-500 hover:text-blue-600 text-sm"
              >
                필터 초기화
              </button>
            </div>
          )}
          {groupedByTeam.map((teamGroup) => {
            const isTeamExpanded = expandedTeams.has(teamGroup.team)
            const allTeamReports = teamGroup.members.flatMap(m => m.reports)

            return (
              <div key={teamGroup.team} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* 팀 헤더 */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors bg-gradient-to-r from-slate-50 to-white"
                  onClick={() => toggleTeam(teamGroup.team)}
                >
                  <div className="flex items-center gap-4">
                    {/* 팀 전체 선택 체크박스 */}
                    <input
                      type="checkbox"
                      checked={allTeamReports.every(r => selectedIds.includes(r.id))}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => {
                        const allSelected = allTeamReports.every(r => selectedIds.includes(r.id))
                        if (allSelected) {
                          setSelectedIds(prev => prev.filter(id => !allTeamReports.some(r => r.id === id)))
                        } else {
                          setSelectedIds(prev => [...new Set([...prev, ...allTeamReports.map(r => r.id)])])
                        }
                      }}
                      className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                    />

                    {/* 펼치기/접기 아이콘 */}
                    <span className={`text-gray-400 transition-transform ${isTeamExpanded ? 'rotate-90' : ''}`}>
                      ▶
                    </span>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏢</span>
                        <h2 className="text-lg font-bold text-gray-800">
                          {teamGroup.team}
                        </h2>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {teamGroup.members.length}명
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {teamGroup.count}개
                        </span>
                      </div>
                    </div>

                    {/* 팀 합계 통계 */}
                    <div className="flex gap-4 text-sm">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">총 비용</div>
                        <div className="font-bold text-blue-600">${teamGroup.totalCost.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">총 토큰</div>
                        <div className="font-bold text-green-600">{(teamGroup.totalTokens / 1000000).toFixed(1)}M</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 멤버 목록 (팀이 펼쳐진 경우) */}
                {isTeamExpanded && (
                  <div className="border-t">
                    {teamGroup.members.map((member) => {
                      const memberKey = `${teamGroup.team}-${member.name}`
                      const isMemberExpanded = expandedMembers.has(memberKey)

                      return (
                        <div key={member.name} className="border-b last:border-b-0">
                          {/* 멤버 헤더 */}
                          <div
                            className="p-3 pl-12 cursor-pointer hover:bg-gray-50 transition-colors bg-gray-50"
                            onClick={() => toggleMember(memberKey)}
                          >
                            <div className="flex items-center gap-4">
                              {/* 멤버 전체 선택 체크박스 */}
                              <input
                                type="checkbox"
                                checked={member.reports.every(r => selectedIds.includes(r.id))}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => {
                                  const allSelected = member.reports.every(r => selectedIds.includes(r.id))
                                  if (allSelected) {
                                    setSelectedIds(prev => prev.filter(id => !member.reports.some(r => r.id === id)))
                                  } else {
                                    setSelectedIds(prev => [...new Set([...prev, ...member.reports.map(r => r.id)])])
                                  }
                                }}
                                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                              />

                              {/* 펼치기/접기 아이콘 */}
                              <span className={`text-gray-400 text-sm transition-transform ${isMemberExpanded ? 'rotate-90' : ''}`}>
                                ▶
                              </span>

                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span>👤</span>
                                  <h3 className="font-semibold text-gray-700">
                                    {member.name}
                                  </h3>
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                                    {member.count}개
                                  </span>
                                </div>
                              </div>

                              {/* 멤버 통계 */}
                              <div className="flex gap-4 text-sm">
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">비용</div>
                                  <div className="font-bold text-blue-600">${member.totalCost.toFixed(2)}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">토큰</div>
                                  <div className="font-bold text-green-600">{(member.totalTokens / 1000000).toFixed(1)}M</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 개별 리포트 (멤버가 펼쳐진 경우) */}
                          {isMemberExpanded && (
                            <div className="bg-white">
                              {member.reports.map((report, idx) => (
                                <div
                                  key={report.id}
                                  className={`p-3 pl-20 ${idx > 0 ? 'border-t border-gray-100' : ''} ${
                                    selectedIds.includes(report.id) ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(report.id)}
                                      onChange={() => toggleSelection(report.id)}
                                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className="font-medium text-gray-800">
                                            {report.period}
                                          </span>
                                          <span className="ml-2 text-xs text-gray-500">
                                            {new Date(report.createdAt).toLocaleString('ko-KR')}
                                          </span>
                                        </div>

                                        {/* 개별 통계 */}
                                        {report.summary && (
                                          <div className="flex gap-3 text-sm">
                                            <span className="text-blue-600 font-medium">
                                              ${report.summary.totalCost?.toFixed(2)}
                                            </span>
                                            <span className="text-green-600 font-medium">
                                              {((report.summary.totalTokens || 0) / 1000000).toFixed(1)}M
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 페이징 */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
              }`}
            >
              처음
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
              }`}
            >
              이전
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                    pageNum === currentPage
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
              }`}
            >
              다음
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow-md'
              }`}
            >
              마지막
            </button>
          </div>
        )}

        {/* 안내 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="mb-2">💡 <strong>사용 방법:</strong> 원하는 리포트를 체크박스로 선택한 후 다운로드 버튼을 클릭하세요.</p>
          <ul className="ml-4 space-y-1">
            <li>• <strong>통합 다운로드:</strong> 선택한 리포트들의 데이터를 날짜별로 합산하여 하나의 시트로 다운로드</li>
            <li>• <strong>사람별 다운로드:</strong> 선택한 리포트별로 각각 시트를 나눠서 다운로드</li>
            <li>• <strong>통계 보기:</strong> 선택한 리포트들의 비용/토큰 사용량을 차트로 확인</li>
          </ul>
        </div>
      </div>

      {/* 통계 모달 */}
      <StatsDashboard
        selectedIds={selectedIds}
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
      />
    </div>
  )
}
