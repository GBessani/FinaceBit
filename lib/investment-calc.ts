import { Investment } from "./types"

// ─── Taxas de referência (aproximadas) ───────────────
export const CDI_RATE_ANNUAL = 0.1065   // 10.65% a.a.
export const SELIC_RATE_ANNUAL = 0.1075 // 10.75% a.a.
export const IPCA_RATE_ANNUAL = 0.0483  // 4.83% a.a.

// ─── IOF Regressivo (dias 1-30) ───────────────────────
const IOF_TABLE = [
  96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,
  30,26,23,20,16,13,10,6,3,0
]

export function getIOFRate(days: number): number {
  if (days <= 0) return 0.96
  if (days >= 30) return 0
  return IOF_TABLE[days - 1] / 100
}

export function getIRRate(days: number, assetType: string): number {
  if (assetType === "crypto") return 0.15
  if (assetType === "stock" || assetType === "fund") return 0.15
  if (days <= 180) return 0.225
  if (days <= 360) return 0.20
  if (days <= 720) return 0.175
  return 0.15
}

export function calcFixedIncomeYield(investment: Investment) {
  const empty = {
    grossYield: 0, netYield: 0,
    currentValue: investment.investedAmount ?? 0,
    netValue: investment.investedAmount ?? 0,
    iofAmount: 0, irAmount: 0, days: 0, irRate: 0, iofRate: 0
  }

  if (!investment.investedAt || !investment.rate || !investment.rateIndex) return empty

  const start = new Date(investment.investedAt + "T00:00:00")
  const now = new Date()
  const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  let baseRate = CDI_RATE_ANNUAL
  if (investment.rateIndex === "SELIC") baseRate = SELIC_RATE_ANNUAL
  if (investment.rateIndex === "IPCA") baseRate = IPCA_RATE_ANNUAL
  if (investment.rateIndex === "prefixado") baseRate = investment.rate / 100

  const effectiveRate = investment.rateIndex === "prefixado"
    ? baseRate
    : (investment.rate / 100) * baseRate

  const dailyRate = Math.pow(1 + effectiveRate, 1 / 252) - 1
  const grossYield = (investment.investedAmount ?? 0) * (Math.pow(1 + dailyRate, days) - 1)
  const currentValue = (investment.investedAmount ?? 0) + grossYield

  const iofRate = getIOFRate(days)
  const iofAmount = grossYield * iofRate
  const irRate = getIRRate(days, "fixed_income")
  const irBase = grossYield - iofAmount
  const irAmount = irBase > 0 ? irBase * irRate : 0
  const netYield = grossYield - iofAmount - irAmount
  const netValue = (investment.investedAmount ?? 0) + netYield

  return { grossYield, netYield, currentValue, netValue, iofAmount, irAmount, days, irRate, iofRate }
}

export function calcVariableIR(investment: Investment, currentPrice: number) {
  const currentValue = investment.quantity * currentPrice
  const profit = currentValue - (investment.investedAmount ?? 0)
  const days = investment.investedAt
    ? Math.floor((new Date().getTime() - new Date(investment.investedAt + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (profit <= 0) return { profit, irAmount: 0, netProfit: profit, irRate: 0, days }

  const irRate = getIRRate(days, investment.assetType)
  const irAmount = profit * irRate
  const netProfit = profit - irAmount

  return { profit, irAmount, netProfit, irRate, days }
}

export function formatDays(days: number): string {
  if (days < 30) return `${days} dias`
  if (days < 365) return `${Math.floor(days / 30)} meses`
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  return months > 0 ? `${years}a ${months}m` : `${years} ano${years > 1 ? "s" : ""}`
}
// ─── Calcula rendimento da caixinha considerando cada movimentação ──
export function calcSavingsBoxYield(
  transactions: { type: "buy" | "sell"; total: number; date: string }[],
  rate: number,
  rateIndex: string
): { grossYield: number; netYield: number; balance: number; netValue: number; days: number; iofAmount: number; irAmount: number; iofRate: number; irRate: number } {
  if (!transactions.length) return { grossYield: 0, netYield: 0, balance: 0, netValue: 0, days: 0, iofAmount: 0, irAmount: 0, iofRate: 0, irRate: 0 }

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  let baseRate = CDI_RATE_ANNUAL
  if (rateIndex === "SELIC") baseRate = SELIC_RATE_ANNUAL
  if (rateIndex === "IPCA") baseRate = IPCA_RATE_ANNUAL
  if (rateIndex === "prefixado") baseRate = rate / 100

  const effectiveRate = rateIndex === "prefixado" ? baseRate : (rate / 100) * baseRate
  const dailyRate = Math.pow(1 + effectiveRate, 1 / 252) - 1

  // Simula saldo dia a dia entre movimentações
  // Para cada período entre movimentações, calcula rendimento sobre o saldo do período
  let totalGrossYield = 0
  let currentBalance = 0

  for (let i = 0; i < sorted.length; i++) {
    const tx = sorted[i]
    const txDate = new Date(tx.date + "T00:00:00")

    // Rendimento do saldo atual até esta movimentação (ou até hoje se for a última)
    const nextDate = i + 1 < sorted.length
      ? new Date(sorted[i + 1].date + "T00:00:00")
      : now
    const days = Math.floor((nextDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24))

    // Aplica movimentação
    currentBalance += tx.type === "buy" ? tx.total : -tx.total
    currentBalance = Math.max(0, currentBalance)

    // Rendimento do novo saldo pelo período até próxima movimentação
    if (currentBalance > 0 && days > 0) {
      totalGrossYield += currentBalance * (Math.pow(1 + dailyRate, days) - 1)
    }
  }

  const balance = currentBalance
  const firstTx = sorted[0]
  const totalDays = Math.floor((now.getTime() - new Date(firstTx.date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
  const iofRate = getIOFRate(Math.min(totalDays, 30))
  const iofAmount = totalGrossYield * iofRate
  const irRate = getIRRate(totalDays, "fixed_income")
  const irBase = totalGrossYield - iofAmount
  const irAmount = irBase > 0 ? irBase * irRate : 0
  const netYield = totalGrossYield - iofAmount - irAmount
  const netValue = balance + netYield

  return { grossYield: totalGrossYield, netYield, balance, netValue, days: totalDays, iofAmount, irAmount, iofRate, irRate }
}
// ─── Calcula stats da carteira considerando cada movimentação ──────
export interface PortfolioStats {
  totalInvested: number   // total gasto nas compras
  totalSold: number       // total recebido nas vendas
  quantity: number        // quantidade atual
  avgPrice: number        // preço médio de compra
  profit: number          // lucro bruto (valor atual + vendas - compras)
  irAmount: number        // IR sobre o lucro
  netProfit: number       // lucro líquido
  irRate: number
}

export function calcPortfolioStats(
  transactions: { type: "buy" | "sell"; quantity: number; price: number; total: number; date: string }[],
  currentPrice: number,
  assetType: string
): PortfolioStats {
  if (!transactions.length) {
    return { totalInvested: 0, totalSold: 0, quantity: 0, avgPrice: 0, profit: 0, irAmount: 0, netProfit: 0, irRate: 0 }
  }

  const buys = transactions.filter(t => t.type === "buy")
  const sells = transactions.filter(t => t.type === "sell")

  const totalInvested = buys.reduce((s, t) => s + t.total, 0)
  const totalSold = sells.reduce((s, t) => s + t.total, 0)
  const totalBuyQty = buys.reduce((s, t) => s + t.quantity, 0)
  const totalSellQty = sells.reduce((s, t) => s + t.quantity, 0)
  const quantity = Math.max(0, totalBuyQty - totalSellQty)
  const avgPrice = totalBuyQty > 0 ? totalInvested / totalBuyQty : 0

  const currentValue = quantity * currentPrice
  const profit = currentValue + totalSold - totalInvested

  // IR: usa data da primeira compra para calcular prazo
  const firstBuy = buys.sort((a, b) => a.date.localeCompare(b.date))[0]
  const days = firstBuy
    ? Math.floor((new Date().getTime() - new Date(firstBuy.date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const irRate = getIRRate(days, assetType)
  const irAmount = profit > 0 ? profit * irRate : 0
  const netProfit = profit - irAmount

  return { totalInvested, totalSold, quantity, avgPrice, profit, irAmount, netProfit, irRate }
}

// ─── Calcula rendimento da renda fixa por movimentação ─────────────
export function calcFixedIncomeByTxs(
  transactions: { type: "buy" | "sell"; total: number; date: string }[],
  rate: number,
  rateIndex: string
) {
  return calcSavingsBoxYield(transactions, rate, rateIndex)
}