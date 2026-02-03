'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import * as XLSX from 'xlsx'

interface DailyDetail {
  date: string
  totalCost: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
}

interface DashboardData {
  teams: string[]
  summary: {
    totalCost: number
    totalTokens: number
    totalMembers: number
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
  }
  dailyData: DailyDetail[]
  modelData: Array<{
    name: string
    cost: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
    percentage: string
    requestCount: number
  }>
  memberData: Array<{
    name: string
    teamName: string
    cost: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
    cacheCreationTokens: number
    cacheReadTokens: number
  }>
}

// 저번 달 계산
const getLastMonth = () => {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  if (currentMonth === 1) {
    return { year: now.getFullYear() - 1, month: 12 }
  }
  return { year: now.getFullYear(), month: currentMonth - 1 }
}

export default function DashboardPage() {
  const lastMonth = getLastMonth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState<'team' | 'member'>('team')
  const [selectedYear, setSelectedYear] = useState(lastMonth.year)
  const [selectedMonth, setSelectedMonth] = useState(lastMonth.month)
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [selectedMember, setSelectedMember] = useState<string>('')
  const [detailMember, setDetailMember] = useState<{ name: string; teamName: string } | null>(null)
  const [memberDetail, setMemberDetail] = useState<DashboardData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedMonth, selectedTeam])

  useEffect(() => {
    if (detailMember) {
      fetchMemberDetail(detailMember.name, detailMember.teamName)
    }
  }, [detailMember, selectedYear, selectedMonth])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString().padStart(2, '0'),
      })
      if (selectedTeam) {
        params.set('team', selectedTeam)
      }

      const res = await fetch(`/api/dashboard?${params}`)
      const result = await res.json()
      if (res.ok) {
        setData(result)
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberDetail = async (memberName: string, teamName: string) => {
    setDetailLoading(true)
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString().padStart(2, '0'),
        member: memberName,
        team: teamName,
      })

      const res = await fetch(`/api/dashboard?${params}`)
      const result = await res.json()
      if (res.ok) {
        setMemberDetail(result)
      }
    } catch (err) {
      console.error('멤버 상세 데이터 로드 실패:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleMemberClick = (member: { name: string; teamName: string }) => {
    setDetailMember(member)
    setActiveTab('member')
  }

  const handleBackToList = () => {
    setDetailMember(null)
    setMemberDetail(null)
  }

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const formatCost = (value: number) => `$${value.toFixed(2)}`
  const formatTokens = (value: number) => value.toLocaleString()
  const formatTokensShort = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  // 팀원별 탭에서 멤버 필터링
  const filteredMemberData = useMemo(() => {
    if (!data?.memberData) return []
    if (selectedMember) {
      return data.memberData.filter(m => m.name === selectedMember)
    }
    return data.memberData
  }, [data?.memberData, selectedMember])

  // 멤버 목록 (선택된 팀 기준)
  const memberList = useMemo(() => {
    if (!data?.memberData) return []
    const members = data.memberData
      .filter(m => !selectedTeam || m.teamName === selectedTeam)
      .map(m => m.name)
    return [...new Set(members)]
  }, [data?.memberData, selectedTeam])

  const handleExportExcel = () => {
    if (!data?.memberData) return

    const exportData = filteredMemberData.map((member, idx) => ({
      '#': idx + 1,
      '이름': member.name,
      '비용': member.cost.toFixed(2),
      '총 토큰': member.totalTokens,
      '입력': member.inputTokens,
      '출력': member.outputTokens,
      '캐시생성': member.cacheCreationTokens,
      '캐시읽기': member.cacheReadTokens,
      '팀명': member.teamName,
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '팀원별 사용량')
    XLSX.writeFile(wb, `dashboard_${selectedYear}${selectedMonth.toString().padStart(2, '0')}.xlsx`)
  }

  return (
    <div className="dashboard-container">
      {/* 헤더 */}
      <div className="dashboard-header">
        <h1>대시보드</h1>
        <div className="month-selector">
          <button onClick={handlePrevMonth} className="month-nav-btn">&lt;</button>
          <span className="current-month">{selectedYear}년 {selectedMonth}월</span>
          <button onClick={handleNextMonth} className="month-nav-btn">&gt;</button>
        </div>
      </div>

      {/* 탭 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          팀별
        </button>
        <button
          className={`tab ${activeTab === 'member' ? 'active' : ''}`}
          onClick={() => setActiveTab('member')}
        >
          팀원별
        </button>
      </div>

      {/* 팀 선택 */}
      <div className="filters">
        <div className="filter-group">
          <label>팀 선택</label>
          <select
            value={selectedTeam}
            onChange={(e) => {
              setSelectedTeam(e.target.value)
              setSelectedMember('')
            }}
          >
            <option value="">전체 팀</option>
            {data?.teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {activeTab === 'member' && (
          <div className="filter-group">
            <label>멤버 선택</label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="">전체 멤버 보기</option>
              {memberList.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>데이터 로딩 중...</p>
        </div>
      ) : data ? (
        <>
          {activeTab === 'team' ? (
            <>
              {/* 요약 카드 */}
              <div className="summary-section">
                <h2>{selectedYear}-{selectedMonth.toString().padStart(2, '0')} {selectedTeam || '전체'} 요약</h2>
                <div className="summary-cards">
                  <div className="summary-card blue">
                    <div className="card-label">총 비용</div>
                    <div className="card-value">{formatCost(data.summary.totalCost)}</div>
                  </div>
                  <div className="summary-card green">
                    <div className="card-label">총 토큰</div>
                    <div className="card-value">{formatTokens(data.summary.totalTokens)}</div>
                  </div>
                  <div className="summary-card orange">
                    <div className="card-label">총원 멤버</div>
                    <div className="card-value">{data.summary.totalMembers}명</div>
                  </div>
                </div>
              </div>

              {/* 토큰 상세 */}
              <div className="token-detail">
                <div className="detail-label">토큰 상세</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-name">입력 토큰</span>
                    <span className="detail-value">{formatTokens(data.summary.inputTokens)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-name">출력 토큰</span>
                    <span className="detail-value">{formatTokens(data.summary.outputTokens)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-name highlight-green">캐시 생성</span>
                    <span className="detail-value highlight-green">{formatTokens(data.summary.cacheCreationTokens)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-name highlight-blue">캐시 읽기</span>
                    <span className="detail-value highlight-blue">{formatTokens(data.summary.cacheReadTokens)}</span>
                  </div>
                </div>
              </div>

              {/* 일별 추이 차트 */}
              {data.dailyData.length > 0 && (
                <div className="chart-section">
                  <h3>일별 추이</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value.slice(5)}
                      />
                      <YAxis
                        yAxisId="cost"
                        orientation="left"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <YAxis
                        yAxisId="tokens"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatTokensShort(value)}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          name === '비용 (USD)' ? formatCost(value as number) : formatTokens(value as number),
                          name as string
                        ]}
                        labelFormatter={(label) => `날짜: ${label}`}
                      />
                      <Legend />
                      <Line
                        yAxisId="cost"
                        type="monotone"
                        dataKey="totalCost"
                        name="비용 (USD)"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', r: 3 }}
                      />
                      <Line
                        yAxisId="tokens"
                        type="monotone"
                        dataKey="totalTokens"
                        name="토큰"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 모델별 사용량 */}
              {data.modelData.length > 0 && (
                <div className="table-section">
                  <h3>모델별 사용량</h3>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>모델</th>
                          <th>비용 (USD)</th>
                          <th>비율</th>
                          <th>총 토큰</th>
                          <th>입력</th>
                          <th>출력</th>
                          <th>캐시생성</th>
                          <th>캐시읽기</th>
                          <th>사용횟수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.modelData.map((model, idx) => (
                          <tr key={idx}>
                            <td>{model.name}</td>
                            <td>{formatCost(model.cost)}</td>
                            <td>
                              <div className="percentage-bar">
                                <div
                                  className="percentage-fill"
                                  style={{ width: `${model.percentage}%` }}
                                ></div>
                                <span>{model.percentage}%</span>
                              </div>
                            </td>
                            <td>{formatTokens(model.totalTokens)}</td>
                            <td>{formatTokens(model.inputTokens)}</td>
                            <td>{formatTokens(model.outputTokens)}</td>
                            <td className="highlight-green">{formatTokens(model.cacheCreationTokens)}</td>
                            <td className="highlight-blue">{formatTokens(model.cacheReadTokens)}</td>
                            <td>{model.requestCount}</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td>합계</td>
                          <td>{formatCost(data.summary.totalCost)}</td>
                          <td>100%</td>
                          <td>{formatTokens(data.summary.totalTokens)}</td>
                          <td>{formatTokens(data.summary.inputTokens)}</td>
                          <td>{formatTokens(data.summary.outputTokens)}</td>
                          <td className="highlight-green">{formatTokens(data.summary.cacheCreationTokens)}</td>
                          <td className="highlight-blue">{formatTokens(data.summary.cacheReadTokens)}</td>
                          <td>-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 팀원별 사용량 */}
              {data.memberData.length > 0 && (
                <div className="table-section">
                  <div className="table-header">
                    <div>
                      <h3>팀원별 사용량</h3>
                      <p className="table-subtitle">팀원을 클릭하면 상세 정보를 볼 수 있습니다</p>
                    </div>
                    <button className="export-btn" onClick={handleExportExcel}>
                      Excel 다운로드
                    </button>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>이름</th>
                          <th>비용</th>
                          <th>총 토큰</th>
                          <th>입력</th>
                          <th>출력</th>
                          <th>캐시생성</th>
                          <th>캐시읽기</th>
                          <th>팀명</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.memberData.map((member, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className="member-name" onClick={() => handleMemberClick(member)}>{member.name}</td>
                            <td>{formatCost(member.cost)}</td>
                            <td>{formatTokens(member.totalTokens)}</td>
                            <td>{formatTokens(member.inputTokens)}</td>
                            <td>{formatTokens(member.outputTokens)}</td>
                            <td className="highlight-green">{formatTokens(member.cacheCreationTokens)}</td>
                            <td className="highlight-blue">{formatTokens(member.cacheReadTokens)}</td>
                            <td>{member.teamName}</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td></td>
                          <td>합계</td>
                          <td>{formatCost(data.summary.totalCost)}</td>
                          <td>{formatTokens(data.summary.totalTokens)}</td>
                          <td>{formatTokens(data.summary.inputTokens)}</td>
                          <td>{formatTokens(data.summary.outputTokens)}</td>
                          <td className="highlight-green">{formatTokens(data.summary.cacheCreationTokens)}</td>
                          <td className="highlight-blue">{formatTokens(data.summary.cacheReadTokens)}</td>
                          <td>{data.summary.totalMembers}명</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : detailMember ? (
            /* 멤버 상세 뷰 */
            <>
              {detailLoading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <p>상세 데이터 로딩 중...</p>
                </div>
              ) : memberDetail ? (
                <>
                  {/* 요약 카드 */}
                  <div className="summary-section">
                    <div className="detail-header">
                      <h2>{selectedYear}-{selectedMonth.toString().padStart(2, '0')} {detailMember.name} 요약</h2>
                      <button className="back-btn" onClick={handleBackToList}>
                        전체 멤버 보기
                      </button>
                    </div>
                    <div className="summary-cards two-cols">
                      <div className="summary-card blue">
                        <div className="card-label">총 비용</div>
                        <div className="card-value">{formatCost(memberDetail.summary.totalCost)}</div>
                      </div>
                      <div className="summary-card green">
                        <div className="card-label">총 토큰</div>
                        <div className="card-value">{formatTokens(memberDetail.summary.totalTokens)}</div>
                      </div>
                    </div>
                  </div>

                  {/* 토큰 상세 */}
                  <div className="token-detail">
                    <div className="detail-label">토큰 상세</div>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-name">입력 토큰</span>
                        <span className="detail-value">{formatTokens(memberDetail.summary.inputTokens)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-name">출력 토큰</span>
                        <span className="detail-value">{formatTokens(memberDetail.summary.outputTokens)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-name highlight-green">캐시 생성</span>
                        <span className="detail-value highlight-green">{formatTokens(memberDetail.summary.cacheCreationTokens)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-name highlight-blue">캐시 읽기</span>
                        <span className="detail-value highlight-blue">{formatTokens(memberDetail.summary.cacheReadTokens)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 일별 추이 차트 */}
                  {memberDetail.dailyData.length > 0 && (
                    <div className="chart-section">
                      <h3>일별 추이</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={memberDetail.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => value.slice(5)}
                          />
                          <YAxis
                            yAxisId="cost"
                            orientation="left"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <YAxis
                            yAxisId="tokens"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => formatTokensShort(value)}
                          />
                          <Tooltip
                            formatter={(value, name) => [
                              name === '비용 (USD)' ? formatCost(value as number) : formatTokens(value as number),
                              name as string
                            ]}
                            labelFormatter={(label) => `날짜: ${label}`}
                          />
                          <Legend />
                          <Line
                            yAxisId="cost"
                            type="monotone"
                            dataKey="totalCost"
                            name="비용 (USD)"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ fill: '#3B82F6', r: 3 }}
                          />
                          <Line
                            yAxisId="tokens"
                            type="monotone"
                            dataKey="totalTokens"
                            name="토큰"
                            stroke="#10B981"
                            strokeWidth={2}
                            dot={{ fill: '#10B981', r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* 모델별 사용량 */}
                  {memberDetail.modelData.length > 0 && (
                    <div className="table-section">
                      <h3>모델별 사용량</h3>
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>모델</th>
                              <th>비용 (USD)</th>
                              <th>비율</th>
                              <th>총 토큰</th>
                              <th>입력</th>
                              <th>출력</th>
                              <th>캐시생성</th>
                              <th>캐시읽기</th>
                              <th>사용횟수</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberDetail.modelData.map((model, idx) => (
                              <tr key={idx}>
                                <td>{model.name}</td>
                                <td>{formatCost(model.cost)}</td>
                                <td>
                                  <div className="percentage-bar">
                                    <div
                                      className="percentage-fill"
                                      style={{ width: `${model.percentage}%` }}
                                    ></div>
                                    <span>{model.percentage}%</span>
                                  </div>
                                </td>
                                <td>{formatTokens(model.totalTokens)}</td>
                                <td>{formatTokens(model.inputTokens)}</td>
                                <td>{formatTokens(model.outputTokens)}</td>
                                <td className="highlight-green">{formatTokens(model.cacheCreationTokens)}</td>
                                <td className="highlight-blue">{formatTokens(model.cacheReadTokens)}</td>
                                <td>{model.requestCount}</td>
                              </tr>
                            ))}
                            <tr className="total-row">
                              <td>합계</td>
                              <td>{formatCost(memberDetail.summary.totalCost)}</td>
                              <td>100%</td>
                              <td>{formatTokens(memberDetail.summary.totalTokens)}</td>
                              <td>{formatTokens(memberDetail.summary.inputTokens)}</td>
                              <td>{formatTokens(memberDetail.summary.outputTokens)}</td>
                              <td className="highlight-green">{formatTokens(memberDetail.summary.cacheCreationTokens)}</td>
                              <td className="highlight-blue">{formatTokens(memberDetail.summary.cacheReadTokens)}</td>
                              <td>-</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 일별 상세 사용량 */}
                  {memberDetail.dailyData.length > 0 && (
                    <div className="table-section">
                      <div className="table-header">
                        <div>
                          <h3>일별 상세 사용량</h3>
                        </div>
                        <button className="export-btn" onClick={() => {
                          const exportData = memberDetail.dailyData.map((day) => ({
                            '날짜': day.date,
                            '비용': day.totalCost.toFixed(2),
                            '총 토큰': day.totalTokens,
                            '입력': day.inputTokens,
                            '출력': day.outputTokens,
                            '캐시생성': day.cacheCreationTokens,
                            '캐시읽기': day.cacheReadTokens,
                          }))
                          const ws = XLSX.utils.json_to_sheet(exportData)
                          const wb = XLSX.utils.book_new()
                          XLSX.utils.book_append_sheet(wb, ws, '일별 상세')
                          XLSX.writeFile(wb, `${detailMember.name}_${selectedYear}${selectedMonth.toString().padStart(2, '0')}_daily.xlsx`)
                        }}>
                          Excel 다운로드
                        </button>
                      </div>
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>날짜</th>
                              <th>비용</th>
                              <th>총 토큰</th>
                              <th>입력</th>
                              <th>출력</th>
                              <th>캐시생성</th>
                              <th>캐시읽기</th>
                            </tr>
                          </thead>
                          <tbody>
                            {memberDetail.dailyData.map((day, idx) => (
                              <tr key={idx}>
                                <td>{day.date}</td>
                                <td>{formatCost(day.totalCost)}</td>
                                <td>{formatTokens(day.totalTokens)}</td>
                                <td>{formatTokens(day.inputTokens)}</td>
                                <td>{formatTokens(day.outputTokens)}</td>
                                <td className="highlight-green">{formatTokens(day.cacheCreationTokens)}</td>
                                <td className="highlight-blue">{formatTokens(day.cacheReadTokens)}</td>
                              </tr>
                            ))}
                            <tr className="total-row">
                              <td>합계</td>
                              <td>{formatCost(memberDetail.summary.totalCost)}</td>
                              <td>{formatTokens(memberDetail.summary.totalTokens)}</td>
                              <td>{formatTokens(memberDetail.summary.inputTokens)}</td>
                              <td>{formatTokens(memberDetail.summary.outputTokens)}</td>
                              <td className="highlight-green">{formatTokens(memberDetail.summary.cacheCreationTokens)}</td>
                              <td className="highlight-blue">{formatTokens(memberDetail.summary.cacheReadTokens)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-data">
                  <p>상세 데이터를 불러올 수 없습니다.</p>
                </div>
              )}
            </>
          ) : (
            /* 팀원별 탭 - 목록 */
            <div className="table-section">
              <div className="table-header">
                <div>
                  <h3>팀원별 사용량</h3>
                  <p className="table-subtitle">팀원을 클릭하면 상세 정보를 볼 수 있습니다</p>
                </div>
                <button className="export-btn" onClick={handleExportExcel}>
                  Excel 다운로드
                </button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>이름</th>
                      <th>비용</th>
                      <th>총 토큰</th>
                      <th>입력</th>
                      <th>출력</th>
                      <th>캐시생성</th>
                      <th>캐시읽기</th>
                      <th>팀명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMemberData.map((member, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td className="member-name" onClick={() => handleMemberClick(member)}>{member.name}</td>
                        <td>{formatCost(member.cost)}</td>
                        <td>{formatTokens(member.totalTokens)}</td>
                        <td>{formatTokens(member.inputTokens)}</td>
                        <td>{formatTokens(member.outputTokens)}</td>
                        <td className="highlight-green">{formatTokens(member.cacheCreationTokens)}</td>
                        <td className="highlight-blue">{formatTokens(member.cacheReadTokens)}</td>
                        <td>{member.teamName}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td></td>
                      <td>합계</td>
                      <td>{formatCost(filteredMemberData.reduce((sum, m) => sum + m.cost, 0))}</td>
                      <td>{formatTokens(filteredMemberData.reduce((sum, m) => sum + m.totalTokens, 0))}</td>
                      <td>{formatTokens(filteredMemberData.reduce((sum, m) => sum + m.inputTokens, 0))}</td>
                      <td>{formatTokens(filteredMemberData.reduce((sum, m) => sum + m.outputTokens, 0))}</td>
                      <td className="highlight-green">{formatTokens(filteredMemberData.reduce((sum, m) => sum + m.cacheCreationTokens, 0))}</td>
                      <td className="highlight-blue">{formatTokens(filteredMemberData.reduce((sum, m) => sum + m.cacheReadTokens, 0))}</td>
                      <td>{filteredMemberData.length}명</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-data">
          <p>데이터가 없습니다.</p>
        </div>
      )}

      <style jsx>{`
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .dashboard-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .month-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.5rem;
        }

        .month-nav-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #f3f4f6;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          color: #374151;
          transition: all 0.2s;
        }

        .month-nav-btn:hover {
          background: #e5e7eb;
        }

        .current-month {
          padding: 0 1rem;
          font-weight: 500;
          color: #374151;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }

        .tab {
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 0.9rem;
          color: #6b7280;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #3b82f6;
        }

        .tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
          font-weight: 500;
        }

        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .filter-group label {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .filter-group select {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          font-size: 0.9rem;
          min-width: 200px;
        }

        .loading {
          text-align: center;
          padding: 4rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .summary-section {
          margin-bottom: 2rem;
        }

        .summary-section h2 {
          font-size: 1rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 1rem;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .summary-cards.two-cols {
          grid-template-columns: repeat(2, 1fr);
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .detail-header h2 {
          margin-bottom: 0;
        }

        .back-btn {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          color: #3b82f6;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .summary-card {
          padding: 1rem 1.5rem;
          border-radius: 12px;
          background: white;
        }

        .summary-card.blue {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          border: 1px solid #93c5fd;
        }

        .summary-card.green {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          border: 1px solid #86efac;
        }

        .summary-card.orange {
          background: linear-gradient(135deg, #ffedd5, #fed7aa);
          border: 1px solid #fdba74;
        }

        .card-label {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .card-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }

        .token-detail {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem 1.5rem;
          margin-bottom: 2rem;
        }

        .detail-label {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-name {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .detail-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .highlight-green {
          color: #059669 !important;
        }

        .highlight-blue {
          color: #2563eb !important;
        }

        .chart-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .chart-section h3 {
          font-size: 1rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 1rem;
        }

        .table-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .table-header h3 {
          font-size: 1rem;
          font-weight: 500;
          color: #374151;
        }

        .table-subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 0.25rem;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          color: #374151;
          transition: all 0.2s;
        }

        .export-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        th, td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #f3f4f6;
        }

        th {
          background: #f9fafb;
          font-weight: 500;
          color: #6b7280;
          white-space: nowrap;
        }

        td {
          color: #374151;
        }

        .member-name {
          color: #3b82f6;
          cursor: pointer;
        }

        .member-name:hover {
          text-decoration: underline;
        }

        .percentage-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .percentage-fill {
          height: 8px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          border-radius: 4px;
          min-width: 4px;
          max-width: 80px;
        }

        .total-row {
          background: #f9fafb;
          font-weight: 600;
        }

        .total-row td {
          border-top: 2px solid #e5e7eb;
        }

        .no-data {
          text-align: center;
          padding: 4rem;
          color: #9ca3af;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 1rem;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .summary-cards {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .filters {
            flex-direction: column;
          }

          .filter-group select {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
