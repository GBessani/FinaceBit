// Rate limiter simples em memória
// Usa Map com janela deslizante por IP

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  limit: number      // máximo de requisições
  windowMs: number   // janela em millisegundos
}

export function rateLimit(key: string, options: RateLimitOptions): {
  success: boolean
  remaining: number
  resetIn: number   // segundos até reset
} {
  const now = Date.now()
  const entry = store.get(key)

  // Limpa entrada expirada
  if (entry && now > entry.resetAt) {
    store.delete(key)
  }

  const current = store.get(key)

  if (!current) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { success: true, remaining: options.limit - 1, resetIn: Math.ceil(options.windowMs / 1000) }
  }

  if (current.count >= options.limit) {
    const resetIn = Math.ceil((current.resetAt - now) / 1000)
    return { success: false, remaining: 0, resetIn }
  }

  current.count++
  return {
    success: true,
    remaining: options.limit - current.count,
    resetIn: Math.ceil((current.resetAt - now) / 1000),
  }
}

// Extrai IP do request de forma confiável (Vercel)
export function getIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")
  if (forwarded) return forwarded.split(",")[0].trim()
  if (real) return real.trim()
  return "unknown"
}
