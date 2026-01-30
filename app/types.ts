// ccusage daily --json 출력 형식
export interface ModelBreakdown {
  modelName: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  cost: number
}

export interface DailyData {
  date: string
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
  modelsUsed: string[]
  modelBreakdowns: ModelBreakdown[]
}

export interface UsageTotals {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalCost: number
  totalTokens: number
}

export interface CcusageData {
  daily: DailyData[]
  totals: UsageTotals
}

// 팀원 데이터 (파일명에서 추출한 이름 포함)
export interface TeamMemberData {
  name: string
  fileName: string
  data: CcusageData
}

// 대시보드 통계
export interface TeamStats {
  totalMembers: number
  totalCost: number
  totalTokens: number
  avgCostPerMember: number
  avgTokensPerMember: number
  members: {
    name: string
    cost: number
    tokens: number
    percentage: number
  }[]
  weeklyTrends: {
    week: string
    totalCost: number
    totalTokens: number
  }[]
}
