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

export interface Totals {
  inputTokens: number
  outputTokens: number
  cacheCreationTokens: number
  cacheReadTokens: number
  totalTokens: number
  totalCost: number
}

export interface CcusageData {
  daily: DailyData[]
  totals: Totals
}

export interface TeamMemberData {
  name: string
  fileName: string
  data: CcusageData
}

export interface MemberStat {
  name: string
  cost: number
  tokens: number
  percentage: number
}

export interface WeeklyTrend {
  week: string
  totalCost: number
  totalTokens: number
}

export interface TeamStats {
  totalMembers: number
  totalCost: number
  totalTokens: number
  avgCostPerMember: number
  avgTokensPerMember: number
  members: MemberStat[]
  weeklyTrends: WeeklyTrend[]
}
