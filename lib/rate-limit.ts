// 간단한 인메모리 Rate Limiter
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// 주기적으로 만료된 엔트리 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // 1분마다 정리

export interface RateLimitConfig {
  windowMs: number      // 시간 윈도우 (밀리초)
  maxRequests: number   // 최대 요청 수
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

// 기본 설정: 1분에 10회
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1분
  maxRequests: 10
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // 새 요청이거나 윈도우 시간이 지난 경우
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    }
  }

  // 기존 윈도우 내 요청
  if (entry.count < config.maxRequests) {
    entry.count++
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  // 한도 초과
  return {
    allowed: false,
    remaining: 0,
    resetTime: entry.resetTime
  }
}

// IP 주소 추출 (Next.js Request에서)
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  return 'unknown'
}

// Rate limit 응답 생성
export function createRateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
  return new Response(
    JSON.stringify({
      ok: false,
      error: '요청 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.',
      retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter)
      }
    }
  )
}
