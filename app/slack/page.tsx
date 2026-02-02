'use client'

import { useState, useEffect } from 'react'
import { REPORTS_URL } from '@/lib/constants'

export default function SlackPage() {
  const [slackBotToken, setSlackBotToken] = useState('')
  const [slackChannelId, setSlackChannelId] = useState('')
  const [isSendingToSlack, setIsSendingToSlack] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const reportsUrl = REPORTS_URL
  const defaultSlackMessage = `📊 Claude Max 사용량 데이터가 추가되었습니다.\n📥 ${reportsUrl}`
  const [slackMessage, setSlackMessage] = useState(defaultSlackMessage)

  useEffect(() => {
    const savedSlackToken = localStorage.getItem('slackBotToken')
    if (savedSlackToken) setSlackBotToken(savedSlackToken)

    const savedSlackChannel = localStorage.getItem('slackChannelId')
    if (savedSlackChannel) setSlackChannelId(savedSlackChannel)
  }, [])

  const handleSlackTokenChange = (token: string) => {
    setSlackBotToken(token)
    localStorage.setItem('slackBotToken', token)
  }

  const handleSlackChannelChange = (channel: string) => {
    setSlackChannelId(channel)
    localStorage.setItem('slackChannelId', channel)
  }

  const testSlackMessage = async () => {
    if (!slackBotToken || !slackChannelId) {
      setMessage({ text: '슬랙 Bot Token과 채널 ID를 먼저 입력해주세요.', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setIsSendingToSlack(true)
    setMessage({ text: '테스트 메시지 전송 중...', type: 'success' })

    try {
      const testText = `🧪 슬랙 연동 테스트 메시지\n\n현재 시간: ${new Date().toLocaleString('ko-KR')}\n\n✅ chat:write 권한이 정상적으로 작동합니다!`

      const response = await fetch('/api/slack/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackToken: slackBotToken,
          channelId: slackChannelId,
          text: testText
        })
      })

      const result = await response.json()

      if (result.ok) {
        setMessage({ text: '✅ 테스트 메시지 전송 완료!', type: 'success' })
      } else {
        setMessage({ text: `테스트 실패: ${result.error}`, type: 'error' })
      }
    } catch (error) {
      setMessage({ text: `테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, type: 'error' })
    } finally {
      setIsSendingToSlack(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  const sendLinkToSlack = async () => {
    if (!slackBotToken || !slackChannelId) {
      setMessage({ text: '슬랙 Bot Token과 채널 ID를 먼저 입력해주세요.', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setIsSendingToSlack(true)
    setMessage({ text: '슬랙으로 링크 전송 중...', type: 'success' })

    try {
      const response = await fetch('/api/slack/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackToken: slackBotToken,
          channelId: slackChannelId,
          customMessage: slackMessage
        })
      })

      const result = await response.json()

      if (result.ok && result.slackSent) {
        setMessage({
          text: `✅ 슬랙 전송 완료`,
          type: 'success'
        })
      } else {
        setMessage({ text: `슬랙 전송 실패: ${result.error}`, type: 'error' })
      }
    } catch (error) {
      setMessage({ text: `슬랙 전송 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, type: 'error' })
    } finally {
      setIsSendingToSlack(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  return (
    <main>
      {message && (
        <div className={`global-snackbar ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="container">
        <header className="header">
          <h1>💬 슬랙 전송</h1>
          <p>슬랙 연동 설정 및 리포트 링크를 전송합니다.</p>
        </header>

        <div className="slack-settings-section">
          <div className="command-header">
            <h2>🔧 슬랙 연동 설정</h2>
            <p>슬랙으로 리포트를 전송하려면 Bot Token과 채널 ID를 입력하세요</p>
          </div>
          <div className="input-row">
            <div className="name-input-container">
              <label htmlFor="slackToken">🔑 Slack Bot Token</label>
              <input
                id="slackToken"
                type="text"
                value={slackBotToken}
                onChange={(e) => handleSlackTokenChange(e.target.value)}
                placeholder="xoxb-로 시작하는 Bot Token"
                className="name-input"
              />
            </div>
            <div className="name-input-container">
              <label htmlFor="slackChannel">📢 채널 ID</label>
              <input
                id="slackChannel"
                type="text"
                value={slackChannelId}
                onChange={(e) => handleSlackChannelChange(e.target.value)}
                placeholder="C로 시작하는 채널 ID (예: C1234567890)"
                className="name-input"
              />
            </div>
          </div>
          <div className="command-instructions">
            <p>💡 Bot Token은 팀장에게 받으세요</p>
            <p>💡 채널 ID는 슬랙 채널 우클릭 → '채널 세부정보 보기' → 맨 아래에서 확인</p>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={testSlackMessage}
              disabled={isSendingToSlack || !slackBotToken || !slackChannelId}
              style={{
                padding: '0.75rem 1.5rem',
                background: isSendingToSlack ? '#94a3b8' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: (!slackBotToken || !slackChannelId || isSendingToSlack) ? 'not-allowed' : 'pointer',
                opacity: (!slackBotToken || !slackChannelId) ? 0.5 : 1
              }}
            >
              {isSendingToSlack ? '⏳ 전송 중...' : '🧪 연동 테스트'}
            </button>
          </div>
        </div>

        <div className="slack-settings-section" style={{ marginTop: '2rem' }}>
          <div className="command-header">
            <h2>🔗 슬랙 메세지 전송</h2>
            <p>슬랙 채널로 메세지를 전송합니다</p>
          </div>
          <div style={{ padding: '0 1rem', marginTop: '1rem' }}>
            <label htmlFor="slackMessage" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#334155' }}>✏️ 전송 메시지</label>
            <textarea
              id="slackMessage"
              value={slackMessage}
              onChange={(e) => setSlackMessage(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.6'
              }}
            />
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={sendLinkToSlack}
              disabled={isSendingToSlack || !slackBotToken || !slackChannelId}
              style={{
                padding: '1rem 2.5rem',
                background: isSendingToSlack ? '#94a3b8' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: (!slackBotToken || !slackChannelId || isSendingToSlack) ? 'not-allowed' : 'pointer',
                opacity: (!slackBotToken || !slackChannelId) ? 0.5 : 1,
                boxShadow: (!slackBotToken || !slackChannelId) ? 'none' : '0 10px 30px rgba(139, 92, 246, 0.4)',
                transition: 'all 0.2s ease'
              }}
            >
              {isSendingToSlack ? '⏳ 전송 중...' : '🔗 슬랙으로 리포트 링크 전송'}
            </button>
          </div>
          {(!slackBotToken || !slackChannelId) && (
            <div className="command-instructions" style={{ marginTop: '1rem' }}>
              <p>⚠️ 위에서 Bot Token과 채널 ID를 먼저 설정해주세요</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
