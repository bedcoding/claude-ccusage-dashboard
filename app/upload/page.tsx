'use client'

import { useState, useEffect, useRef } from 'react'
import type { CcusageData } from './types'
import { validateCcusageData } from '@/lib/validation'

type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth'

interface ProcessResult {
  totalDays: number
  newDays: number
  updatedDays: number
  skippedDays: number
  errorDays: number
  period: string
  batchId: number
  dailyResults: Array<{
    date: string
    status: 'new' | 'updated' | 'skipped' | 'error'
    cost: number
    tokens: number
    message?: string
  }>
}

export default function UploadPage() {
  const [userName, setUserName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // localStorage에서 사용자 이름/팀명 불러오기
  useEffect(() => {
    const savedName = localStorage.getItem('claudeUserName')
    if (savedName) setUserName(savedName)
    const savedTeamName = localStorage.getItem('claudeTeamName')
    if (savedTeamName) setTeamName(savedTeamName)

    // 기본값: 지난 달
    applyPreset('lastMonth')
  }, [])

  const handleUserNameChange = (name: string) => {
    setUserName(name)
    localStorage.setItem('claudeUserName', name)
  }

  const handleTeamNameChange = (name: string) => {
    setTeamName(name)
    localStorage.setItem('claudeTeamName', name)
  }

  // 날짜 프리셋 계산
  const getPresetDates = (preset: DatePreset) => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const date = today.getDate()

    const formatDate = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const formatDateForCommand = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}${m}${day}`
    }

    let start: Date, end: Date

    switch (preset) {
      case 'today':
        start = end = new Date(year, month, date)
        break
      case 'yesterday':
        start = end = new Date(year, month, date - 1)
        break
      case 'thisWeek': {
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        start = new Date(year, month, date + mondayOffset)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        break
      }
      case 'lastWeek': {
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        start = new Date(year, month, date + mondayOffset - 7)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        break
      }
      case 'thisMonth':
        start = new Date(year, month, 1)
        end = new Date(year, month + 1, 0)
        break
      case 'lastMonth':
        start = new Date(year, month - 1, 1)
        end = new Date(year, month, 0)
        break
    }

    return {
      start: formatDate(start),
      end: formatDate(end),
      startCmd: formatDateForCommand(start),
      endCmd: formatDateForCommand(end)
    }
  }

  const applyPreset = (preset: DatePreset) => {
    const dates = getPresetDates(preset)
    setStartDate(dates.start)
    setEndDate(dates.end)
  }

  // 날짜를 명령어 형식으로 변환
  const getCommandDates = () => {
    const parseDate = (dateStr: string) => {
      // "2026-02-01" 형식을 "20260201" 형식으로 변환
      return dateStr.replace(/-/g, '')
    }
    return {
      since: parseDate(startDate),
      until: parseDate(endDate)
    }
  }

  const { since, until } = getCommandDates()
  const command = `npx ccusage daily --json --since ${since} --until ${until} | pbcopy && echo Copied`

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

  const handleUpload = async () => {
    if (!userName.trim()) {
      setMessage({ text: '이름을 입력해주세요.', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (!jsonInput.trim()) {
      setMessage({ text: 'JSON 데이터를 붙여넣기 해주세요.', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    // JSON 파싱 및 검증
    let jsonData: unknown
    try {
      jsonData = JSON.parse(jsonInput)
    } catch {
      setMessage({ text: '올바른 JSON 형식이 아닙니다.', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const validation = validateCcusageData(jsonData)
    if (!validation.success) {
      setMessage({ text: `JSON 검증 실패: ${validation.error}`, type: 'error' })
      setTimeout(() => setMessage(null), 5000)
      return
    }

    const ccusageData: CcusageData = validation.data

    setIsUploading(true)
    setMessage({ text: '데이터 업로드 중...', type: 'success' })

    try {
      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: {
            totalMembers: 1,
            totalCost: ccusageData.totals.totalCost,
            totalTokens: ccusageData.totals.totalTokens,
            avgCostPerMember: ccusageData.totals.totalCost,
            avgTokensPerMember: ccusageData.totals.totalTokens,
            members: [{
              name: userName,
              cost: ccusageData.totals.totalCost,
              tokens: ccusageData.totals.totalTokens,
              percentage: 100
            }],
            weeklyTrends: []
          },
          mergedData: ccusageData,
          teamData: [{
            name: userName,
            fileName: `${userName}.json`,
            data: ccusageData
          }],
          userName,
          teamName: teamName || ''
        })
      })

      const apiResult = await response.json()

      if (apiResult.ok) {
        // 결과 데이터 구성
        const processResult: ProcessResult = {
          totalDays: ccusageData.daily.length,
          newDays: ccusageData.daily.length, // 일단 모두 신규로 표시
          updatedDays: 0,
          skippedDays: 0,
          errorDays: 0,
          period: `${ccusageData.daily[0]?.date || ''} ~ ${ccusageData.daily[ccusageData.daily.length - 1]?.date || ''}`,
          batchId: apiResult.reportId || 0,
          dailyResults: ccusageData.daily.map(day => ({
            date: day.date,
            status: 'new' as const,
            cost: day.totalCost,
            tokens: day.totalTokens
          }))
        }
        setResult(processResult)
        setMessage({ text: '업로드 성공!', type: 'success' })
      } else {
        setMessage({ text: `업로드 실패: ${apiResult.error}`, type: 'error' })
      }
    } catch (error) {
      setMessage({ text: `업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, type: 'error' })
    } finally {
      setIsUploading(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const handleReset = () => {
    setJsonInput('')
    setResult(null)
    applyPreset('lastMonth')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="status-badge new">신규</span>
      case 'updated':
        return <span className="status-badge updated">갱신</span>
      case 'skipped':
        return <span className="status-badge skipped">스킵</span>
      case 'error':
        return <span className="status-badge error">오류</span>
      default:
        return null
    }
  }

  const byteSize = new Blob([jsonInput]).size
  const byteSizeStr = byteSize > 1024 * 1024
    ? `${(byteSize / (1024 * 1024)).toFixed(1)} MB`
    : byteSize > 1024
    ? `${(byteSize / 1024).toFixed(1)} KB`
    : `${byteSize} B`

  return (
    <main className="upload-page">
      {message && (
        <div className={`snackbar ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="container">
        <header className="header">
          <h1>💾 사용량 전송</h1>
          <p>Claude 사용량 데이터를 DB에 저장합니다</p>
        </header>
        {!result ? (
          <div className="upload-form">
            {/* Step 1: 명령어 생성 */}
            <section className="section">
              <h2>1. ccusage 명령어 생성</h2>

              <div className="preset-buttons">
                <button onClick={() => applyPreset('today')}>오늘</button>
                <button onClick={() => applyPreset('yesterday')}>어제</button>
                <button onClick={() => applyPreset('thisWeek')}>이번 주</button>
                <button onClick={() => applyPreset('lastWeek')}>지난 주</button>
                <button onClick={() => applyPreset('thisMonth')}>이번 달</button>
                <button onClick={() => applyPreset('lastMonth')}>지난 달</button>
              </div>

              <div className="date-row">
                <div className="date-field">
                  <label>시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="date-field">
                  <label>종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="command-box">
                <code>{command}</code>
                <button className="copy-btn" onClick={copyCommand}>
                  {copied ? '복사됨' : '복사'}
                </button>
              </div>
              <p className="hint">터미널에서 위 명령어를 실행하면 결과가 클립보드에 자동 복사됩니다. 아래 텍스트 영역에 붙여넣기(Ctrl+V / Cmd+V)하세요.</p>
            </section>

            {/* Step 2: 업로드 대상 */}
            <section className="section">
              <div className="user-info">
                업로드 대상: <strong>{userName || '(이름 입력 필요)'}</strong>
                {teamName && <span className="team-tag">({teamName})</span>}
              </div>
              <div className="input-row">
                <div className="input-field">
                  <label>👤 이름 *</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => handleUserNameChange(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
                <div className="input-field">
                  <label>🏢 팀명</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => handleTeamNameChange(e.target.value)}
                    placeholder="프론트엔드팀"
                  />
                </div>
              </div>
            </section>

            {/* Step 3: JSON 붙여넣기 */}
            <section className="section">
              <div className="json-header">
                <h2>2. ccusage JSON 데이터 붙여넣기 *</h2>
                <span className="byte-count">{byteSizeStr} / 2 MB</span>
              </div>
              <textarea
                ref={textareaRef}
                className="json-input"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`{"daily": [{"date": "2026-02-02", "totalCost": 1.23, "totalTokens": 50000, ...}]}`}
              />
            </section>

            {/* 버튼 */}
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={isUploading || !userName.trim() || !jsonInput.trim()}
            >
              {isUploading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        ) : (
          <div className="result-section">
            <div className="result-header">
              <h2>업로드 결과</h2>
              <button className="new-upload-btn" onClick={handleReset}>
                새로 업로드
              </button>
            </div>

            {/* 처리 요약 */}
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-value">{result.totalDays}</div>
                <div className="summary-label">전체</div>
              </div>
              <div className="summary-item new">
                <div className="summary-value">{result.newDays}</div>
                <div className="summary-label">신규 추가</div>
              </div>
              <div className="summary-item updated">
                <div className="summary-value">{result.updatedDays}</div>
                <div className="summary-label">갱신</div>
              </div>
              <div className="summary-item skipped">
                <div className="summary-value">{result.skippedDays}</div>
                <div className="summary-label">스킵</div>
              </div>
              <div className="summary-item error">
                <div className="summary-value">{result.errorDays}</div>
                <div className="summary-label">오류</div>
              </div>
            </div>

            <div className="result-info">
              <p>대상: {userName}</p>
              <p>기간: {result.period}</p>
              <p>배치 ID: {result.batchId}</p>
            </div>

            {/* 처리된 데이터 테이블 */}
            <div className="result-table-section">
              <h3>처리된 데이터</h3>
              <table className="result-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>상태</th>
                    <th>비용 (USD)</th>
                    <th>토큰</th>
                    <th>변경 내역</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dailyResults.map((day, idx) => (
                    <tr key={idx}>
                      <td>{day.date}</td>
                      <td>{getStatusBadge(day.status)}</td>
                      <td>${day.cost.toFixed(2)}</td>
                      <td>{day.tokens.toLocaleString()}</td>
                      <td>{day.message || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .upload-page {
          min-height: 100vh;
          background: #f5f5f5;
          padding: 2rem 1rem;
        }

        .container {
          max-width: 960px;
          margin: 0 auto;
        }

        .snackbar {
          position: fixed;
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          z-index: 1000;
          animation: slideDown 0.3s ease;
        }

        .snackbar.success {
          background: #dcfce7;
          color: #166534;
        }

        .snackbar.error {
          background: #fee2e2;
          color: #991b1b;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .upload-form {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .section {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .section:last-of-type {
          border-bottom: none;
          margin-bottom: 1rem;
        }

        .section h2 {
          font-size: 1rem;
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .preset-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .preset-buttons button {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .preset-buttons button:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .date-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .date-field label,
        .input-field label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .date-field input,
        .input-field input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.875rem;
          box-sizing: border-box;
        }

        .date-field input:focus,
        .input-field input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .command-box {
          display: flex;
          align-items: center;
          background: #1e293b;
          border-radius: 8px;
          padding: 1rem;
          gap: 1rem;
        }

        .command-box code {
          flex: 1;
          color: #4ade80;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.8rem;
          word-break: break-all;
        }

        .copy-btn {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          white-space: nowrap;
        }

        .copy-btn:hover {
          background: #2563eb;
        }

        .hint {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.5rem;
          text-align: center;
        }

        .user-info {
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .team-tag {
          color: #6b7280;
          margin-left: 0.5rem;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .json-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .json-header h2 {
          margin: 0;
        }

        .byte-count {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .json-input {
          width: 100%;
          height: 200px;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.8rem;
          resize: vertical;
          box-sizing: border-box;
        }

        .json-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .json-input::placeholder {
          color: #9ca3af;
        }

        .upload-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .upload-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        /* 결과 섹션 */
        .result-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .result-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #1f2937;
        }

        .new-upload-btn {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .summary-item {
          text-align: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }

        .summary-item.new {
          background: #dcfce7;
        }

        .summary-item.updated {
          background: #fef3c7;
        }

        .summary-item.skipped {
          background: #f3f4f6;
        }

        .summary-item.error {
          background: #fee2e2;
        }

        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }

        .summary-item.new .summary-value {
          color: #166534;
        }

        .summary-item.updated .summary-value {
          color: #92400e;
        }

        .summary-item.error .summary-value {
          color: #991b1b;
        }

        .summary-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .result-info {
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .result-info p {
          margin: 0.25rem 0;
        }

        .result-table-section h3 {
          font-size: 1rem;
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .result-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .result-table th,
        .result-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .result-table th {
          background: #f8fafc;
          font-weight: 500;
          color: #6b7280;
        }

        .result-table tbody tr:hover {
          background: #f9fafb;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-badge.new {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.updated {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.skipped {
          background: #f3f4f6;
          color: #6b7280;
        }

        .status-badge.error {
          background: #fee2e2;
          color: #991b1b;
        }

        @media (max-width: 768px) {
          .date-row,
          .input-row {
            grid-template-columns: 1fr;
          }

          .summary-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .preset-buttons {
            justify-content: flex-start;
          }

          .command-box {
            flex-direction: column;
            align-items: stretch;
          }

          .command-box code {
            margin-bottom: 0.5rem;
          }
        }
      `}</style>
    </main>
  )
}
