'use client'

import { useState, useEffect } from 'react'

export default function GuidePage() {
  const [userName, setUserName] = useState('안성민')
  const [teamName, setTeamName] = useState('')
  const [macUserName, setMacUserName] = useState('')
  const [folderPath, setFolderPath] = useState('/Users/사용자이름/ccusage-data')
  const [apiUrl, setApiUrl] = useState('https://claude-ccusage-dashboard.vercel.app')
  const [copied, setCopied] = useState<string | null>(null)

  // 로컬스토리지에서 저장된 값 불러오기
  useEffect(() => {
    const savedUserName = localStorage.getItem('guide-userName')
    const savedTeamName = localStorage.getItem('guide-teamName')
    const savedMacUserName = localStorage.getItem('guide-macUserName')
    const savedFolderPath = localStorage.getItem('guide-folderPath')
    const savedApiUrl = localStorage.getItem('guide-apiUrl')

    if (savedUserName) setUserName(savedUserName)
    if (savedTeamName) setTeamName(savedTeamName)
    if (savedMacUserName) setMacUserName(savedMacUserName)
    if (savedFolderPath) setFolderPath(savedFolderPath)
    if (savedApiUrl) setApiUrl(savedApiUrl)
  }, [])

  // 각 값이 변경될 때마다 로컬스토리지에 저장
  useEffect(() => {
    localStorage.setItem('guide-userName', userName)
  }, [userName])

  useEffect(() => {
    localStorage.setItem('guide-teamName', teamName)
  }, [teamName])

  useEffect(() => {
    localStorage.setItem('guide-macUserName', macUserName)
  }, [macUserName])

  useEffect(() => {
    localStorage.setItem('guide-folderPath', folderPath)
  }, [folderPath])

  useEffect(() => {
    localStorage.setItem('guide-apiUrl', apiUrl)
  }, [apiUrl])

  // macOS 사용자 이름이 변경되면 폴더 경로 자동 업데이트
  const handleMacUserNameChange = (value: string) => {
    setMacUserName(value)
    if (value.trim()) {
      setFolderPath(`/Users/${value}/ccusage-data`)
    }
  }

  const scriptContent = `#!/bin/bash

# 저번주 월요일~일요일 날짜 계산
last_monday=$(date -v-1w -v-mon +%Y%m%d)
last_sunday=$(date -j -v+6d -f "%Y%m%d" "$last_monday" +%Y%m%d)

# 사용자 이름/팀명 설정
USERNAME="${userName}"
TEAMNAME="${teamName}"

# API URL 설정
API_URL="${apiUrl}"

# 파일명 형식: 이름MMDD-MMDD.json
month_day_start=\${last_monday:4:4}
month_day_end=\${last_sunday:4:4}
output_file="${folderPath}/\${USERNAME}\${month_day_start}-\${month_day_end}.json"

# 이미 파일이 있으면 스킵 (이번 주에 이미 처리됨)
if [ -f "\$output_file" ]; then
  exit 0
fi

# ccusage 실행
cd ${folderPath}
npx ccusage daily --json --since $last_monday --until $last_sunday > "\$output_file"

# ccusage 실행 결과 확인
if [ ! -f "\$output_file" ] || [ ! -s "\$output_file" ]; then
  echo "[\$(date)] 오류: JSON 파일 생성 실패" >> ${folderPath}/ccusage-cron.log
  exit 1
fi

# JSON 데이터 읽기
json_data=\$(cat "\$output_file")

# API로 데이터 전송
response=\$(curl -s -X POST "\$API_URL/api/reports/save-raw" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"userName\\": \\"\$USERNAME\\",
    \\"teamName\\": \\"\$TEAMNAME\\",
    \\"ccusageData\\": \$json_data,
    \\"since\\": \\"\$last_monday\\",
    \\"until\\": \\"\$last_sunday\\"
  }")

# API 응답 확인
if echo "\$response" | grep -q '"ok":true'; then
  echo "[\$(date)] ✅ DB 저장 완료: \$USERNAME (\$last_monday ~ \$last_sunday)" >> ${folderPath}/ccusage-cron.log
else
  echo "[\$(date)] ❌ DB 저장 실패: \$response" >> ${folderPath}/ccusage-cron.log
fi
`

  const crontabEntry = `# 매일 오전 10시에 자동 실행 (저번주 데이터 없으면 생성)
0 10 * * * /bin/bash ${folderPath}/run-ccusage.sh`

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      alert('복사 실패. 수동으로 복사해주세요.')
    }
  }

  return (
    <main>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header className="header">
          <h1>⚡ 자동화 가이드</h1>
          <p>매주 월요일마다 자동으로 ccusage 데이터를 수집하고 DB에 저장하는 방법을 가이드합니다.</p>
        </header>

        {/* 설정 섹션 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            1️⃣ 설정
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              🏢 팀명
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="팀명 입력"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              👤 이름
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="이름 입력"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              💻 macOS 사용자 이름
            </label>
            <input
              type="text"
              value={macUserName}
              onChange={(e) => handleMacUserNameChange(e.target.value)}
              placeholder="예: wordword"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              📂 데이터 저장 폴더 경로
            </label>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="/Users/사용자이름/ccusage-data"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem',
                background: macUserName ? '#f1f5f9' : 'white'
              }}
            />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              🌐 API URL
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://claude-ccusage-dashboard.vercel.app"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        {/* Step 0 - 사전 준비 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            2️⃣ 사전 준비
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>아래 명령어로 ccusage가 정상 동작하는지 확인해보세요.</p>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            position: 'relative'
          }}>
            <code>npx ccusage</code>
            <button
              onClick={() => copyToClipboard('npx ccusage', 'ccusage-npx')}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {copied === 'ccusage-npx' ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>
        </div>

        {/* Step 1 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            3️⃣ 폴더 생성
          </h2>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            position: 'relative'
          }}>
            <code>mkdir -p {folderPath}</code>
            <button
              onClick={() => copyToClipboard(`mkdir -p ${folderPath}`, 'mkdir')}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {copied === 'mkdir' ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            4️⃣ 스크립트 파일 생성
          </h2>
          <p style={{ marginBottom: '1rem', color: '#475569' }}>
            다음 명령어로 스크립트 파일을 생성하세요:
          </p>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            position: 'relative',
            marginBottom: '1rem'
          }}>
            <code>vi {folderPath}/run-ccusage.sh</code>
            <button
              onClick={() => copyToClipboard(`vi ${folderPath}/run-ccusage.sh`, 'vi')}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {copied === 'vi' ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>
          <p style={{ marginBottom: '1rem', color: '#475569' }}>
            아래 내용을 붙여넣으세요:
          </p>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            position: 'relative',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {scriptContent}
            <button
              onClick={() => copyToClipboard(scriptContent, 'script')}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {copied === 'script' ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
            💡 vi 에디터에서 저장: <code>i</code>로 입력모드 → 붙여넣기 → <code>ESC</code> → <code>:wq</code> 엔터
          </p>
        </div>

        {/* Step 3 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            5️⃣ 실행 권한 부여
          </h2>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            position: 'relative'
          }}>
            <code>chmod +x {folderPath}/run-ccusage.sh</code>
            <button
              onClick={() => copyToClipboard(`chmod +x ${folderPath}/run-ccusage.sh`, 'chmod')}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {copied === 'chmod' ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>
        </div>

        {/* Step 4 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            6️⃣ 수동 테스트
          </h2>
          <p style={{ marginBottom: '1rem', color: '#475569' }}>
            crontab 설정 전에 스크립트가 제대로 작동하는지 확인하세요:
          </p>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            position: 'relative'
          }}>
            <code>{folderPath}/run-ccusage.sh</code>
            <button
              onClick={() => copyToClipboard(`${folderPath}/run-ccusage.sh`, 'test')}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {copied === 'test' ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
            💡 파일이 생성되었는지 확인: <code>ls -la {folderPath}/*.json</code>
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            💡 DB 저장 확인: 로그 파일 확인 <code>cat {folderPath}/ccusage-cron.log</code>
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#10b981' }}>
            ✅ "DB 저장 완료" 메시지가 보이면 성공입니다!
          </p>
        </div>

        {/* Step 5 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            7️⃣ crontab 설정
          </h2>
          <p style={{ marginBottom: '1rem', color: '#475569' }}>
            crontab 편집기 열기:
          </p>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            marginBottom: '1rem'
          }}>
            <code>crontab -e</code>
          </div>
          <p style={{ marginBottom: '1rem', color: '#475569' }}>
            아래 내용을 추가하세요:
          </p>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            position: 'relative',
            whiteSpace: 'pre-wrap'
          }}>
            {crontabEntry}
            <button
              onClick={() => copyToClipboard(crontabEntry, 'crontab')}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.5rem 1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {copied === 'crontab' ? '✓ 복사됨!' : '📋 복사'}
            </button>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
            💡 vi 에디터에서 저장: <code>i</code>로 입력모드 → 붙여넣기 → <code>ESC</code> → <code>:wq</code> 엔터
          </p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
            <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>
              ⚠️ <strong>macOS Catalina 이상:</strong> 터미널(또는 iTerm)에 cron 권한을 부여해야 합니다.
              <br />
              시스템 환경설정 → 보안 및 개인 정보 보호 → 개인 정보 보호 → 전체 디스크 접근 권한
            </p>
          </div>
        </div>

        {/* Step 6 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            8️⃣ crontab 확인
          </h2>
          <p style={{ marginBottom: '1rem', color: '#475569' }}>
            설정된 crontab 목록 확인:
          </p>
          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '1.5rem',
            borderRadius: '8px',
            fontFamily: 'monospace'
          }}>
            <code>crontab -l</code>
          </div>
        </div>

        {/* 스케줄 설명 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            📅 실행 스케줄
          </h2>
          <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.8' }}>
            <p><strong>매일 오전 10시</strong>에 자동으로 <strong>저번주 월요일~일요일</strong> 데이터가 있는지 확인하고, 없으면 수집 후 DB에 저장합니다.</p>
            <p style={{ marginTop: '1rem' }}>처리 과정:</p>
            <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>저번주 데이터 파일이 이미 있는지 확인</li>
              <li>있으면 스킵, 없으면 ccusage 실행</li>
              <li>생성된 JSON 데이터를 API로 전송</li>
              <li>DB에 데이터 저장</li>
            </ol>
            <p style={{ marginTop: '1rem' }}>예시:</p>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li>2월 3일(월) 휴가로 맥북 꺼짐 → 실행 안 됨</li>
              <li>2월 4일(화) 맥북 켜짐 → 1월 27일 ~ 2월 2일 데이터 수집 + DB 저장</li>
              <li>2월 5일(수)~9일(일) → 파일 이미 있으므로 스킵</li>
            </ul>
          </div>
        </div>

        {/* 다른 스케줄 옵션 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            ⏰ 다른 스케줄 옵션
          </h2>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#475569' }}>스케줄</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#475569' }}>Crontab</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem' }}>매주 월요일 오전 10시</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>0 10 * * 1</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem' }}>매일 오전 9시</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>0 9 * * *</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem' }}>매주 금요일 오후 6시</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>0 18 * * 5</td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem' }}>매월 1일 오전 10시</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>0 10 1 * *</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 트러블슈팅 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            🔧 트러블슈팅
          </h2>
          <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.8' }}>
            <p><strong>Q. crontab이 실행되지 않아요</strong></p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              <li>터미널 앱에 "전체 디스크 접근 권한" 부여 확인</li>
              <li>로그 파일 확인: <code>cat {folderPath}/ccusage-cron.log</code></li>
              <li>cron 로그 확인: <code>tail -f /var/log/system.log | grep cron</code></li>
            </ul>

            <p><strong>Q. npx 명령어를 찾을 수 없다고 나와요</strong></p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              <li>스크립트 상단에 전체 경로 추가: <code>export PATH="/usr/local/bin:$PATH"</code></li>
              <li>또는 npx 대신 전체 경로 사용: <code>/usr/local/bin/npx ccusage ...</code></li>
            </ul>

            <p><strong>Q. 날짜 계산이 안 맞아요</strong></p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
              <li>스크립트를 수동 실행해서 날짜가 제대로 계산되는지 확인하세요</li>
              <li><code>echo $last_monday</code>, <code>echo $last_sunday</code>로 확인</li>
            </ul>
          </div>
        </div>

      </div>
    </main>
  )
}
