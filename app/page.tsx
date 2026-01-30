'use client'

import { useState, useMemo, Fragment } from 'react'
import type { TeamMemberData, TeamStats, CcusageData } from './types'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'

export default function Home() {
  const [files, setFiles] = useState<File[]>([])
  const [teamData, setTeamData] = useState<TeamMemberData[]>([])
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [mergedData, setMergedData] = useState<CcusageData | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [copied, setCopied] = useState(false)

  // 이번 주 월요일~일요일 계산
  const weekDates = useMemo(() => {
    const today = new Date()
    const day = today.getDay()
    const diff = day === 0 ? -6 : 1 - day // 월요일로 조정

    const monday = new Date(today)
    monday.setDate(today.getDate() + diff)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}${month}${day}`
    }

    return {
      since: formatDate(monday),
      until: formatDate(sunday),
      display: `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}`
    }
  }, [])

  const command = `npx ccusage daily --json --since ${weekDates.since} --until ${weekDates.until} > result.json`

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      setMessage({ text: '복사 실패. 수동으로 복사해주세요.', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/json')
    handleFilesAdded(droppedFiles)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/json')
      handleFilesAdded(selectedFiles)
    }
  }

  const handleFilesAdded = (newFiles: File[]) => {
    const uniqueFiles = newFiles.filter(
      newFile => !files.some(existingFile => existingFile.name === newFile.name)
    )

    if (uniqueFiles.length === 0) {
      setMessage({ text: '이미 추가된 파일입니다.', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setFiles(prev => [...prev, ...uniqueFiles])
    processFiles([...files, ...uniqueFiles])
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    if (newFiles.length === 0) {
      setTeamData([])
      setStats(null)
      setMergedData(null)
    } else {
      processFiles(newFiles)
    }
  }

  const processFiles = async (filesToProcess: File[]) => {
    try {
      const parsedData: TeamMemberData[] = []

      for (const file of filesToProcess) {
        const text = await file.text()
        const data: CcusageData = JSON.parse(text)

        // 파일명에서 확장자 제거하여 이름 추출
        const name = file.name.replace('.json', '')

        parsedData.push({
          name,
          fileName: file.name,
          data
        })
      }

      setTeamData(parsedData)
      calculateStats(parsedData)
      setMessage({ text: `${filesToProcess.length}개 파일 분석 완료!`, type: 'success' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ text: `파일 처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, type: 'error' })
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const calculateStats = (data: TeamMemberData[]) => {
    const members = data.map(member => ({
      name: member.name,
      cost: member.data.totals.totalCost,
      tokens: member.data.totals.totalTokens,
      percentage: 0
    }))

    const totalCost = members.reduce((sum, m) => sum + m.cost, 0)
    const totalTokens = members.reduce((sum, m) => sum + m.tokens, 0)

    // 비율 계산
    members.forEach(member => {
      member.percentage = (member.cost / totalCost) * 100
    })

    // 일별 추이 데이터 수집
    const periodMap = new Map<string, { totalCost: number; totalTokens: number }>()

    data.forEach(member => {
      member.data.daily.forEach(day => {
        const existing = periodMap.get(day.date) || { totalCost: 0, totalTokens: 0 }
        periodMap.set(day.date, {
          totalCost: existing.totalCost + day.totalCost,
          totalTokens: existing.totalTokens + day.totalTokens
        })
      })
    })

    const weeklyTrends = Array.from(periodMap.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))

    const stats: TeamStats = {
      totalMembers: data.length,
      totalCost,
      totalTokens,
      avgCostPerMember: totalCost / data.length,
      avgTokensPerMember: totalTokens / data.length,
      members,
      weeklyTrends
    }

    setStats(stats)

    // 전체 데이터 병합
    if (data.length > 0) {
      mergeMemberData(data)
    }
  }

  const mergeMemberData = (data: TeamMemberData[]) => {
    // 일별 데이터를 날짜별로 병합
    const dailyMap = new Map<string, any>()

    data.forEach(member => {
      member.data.daily.forEach(day => {
        const existing = dailyMap.get(day.date)

        if (!existing) {
          // 새로운 날짜
          dailyMap.set(day.date, {
            date: day.date,
            inputTokens: day.inputTokens,
            outputTokens: day.outputTokens,
            cacheCreationTokens: day.cacheCreationTokens,
            cacheReadTokens: day.cacheReadTokens,
            totalTokens: day.totalTokens,
            totalCost: day.totalCost,
            modelsUsed: new Set(day.modelsUsed),
            modelBreakdowns: new Map<string, any>()
          })

          // 모델별 breakdown 추가
          day.modelBreakdowns.forEach(model => {
            dailyMap.get(day.date)!.modelBreakdowns.set(model.modelName, {
              modelName: model.modelName,
              inputTokens: model.inputTokens,
              outputTokens: model.outputTokens,
              cacheCreationTokens: model.cacheCreationTokens,
              cacheReadTokens: model.cacheReadTokens,
              cost: model.cost
            })
          })
        } else {
          // 기존 날짜에 데이터 합산
          existing.inputTokens += day.inputTokens
          existing.outputTokens += day.outputTokens
          existing.cacheCreationTokens += day.cacheCreationTokens
          existing.cacheReadTokens += day.cacheReadTokens
          existing.totalTokens += day.totalTokens
          existing.totalCost += day.totalCost
          day.modelsUsed.forEach(model => existing.modelsUsed.add(model))

          // 모델별 breakdown 병합
          day.modelBreakdowns.forEach(model => {
            const existingModel = existing.modelBreakdowns.get(model.modelName)
            if (existingModel) {
              existingModel.inputTokens += model.inputTokens
              existingModel.outputTokens += model.outputTokens
              existingModel.cacheCreationTokens += model.cacheCreationTokens
              existingModel.cacheReadTokens += model.cacheReadTokens
              existingModel.cost += model.cost
            } else {
              existing.modelBreakdowns.set(model.modelName, {
                modelName: model.modelName,
                inputTokens: model.inputTokens,
                outputTokens: model.outputTokens,
                cacheCreationTokens: model.cacheCreationTokens,
                cacheReadTokens: model.cacheReadTokens,
                cost: model.cost
              })
            }
          })
        }
      })
    })

    // Map을 배열로 변환하고 정렬
    const mergedDaily = Array.from(dailyMap.values())
      .map(day => ({
        ...day,
        modelsUsed: Array.from(day.modelsUsed),
        modelBreakdowns: Array.from(day.modelBreakdowns.values())
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 전체 합계 계산
    const totals = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
      totalCost: 0
    }

    mergedDaily.forEach(day => {
      totals.inputTokens += day.inputTokens
      totals.outputTokens += day.outputTokens
      totals.cacheCreationTokens += day.cacheCreationTokens
      totals.cacheReadTokens += day.cacheReadTokens
      totals.totalTokens += day.totalTokens
      totals.totalCost += day.totalCost
    })

    const merged: CcusageData = {
      daily: mergedDaily,
      totals
    }

    setMergedData(merged)
  }

  const exportToExcel = () => {
    if (!teamData.length) return

    // 전체 통합 데이터 시트
    const mergedSheetData: any[] = []
    if (mergedData) {
      mergedData.daily.forEach(day => {
        // 일별 총계 행
        mergedSheetData.push({
          'date': day.date,
          'inputTokens': day.inputTokens,
          'outputTokens': day.outputTokens,
          'cacheCreationTokens': day.cacheCreationTokens,
          'cacheReadTokens': day.cacheReadTokens,
          'totalTokens': day.totalTokens,
          'totalCost': day.totalCost.toFixed(2),
          'modelsUsed': day.modelsUsed.join(', ')
        })

        // 모델별 breakdown
        day.modelBreakdowns.forEach((model: any) => {
          mergedSheetData.push({
            'date': '',
            'inputTokens': model.inputTokens,
            'outputTokens': model.outputTokens,
            'cacheCreationTokens': model.cacheCreationTokens,
            'cacheReadTokens': model.cacheReadTokens,
            'totalTokens': model.inputTokens + model.outputTokens + model.cacheCreationTokens + model.cacheReadTokens,
            'totalCost': model.cost.toFixed(2),
            'modelsUsed': `  └ ${model.modelName}`
          })
        })
      })

      // 전체 총계
      mergedSheetData.push({
        'date': '전체 총계',
        'inputTokens': mergedData.totals.inputTokens,
        'outputTokens': mergedData.totals.outputTokens,
        'cacheCreationTokens': mergedData.totals.cacheCreationTokens,
        'cacheReadTokens': mergedData.totals.cacheReadTokens,
        'totalTokens': mergedData.totals.totalTokens,
        'totalCost': mergedData.totals.totalCost.toFixed(2),
        'modelsUsed': ''
      })
    }

    // 상세 데이터 시트 (파일별)
    const detailData: any[] = []

    teamData.forEach(member => {
      member.data.daily.forEach(day => {
        // 일별 총계 행
        detailData.push({
          '파일명': member.name,
          'date': day.date,
          'inputTokens': day.inputTokens,
          'outputTokens': day.outputTokens,
          'cacheCreationTokens': day.cacheCreationTokens,
          'cacheReadTokens': day.cacheReadTokens,
          'totalTokens': day.totalTokens,
          'totalCost': day.totalCost.toFixed(2),
          'modelsUsed': day.modelsUsed.join(', ')
        })

        // 모델별 breakdown
        day.modelBreakdowns.forEach(model => {
          detailData.push({
            '파일명': '',
            'date': '',
            'inputTokens': model.inputTokens,
            'outputTokens': model.outputTokens,
            'cacheCreationTokens': model.cacheCreationTokens,
            'cacheReadTokens': model.cacheReadTokens,
            'totalTokens': model.inputTokens + model.outputTokens + model.cacheCreationTokens + model.cacheReadTokens,
            'totalCost': model.cost.toFixed(2),
            'modelsUsed': `  └ ${model.modelName}`
          })
        })
      })

      // 파일별 총계
      detailData.push({
        '파일명': `${member.name} 총계`,
        'date': '',
        'inputTokens': member.data.totals.inputTokens,
        'outputTokens': member.data.totals.outputTokens,
        'cacheCreationTokens': member.data.totals.cacheCreationTokens,
        'cacheReadTokens': member.data.totals.cacheReadTokens,
        'totalTokens': member.data.totals.totalTokens,
        'totalCost': member.data.totals.totalCost.toFixed(2),
        'modelsUsed': ''
      })
      detailData.push({}) // 빈 행
    })

    // 요약 데이터 시트
    const summaryData = stats?.members.map(member => ({
      '파일명': member.name,
      'totalCost': member.cost.toFixed(2),
      'totalTokens': member.tokens,
      'percentage': member.percentage.toFixed(1)
    }))

    // 엑셀 워크북 생성
    const wb = XLSX.utils.book_new()

    if (mergedData) {
      const wsMerged = XLSX.utils.json_to_sheet(mergedSheetData)
      XLSX.utils.book_append_sheet(wb, wsMerged, '전체 통합')
    }

    const wsDetail = XLSX.utils.json_to_sheet(detailData)
    const wsSummary = XLSX.utils.json_to_sheet(summaryData || [])

    XLSX.utils.book_append_sheet(wb, wsDetail, '파일별 상세')
    XLSX.utils.book_append_sheet(wb, wsSummary, '요약')

    // 파일 다운로드
    const fileName = `Claude_Usage_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  return (
    <main>
      <div className="container">
        <header className="header">
          <h1>🚀 Claude Max 팀 사용량 대시보드 ({weekDates.display})</h1>
          <p>팀원들의 Claude Max 사용량을 한눈에 확인하세요</p>
        </header>

        <div className="command-section">
          <div className="command-header">
            <h2>📋 이번 주 데이터 수집 명령어</h2>
            <p className="command-period">사전 준비: <code>npm install -g ccusage</code></p>
          </div>
          <div className="command-box" onClick={copyCommand}>
            <code>{command}</code>
            <button className="copy-button">
              {copied ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>
          <div className="command-instructions">
            <p>1️⃣ 위 명령어를 클릭하여 복사</p>
            <p>2️⃣ 터미널에 붙여넣기 후 실행</p>
            <p>3️⃣ 생성된 JSON 파일을 아래에 업로드</p>
          </div>
        </div>

        <div className="upload-section">
          <div
            className="upload-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className="upload-icon">📁</div>
            <div className="upload-text">JSON 파일을 드래그하거나 클릭하여 업로드</div>
            <div className="upload-hint">ccusage로 추출한 JSON 파일을 업로드하세요 (여러 개 가능)</div>
            <input
              id="fileInput"
              type="file"
              accept=".json"
              multiple
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {files.length > 0 && (
            <div className="file-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <span className="file-name">📄 {file.name}</span>
                  <button className="file-remove" onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}>×</button>
                </div>
              ))}
            </div>
          )}

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        {stats && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">파일 개수</div>
                <div className="stat-value">{stats.totalMembers}</div>
                <div className="stat-subtext">개</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">총 비용</div>
                <div className="stat-value">${stats.totalCost.toFixed(2)}</div>
                <div className="stat-subtext">USD</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">총 토큰</div>
                <div className="stat-value">{(stats.totalTokens / 1000000).toFixed(1)}M</div>
                <div className="stat-subtext">tokens</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">파일당 평균 비용</div>
                <div className="stat-value">${stats.avgCostPerMember.toFixed(2)}</div>
                <div className="stat-subtext">USD</div>
              </div>
            </div>

            {mergedData && (
              <div className="table-card">
                <div className="table-header">
                  <div className="chart-title">전체 사용 내역 (통합)</div>
                  <button className="excel-button" onClick={exportToExcel}>
                    📊 엑셀 다운로드
                  </button>
                </div>
                <div className="table-scroll">
                  <table className="detail-table">
                    <thead>
                      <tr>
                        <th>date</th>
                        <th>inputTokens</th>
                        <th>outputTokens</th>
                        <th>cacheCreationTokens</th>
                        <th>cacheReadTokens</th>
                        <th>totalTokens</th>
                        <th>totalCost</th>
                        <th>modelsUsed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedData.daily.map((day, dayIdx) => (
                        <Fragment key={dayIdx}>
                          <tr className="week-row">
                            <td>{day.date}</td>
                            <td>{day.inputTokens.toLocaleString()}</td>
                            <td>{day.outputTokens.toLocaleString()}</td>
                            <td>{day.cacheCreationTokens.toLocaleString()}</td>
                            <td>{day.cacheReadTokens.toLocaleString()}</td>
                            <td>{day.totalTokens.toLocaleString()}</td>
                            <td><strong>${day.totalCost.toFixed(2)}</strong></td>
                            <td>{day.modelsUsed.join(', ')}</td>
                          </tr>
                          {day.modelBreakdowns.map((model: any, modelIdx: number) => (
                            <tr key={`${dayIdx}-${modelIdx}`} className="model-row">
                              <td></td>
                              <td>{model.inputTokens.toLocaleString()}</td>
                              <td>{model.outputTokens.toLocaleString()}</td>
                              <td>{model.cacheCreationTokens.toLocaleString()}</td>
                              <td>{model.cacheReadTokens.toLocaleString()}</td>
                              <td>{(model.inputTokens + model.outputTokens + model.cacheCreationTokens + model.cacheReadTokens).toLocaleString()}</td>
                              <td>${model.cost.toFixed(2)}</td>
                              <td className="model-name">└ {model.modelName}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                      <tr className="total-row">
                        <td><strong>전체 총계</strong></td>
                        <td>{mergedData.totals.inputTokens.toLocaleString()}</td>
                        <td>{mergedData.totals.outputTokens.toLocaleString()}</td>
                        <td>{mergedData.totals.cacheCreationTokens.toLocaleString()}</td>
                        <td>{mergedData.totals.cacheReadTokens.toLocaleString()}</td>
                        <td>{mergedData.totals.totalTokens.toLocaleString()}</td>
                        <td><strong>${mergedData.totals.totalCost.toFixed(2)}</strong></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="table-card">
              <div className="table-header">
                <div className="chart-title">상세 사용 내역 (파일별)</div>
                <button className="excel-button" onClick={exportToExcel}>
                  📊 엑셀 다운로드
                </button>
              </div>
              <div className="table-scroll">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>파일명</th>
                      <th>date</th>
                      <th>inputTokens</th>
                      <th>outputTokens</th>
                      <th>cacheCreationTokens</th>
                      <th>cacheReadTokens</th>
                      <th>totalTokens</th>
                      <th>totalCost</th>
                      <th>modelsUsed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamData.map((member, memberIdx) => (
                      <Fragment key={memberIdx}>
                        {member.data.daily.map((day, dayIdx) => (
                          <Fragment key={`${memberIdx}-${dayIdx}`}>
                            <tr key={`${memberIdx}-${dayIdx}`} className="week-row">
                              <td><strong>{member.name}</strong></td>
                              <td>{day.date}</td>
                              <td>{day.inputTokens.toLocaleString()}</td>
                              <td>{day.outputTokens.toLocaleString()}</td>
                              <td>{day.cacheCreationTokens.toLocaleString()}</td>
                              <td>{day.cacheReadTokens.toLocaleString()}</td>
                              <td>{day.totalTokens.toLocaleString()}</td>
                              <td><strong>${day.totalCost.toFixed(2)}</strong></td>
                              <td>{day.modelsUsed.join(', ')}</td>
                            </tr>
                            {day.modelBreakdowns.map((model, modelIdx) => (
                              <tr key={`${memberIdx}-${dayIdx}-${modelIdx}`} className="model-row">
                                <td></td>
                                <td></td>
                                <td>{model.inputTokens.toLocaleString()}</td>
                                <td>{model.outputTokens.toLocaleString()}</td>
                                <td>{model.cacheCreationTokens.toLocaleString()}</td>
                                <td>{model.cacheReadTokens.toLocaleString()}</td>
                                <td>{(model.inputTokens + model.outputTokens + model.cacheCreationTokens + model.cacheReadTokens).toLocaleString()}</td>
                                <td>${model.cost.toFixed(2)}</td>
                                <td className="model-name">└ {model.modelName}</td>
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                        <tr className="total-row">
                          <td><strong>{member.name} 총계</strong></td>
                          <td></td>
                          <td>{member.data.totals.inputTokens.toLocaleString()}</td>
                          <td>{member.data.totals.outputTokens.toLocaleString()}</td>
                          <td>{member.data.totals.cacheCreationTokens.toLocaleString()}</td>
                          <td>{member.data.totals.cacheReadTokens.toLocaleString()}</td>
                          <td>{member.data.totals.totalTokens.toLocaleString()}</td>
                          <td><strong>${member.data.totals.totalCost.toFixed(2)}</strong></td>
                          <td></td>
                        </tr>
                        {memberIdx < teamData.length - 1 && (
                          <tr className="separator-row">
                            <td colSpan={9}></td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">totalCost</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.members}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'totalCost']}
                  />
                  <Legend />
                  <Bar dataKey="cost" fill="#3b82f6" name="totalCost" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title">totalTokens</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.members}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value) => [`${(Number(value) / 1000000).toFixed(2)}M`, 'totalTokens']}
                  />
                  <Legend />
                  <Bar dataKey="tokens" fill="#10b981" name="totalTokens" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {stats.weeklyTrends.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">일별 totalCost 추이</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, 'totalCost']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalCost"
                      stroke="#3b82f6"
                      name="totalCost"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="table-card">
              <div className="chart-title">요약 통계</div>
              <table>
                <thead>
                  <tr>
                    <th>파일명</th>
                    <th>totalCost</th>
                    <th>totalTokens</th>
                    <th>percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.members.map((member, index) => (
                    <tr key={index}>
                      <td><strong>{member.name}</strong></td>
                      <td>${member.cost.toFixed(2)}</td>
                      <td>{(member.tokens / 1000000).toFixed(2)}M</td>
                      <td>{member.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
