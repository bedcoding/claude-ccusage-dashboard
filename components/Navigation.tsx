'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  // 메인 페이지에서는 네비게이션 숨기기
  if (pathname === '/') {
    return null
  }

  const navItems = [
    { label: '사용량 전송', href: '/upload', icon: '💾', color: '#3b82f6' },
    { label: '사용량 조회', href: '/reports', icon: '📊', color: '#10b981' },
    { label: '자동화 가이드', href: '/guide', icon: '⚡', color: '#f59e0b' },
  ]

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-tabs">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-tab ${isActive ? 'active' : ''}`}
                style={isActive ? {
                  background: item.color,
                  color: 'white',
                  boxShadow: `0 10px 30px ${item.color}80`
                } : {}}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <style jsx global>{`
        .navigation {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          z-index: 1000;
          padding: 0.75rem 0;
        }

        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .nav-tabs {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .nav-tab {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          text-decoration: none;
          background: white;
          color: #64748b;
          font-weight: 500;
          font-size: 0.9rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .nav-tab:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .nav-tab.active {
          border-color: transparent;
        }

        .nav-icon {
          font-size: 1.1rem;
        }

        .nav-label {
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .nav-container {
            padding: 0 1rem;
          }

          .nav-tabs {
            gap: 0.75rem;
            justify-content: flex-start;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.5rem;
          }

          .nav-tab {
            padding: 0.5rem 1rem;
          }

          .nav-icon {
            font-size: 1rem;
          }

          .nav-label {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </nav>
  )
}
