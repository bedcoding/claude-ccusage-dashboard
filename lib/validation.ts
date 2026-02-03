import { z } from 'zod'

// 모델 breakdown 스키마
export const ModelBreakdownSchema = z.object({
  modelName: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  cost: z.number()
})

// 일별 데이터 스키마
export const DailyDataSchema = z.object({
  date: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  modelsUsed: z.array(z.string()),
  modelBreakdowns: z.array(ModelBreakdownSchema)
})

// 총계 스키마
export const UsageTotalsSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationTokens: z.number(),
  cacheReadTokens: z.number(),
  totalCost: z.number(),
  totalTokens: z.number()
})

// ccusage 데이터 전체 스키마
export const CcusageDataSchema = z.object({
  daily: z.array(DailyDataSchema),
  totals: UsageTotalsSchema
})

// Slack 설정 스키마
export const SlackConfigSchema = z.object({
  slackToken: z.string().min(1).regex(/^xoxb-/, { message: 'Bot Token은 xoxb-로 시작해야 합니다' }),
  channelId: z.string().min(1).regex(/^[A-Z0-9]+$/, { message: '올바른 채널 ID 형식이 아닙니다' })
})

// 검증 결과 타입
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ccusage 데이터 검증 함수
export function validateCcusageData(data: unknown): ValidationResult<z.infer<typeof CcusageDataSchema>> {
  const result = CcusageDataSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
  return { success: false, error: `데이터 형식 오류: ${errors}` }
}

// Slack 설정 검증 함수
export function validateSlackConfig(data: unknown): ValidationResult<z.infer<typeof SlackConfigSchema>> {
  const result = SlackConfigSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errors = result.error.issues.map((e: z.ZodIssue) => e.message).join(', ')
  return { success: false, error: errors }
}
