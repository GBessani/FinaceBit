import { NextResponse } from "next/server"
import { rateLimit, getIP } from "@/lib/rate-limit"

const BRAPI_TOKEN = process.env.BRAPI_TOKEN

export async function GET(request: Request) {
  // Rate limit: 60 consultas por hora por IP
  const ip = getIP(request)
  const limit = rateLimit(`investments:${ip}`, { limit: 60, windowMs: 60 * 60 * 1000 })

  if (!limit.success) {
    return NextResponse.json(
      { error: `Limite de consultas atingido. Tente novamente em ${limit.resetIn} segundos.` },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get("tickers")
  const cryptos = searchParams.get("cryptos")

  const results: Record<string, { price: number; change24h: number; name: string }> = {}

  // ─── Criptomoedas via CoinGecko ────────────────────────
  if (cryptos) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptos}&vs_currencies=brl&include_24hr_change=true`,
        { next: { revalidate: 60 } }
      )
      const data = await res.json()
      for (const [id, values] of Object.entries(data as Record<string, Record<string, number>>)) {
        results[id] = {
          price: values.brl,
          change24h: values.brl_24h_change ?? 0,
          name: id,
        }
      }
    } catch (e) {
      console.error("CoinGecko error:", e)
    }
  }

  // ─── Ações/Fundos B3 via brapi ─────────────────────────
  if (tickers && BRAPI_TOKEN) {
    try {
      const res = await fetch(
        `https://brapi.dev/api/quote/${tickers}?token=${BRAPI_TOKEN}`,
        { next: { revalidate: 60 } }
      )
      const data = await res.json()
      for (const quote of data.results ?? []) {
        results[quote.symbol] = {
          price: quote.regularMarketPrice,
          change24h: quote.regularMarketChangePercent ?? 0,
          name: quote.shortName ?? quote.symbol,
        }
      }
    } catch (e) {
      console.error("brapi error:", e)
    }
  }

  return NextResponse.json(results)
}
