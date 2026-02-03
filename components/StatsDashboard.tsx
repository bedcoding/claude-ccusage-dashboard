'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface StatsDashboardProps {
  selectedIds: string[]
  isExpanded: boolean
  onToggle: () => void
}

interface StatsData {
  dailyData: Array<{
    date: string
    totalCost: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
  }>
  userStats: Array<{
    name: string
    totalCost: number
    totalTokens: number
  }>
  modelData: Array<{
    name: string
    cost: number
    tokens: number
  }>
  totals: {
    totalCost: number
    totalTokens: number
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export default function StatsDashboard({ selectedIds, isExpanded, onToggle }: StatsDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [activeTab, setActiveTab] = useState<'daily' | 'users' | 'models'>('daily')

  useEffect(() => {
    if (isExpanded && selectedIds.length > 0) {
      fetchStats()
    }
  }, [selectedIds, isExpanded])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds: selectedIds })
      })
      const data = await res.json()
      if (res.ok) {
        setStats(data)
      }
    } catch (err) {
      console.error('통계 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCost = (value: number) => `$${value.toFixed(2)}`
  const formatTokens = (value: number) => `${(value / 1000000).toFixed(2)}M`

  return (
    <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
      {/* 토글 헤더 */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <span className="font-bold">통계 대시보드</span>
          {selectedIds.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
              {selectedIds.length}개 선택됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">
            {isExpanded ? '접기' : '클릭하여 펼치기'}
          </span>
          <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* 펼쳐진 내용 */}
      {isExpanded && (
        <div className="p-6">
          {selectedIds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>📊 리포트를 선택하면 통계를 확인할 수 있습니다.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">통계 로딩 중...</p>
            </div>
          ) : stats ? (
            <>
              {/* 탭 버튼 */}
              <div className="flex gap-2 mb-6 border-b pb-4">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'daily'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📅 일별 추이
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'users'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  👥 사용자별
                </button>
                <button
                  onClick={() => setActiveTab('models')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'models'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🤖 모델별
                </button>
              </div>

              {/* 일별 추이 차트 */}
              {activeTab === 'daily' && stats.dailyData.length > 0 && (
                <div className="space-y-6">
                  {/* 일별 비용 추이 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">💰 일별 비용 추이</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={stats.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => value.slice(5)}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                          formatter={(value) => [formatCost(value as number), '비용']}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="totalCost"
                          name="비용 ($)"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ fill: '#3B82F6' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 일별 토큰 추이 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🔢 일별 토큰 사용량</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => value.slice(5)}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            formatTokens(value as number),
                            name === 'inputTokens' ? 'Input' : 'Output'
                          ]}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="inputTokens" name="Input" fill="#10B981" stackId="tokens" />
                        <Bar dataKey="outputTokens" name="Output" fill="#F59E0B" stackId="tokens" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 사용자별 차트 */}
              {activeTab === 'users' && stats.userStats.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 사용자별 비용 바 차트 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">💰 사용자별 비용</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.userStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip formatter={(value) => [formatCost(value as number), '비용']} />
                        <Bar dataKey="totalCost" fill="#3B82F6">
                          {stats.userStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 사용자별 비용 비율 파이 차트 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 비용 비율</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.userStats}
                          dataKey="totalCost"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) =>
                            `${(name || '').length > 8 ? (name || '').slice(0, 8) + '..' : name} (${((percent || 0) * 100).toFixed(0)}%)`
                          }
                          labelLine={{ strokeWidth: 1 }}
                        >
                          {stats.userStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCost(value as number), '비용']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 모델별 차트 */}
              {activeTab === 'models' && stats.modelData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 모델별 비용 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🤖 모델별 비용</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.modelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tickFormatter={(value) => `$${value}`} />
                        <Tooltip formatter={(value) => [formatCost(value as number), '비용']} />
                        <Bar dataKey="cost" fill="#8B5CF6">
                          {stats.modelData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 모델별 비율 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 모델 사용 비율</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.modelData}
                          dataKey="cost"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) =>
                            `${(name || '').length > 10 ? (name || '').slice(0, 10) + '..' : name} (${((percent || 0) * 100).toFixed(0)}%)`
                          }
                          labelLine={{ strokeWidth: 1 }}
                        >
                          {stats.modelData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatCost(value as number), '비용']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* 요약 통계 */}
              <div className="mt-6 pt-6 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600">총 비용</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${stats.totals.totalCost.toFixed(2)}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600">총 토큰</div>
                  <div className="text-2xl font-bold text-green-600">
                    {(stats.totals.totalTokens / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600">기간</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.dailyData.length}일
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-600">사용 모델</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.modelData.length}개
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>통계를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
