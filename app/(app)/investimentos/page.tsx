"use client"

import { useFinance } from "@/contexts/finance-context"
import { Investment, AssetType } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { useEffect, useState, useCallback, useRef } from "react"
import {
  TrendingUp, TrendingDown, Plus, Trash2, Pencil,
  RefreshCw, Bitcoin, BarChart2, LineChart, Loader2,
} from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"

interface PriceData {
  price: number
  change24h: number
  name: string
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  crypto: "Criptomoeda",
  stock: "Ação B3",
  fund: "Fundo/ETF",
}

const ASSET_TYPE_ICONS = {
  crypto: Bitcoin,
  stock: BarChart2,
  fund: LineChart,
}

interface FormState {
  name: string
  ticker: string
  assetType: AssetType
  quantity: string       // string para aceitar vírgula
  investedAmount: string // valor total investido em R$
  notes: string
}

const emptyForm: FormState = {
  name: "", ticker: "", assetType: "crypto",
  quantity: "", investedAmount: "", notes: "",
}

function parseDecimal(val: string): number {
  return parseFloat(val.replace(",", ".")) || 0
}

export default function InvestimentosPage() {
  const { data, addInvestment, updateInvestment, deleteInvestment, isLoaded } = useFinance()
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isFetchingCurrentPrice, setIsFetchingCurrentPrice] = useState(false)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const tickerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Busca preço do ticker enquanto usuário digita ─────────
  const fetchCurrentPrice = useCallback(async (ticker: string, assetType: AssetType) => {
    if (!ticker) { setCurrentPrice(null); return }
    setIsFetchingCurrentPrice(true)
    try {
      const params = new URLSearchParams()
      if (assetType === "crypto") params.set("cryptos", ticker)
      else params.set("tickers", ticker)

      const res = await fetch(`/api/investments?${params}`)
      const data = await res.json()
      const price = data[ticker]?.price ?? data[ticker.toUpperCase()]?.price ?? null
      setCurrentPrice(price)
    } catch {
      setCurrentPrice(null)
    } finally {
      setIsFetchingCurrentPrice(false)
    }
  }, [])

  useEffect(() => {
    if (!showForm) return
    if (tickerDebounce.current) clearTimeout(tickerDebounce.current)
    tickerDebounce.current = setTimeout(() => {
      fetchCurrentPrice(form.ticker, form.assetType)
    }, 800)
  }, [form.ticker, form.assetType, showForm, fetchCurrentPrice])

  // ─── Quando quantidade muda → calcula valor investido ──────
  function handleQuantityChange(val: string) {
    setForm(prev => {
      const qty = parseDecimal(val)
      const invested = currentPrice && qty > 0 ? (qty * currentPrice).toFixed(2) : prev.investedAmount
      return { ...prev, quantity: val, investedAmount: invested }
    })
  }

  // ─── Quando valor investido muda → calcula quantidade ──────
  function handleInvestedChange(val: string) {
    setForm(prev => {
      const invested = parseDecimal(val)
      const qty = currentPrice && invested > 0 ? (invested / currentPrice).toFixed(8) : prev.quantity
      return { ...prev, investedAmount: val, quantity: qty }
    })
  }

  // ─── Busca preços da carteira ─────────────────────────────
  const fetchPrices = useCallback(async () => {
    if (data.investments.length === 0) return
    setIsLoadingPrices(true)
    const cryptos = data.investments.filter(i => i.assetType === "crypto").map(i => i.ticker).join(",")
    const stocks = data.investments.filter(i => i.assetType !== "crypto").map(i => i.ticker).join(",")
    const params = new URLSearchParams()
    if (cryptos) params.set("cryptos", cryptos)
    if (stocks) params.set("tickers", stocks)
    try {
      const res = await fetch(`/api/investments?${params}`)
      const d = await res.json()
      setPrices(d)
    } catch (e) {
      console.error("Erro ao buscar preços:", e)
    } finally {
      setIsLoadingPrices(false)
    }
  }, [data.investments])

  useEffect(() => {
    if (isLoaded) fetchPrices()
  }, [isLoaded, fetchPrices])

  function openAdd() {
    setForm(emptyForm)
    setCurrentPrice(null)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(inv: Investment) {
    setForm({
      name: inv.name, ticker: inv.ticker, assetType: inv.assetType,
      quantity: String(inv.quantity),
      investedAmount: String((inv.quantity * inv.avgPrice).toFixed(2)),
      notes: inv.notes ?? "",
    })
    setCurrentPrice(null)
    setEditingId(inv.id)
    setShowForm(true)
  }

  async function handleSave() {
    const qty = parseDecimal(form.quantity)
    const invested = parseDecimal(form.investedAmount)
    if (!form.name || !form.ticker || qty <= 0 || invested <= 0) return

    const avgPrice = invested / qty

    if (editingId) {
      await updateInvestment({ name: form.name, ticker: form.ticker, assetType: form.assetType, quantity: qty, avgPrice, notes: form.notes, id: editingId })
    } else {
      await addInvestment({ name: form.name, ticker: form.ticker, assetType: form.assetType, quantity: qty, avgPrice, notes: form.notes, id: "" })
    }
    setShowForm(false)
    setEditingId(null)
    setTimeout(() => fetchPrices(), 500)
  }

  const getInvestmentStats = (inv: Investment) => {
    const priceData = prices[inv.ticker] ?? prices[inv.ticker.toUpperCase()]
    const invested = inv.quantity * inv.avgPrice
    const currentPrice = priceData?.price ?? null
    const currentValue = currentPrice ? inv.quantity * currentPrice : null
    const profit = currentValue !== null ? currentValue - invested : null
    const profitPct = profit !== null ? (profit / invested) * 100 : null
    return { invested, currentValue, profit, profitPct, change24h: priceData?.change24h ?? null }
  }

  const totals = data.investments.reduce((acc, inv) => {
    const { invested, currentValue } = getInvestmentStats(inv)
    acc.invested += invested
    if (currentValue !== null) acc.current += currentValue
    return acc
  }, { invested: 0, current: 0 })

  const totalProfit = totals.current - totals.invested
  const totalProfitPct = totals.invested > 0 ? (totalProfit / totals.invested) * 100 : 0

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">Acompanhe sua carteira em tempo real</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPrices} disabled={isLoadingPrices}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoadingPrices ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      {data.investments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Total Investido</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.invested)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Valor Atual</p>
            <p className="text-2xl font-bold">{totals.current > 0 ? formatCurrency(totals.current) : "—"}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Lucro / Prejuízo</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {totals.current > 0 ? formatCurrency(totalProfit) : "—"}
              </p>
              {totals.current > 0 && (
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${totalProfit >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                  {totalProfit >= 0 ? "+" : ""}{totalProfitPct.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {data.investments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum investimento cadastrado</h3>
          <p className="text-muted-foreground mb-6">Adicione seus investimentos para acompanhar a carteira</p>
          <button onClick={openAdd} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Adicionar investimento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.investments.map((inv) => {
            const { invested, currentValue, profit, profitPct, change24h } = getInvestmentStats(inv)
            const Icon = ASSET_TYPE_ICONS[inv.assetType]
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{inv.name}</p>
                        <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">{inv.ticker.toUpperCase()}</span>
                        <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">{ASSET_TYPE_LABELS[inv.assetType]}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inv.quantity} unid. × {formatCurrency(inv.avgPrice)} médio
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Investido</p>
                      <p className="font-medium">{formatCurrency(invested)}</p>
                    </div>
                    {currentValue !== null ? (
                      <>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Atual</p>
                          <p className="font-medium">{formatCurrency(currentValue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Resultado</p>
                          <div className="flex items-center gap-1 justify-end">
                            {profit! >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                            <p className={`font-semibold ${profit! >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                              {profitPct! >= 0 ? "+" : ""}{profitPct!.toFixed(2)}%
                            </p>
                          </div>
                          {change24h !== null && (
                            <p className={`text-xs ${change24h >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                              24h: {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Preço indisponível</p>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(inv)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteId(inv.id)} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir investimento?"
        description="O investimento será removido permanentemente."
        onConfirm={() => { deleteId && deleteInvestment(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-4">{editingId ? "Editar Investimento" : "Novo Investimento"}</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo de ativo</label>
                <select value={form.assetType}
                  onChange={e => setForm(prev => ({ ...prev, assetType: e.target.value as AssetType, quantity: "", investedAmount: "" }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="crypto">Criptomoeda</option>
                  <option value="stock">Ação B3</option>
                  <option value="fund">Fundo/ETF</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Nome</label>
                <input value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={form.assetType === "crypto" ? "Ex: Bitcoin" : "Ex: Petrobras"}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {form.assetType === "crypto" ? "ID CoinGecko" : "Ticker B3"}
                </label>
                <div className="relative">
                  <input value={form.ticker}
                    onChange={e => setForm(prev => ({ ...prev, ticker: e.target.value.toLowerCase(), quantity: "", investedAmount: "" }))}
                    placeholder={form.assetType === "crypto" ? "Ex: bitcoin" : "Ex: PETR4"}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 pr-8" />
                  {isFetchingCurrentPrice && (
                    <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-2.5 text-muted-foreground" />
                  )}
                </div>
                {currentPrice !== null && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    ✓ Preço atual: {formatCurrency(currentPrice)}
                  </p>
                )}
                {form.assetType === "crypto" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Use o ID da CoinGecko: <a href="https://www.coingecko.com" target="_blank" rel="noreferrer" className="text-primary underline">coingecko.com</a>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Quantidade</label>
                  <input type="text" inputMode="decimal" value={form.quantity}
                    onChange={e => handleQuantityChange(e.target.value)}
                    placeholder="Ex: 0,00033533"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Valor investido (R$)</label>
                  <input type="text" inputMode="decimal" value={form.investedAmount}
                    onChange={e => handleInvestedChange(e.target.value)}
                    placeholder="Ex: 200,00"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              {currentPrice === null && form.ticker && !isFetchingCurrentPrice && (
                <p className="text-xs text-amber-500">⚠ Preço não encontrado — preencha quantidade e valor investido manualmente.</p>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Observações (opcional)</label>
                <input value={form.notes ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: Comprado na Binance"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave}
                disabled={!form.name || !form.ticker || parseDecimal(form.quantity) <= 0 || parseDecimal(form.investedAmount) <= 0}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                {editingId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}