'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="landing-page">
      <div className="landing-container">
        <header className="landing-header">
          <h1>🚀 Claude Max 팀 사용량 대시보드</h1>
          <p>팀원들의 Claude Max 사용량을 관리하고 조회하세요</p>
        </header>

        <div className="button-grid">
          <button
            onClick={() => router.push('/upload')}
            className="landing-button save-button"
          >
            <div className="button-icon">💾</div>
            <div className="button-title">사용량 전송</div>
            <div className="button-description">
              Claude 사용량 데이터를 수동으로 저장합니다.
            </div>
          </button>

          <button
            onClick={() => router.push('/guide')}
            className="landing-button guide-button"
          >
            <div className="button-icon">⚡</div>
            <div className="button-title">자동화 가이드</div>
            <div className="button-description">
              Claude 사용량 데이터를 맥북 CronTab을 써서 자동으로 DB에 저장하는 방법을 가이드합니다.
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="landing-button dashboard-button"
          >
            <div className="button-icon">📈</div>
            <div className="button-title">대시보드</div>
            <div className="button-description">
              월별 팀/팀원 사용량을 한눈에 확인하세요.
            </div>
          </button>

          <button
            onClick={() => router.push('/reports')}
            className="landing-button view-button"
          >
            <div className="button-icon">📊</div>
            <div className="button-title">엑셀 다운로드</div>
            <div className="button-description">
              저장된 데이터를 엑셀 파일로 다운로드합니다.
            </div>
          </button>
        </div>
      </div>

      <style jsx>{`
        .landing-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }

        .landing-container {
          max-width: 800px;
          width: 100%;
        }

        .landing-header {
          text-align: center;
          margin-bottom: 4rem;
          color: white;
        }

        .landing-header h1 {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .landing-header p {
          font-size: 1.25rem;
          opacity: 0.9;
        }

        .button-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2rem;
        }

        .landing-button {
          border-radius: 20px;
          padding: 3rem 2rem;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: none;
          font-family: inherit;
          width: 100%;
          outline: none;
        }

        .landing-button:hover {
          transform: translateY(-8px) scale(1.02);
        }

        .save-button {
          background: #3b82f6;
          color: white;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.5);
        }

        .save-button:hover {
          background: #2563eb;
          box-shadow: 0 20px 50px rgba(59, 130, 246, 0.7);
        }

        .view-button {
          background: #10b981;
          color: white;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.5);
        }

        .view-button:hover {
          background: #059669;
          box-shadow: 0 20px 50px rgba(16, 185, 129, 0.7);
        }

        .guide-button {
          background: #f59e0b;
          color: white;
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.5);
        }

        .guide-button:hover {
          background: #d97706;
          box-shadow: 0 20px 50px rgba(245, 158, 11, 0.7);
        }

        .dashboard-button {
          background: linear-gradient(135deg, #ec4899, #f472b6);
          color: white;
          box-shadow: 0 10px 30px rgba(236, 72, 153, 0.5);
        }

        .dashboard-button:hover {
          background: linear-gradient(135deg, #db2777, #ec4899);
          box-shadow: 0 20px 50px rgba(236, 72, 153, 0.7);
        }

        .button-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }

        .button-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }

        .button-description {
          font-size: 1rem;
          opacity: 0.9;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .landing-header h1 {
            font-size: 2rem;
          }

          .landing-header p {
            font-size: 1rem;
          }

          .button-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .landing-button {
            padding: 2rem 1.5rem;
          }

          .button-icon {
            font-size: 3rem;
          }

          .button-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </main>
  )
}
