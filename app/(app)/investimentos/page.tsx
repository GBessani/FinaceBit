"use client"

import { useFinance } from "@/contexts/finance-context"
import { Investment, AssetType } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { useEffect, useState, useCallback } from "react"
import {
  TrendingUp, TrendingDown, Plus, Trash2, Pencil,
  RefreshCw, Bitcoin, BarChart2, LineChart,
} from "lucide-react"

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

const emptyForm: Omit<Investment, "id"> = {
  name: "",
  ticker: "",
  assetType: "crypto",
  quantity: 0,
  avgPrice: 0,
  notes: "",
}

export default function InvestimentosPage() {
  const { data, addInvestment, updateInvestment, deleteInvestment, isLoaded } = useFinance()
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Investment, "id">>(emptyForm)

  const fetchPrices = useCallback(async () => {
    if (data.investments.length === 0) return
    setIsLoadingPrices(true)

    const cryptos = data.investments.filter(i => i.assetType === "crypto").map(i => i.ticker).join(",")
    const stocks = data.investments.filter(i => i.assetType === "stock" || i.assetType === "fund").map(i => i.ticker).join(",")

    const params = new URLSearchParams()
    if (cryptos) params.set("cryptos", cryptos)
    if (stocks) params.set("tickers", stocks)

    try {
      const res = await fetch(`/api/investments?${params}`)
      const data = await res.json()
      setPrices(data)
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
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(inv: Investment) {
    setForm({
      name: inv.name, ticker: inv.ticker, assetType: inv.assetType,
      quantity: inv.quantity, avgPrice: inv.avgPrice, notes: inv.notes ?? "",
    })
    setEditingId(inv.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.ticker || form.quantity <= 0 || form.avgPrice <= 0) return
    if (editingId) {
      await updateInvestment({ ...form, id: editingId })
    } else {
      await addInvestment({ ...form, id: "" })
    }
    setShowForm(false)
    setEditingId(null)
    setTimeout(() => fetchPrices(), 500)
  }

  // ─── Cálculos ──────────────────────────────────────────────
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">Acompanhe sua carteira em tempo real</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPrices}
            disabled={isLoadingPrices}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPrices ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Totais */}
      {data.investments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Total Investido</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.invested)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Valor Atual</p>
            <p className="text-2xl font-bold">
              {totals.current > 0 ? formatCurrency(totals.current) : "—"}
            </p>
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

      {/* Lista de investimentos */}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{inv.name}</p>
                        <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">
                          {inv.ticker.toUpperCase()}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">
                          {ASSET_TYPE_LABELS[inv.assetType]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {inv.quantity} unid. × {formatCurrency(inv.avgPrice)} médio
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
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
                            {profit! >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
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
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Preço indisponível</p>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(inv)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteInvestment(inv.id)} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
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

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-4">
              {editingId ? "Editar Investimento" : "Novo Investimento"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo de ativo</label>
                <select
                  value={form.assetType}
                  onChange={e => setForm(prev => ({ ...prev, assetType: e.target.value as AssetType }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="crypto">Criptomoeda</option>
                  <option value="stock">Ação B3</option>
                  <option value="fund">Fundo/ETF</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Nome</label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={form.assetType === "crypto" ? "Ex: Bitcoin" : "Ex: Petrobras"}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  {form.assetType === "crypto" ? "ID CoinGecko" : "Ticker B3"}
                </label>
                <input
                  value={form.ticker}
                  onChange={e => setForm(prev => ({ ...prev, ticker: e.target.value }))}
                  placeholder={form.assetType === "crypto" ? "Ex: bitcoin, ethereum, solana" : "Ex: PETR4, ITUB4"}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {form.assetType === "crypto" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Use o ID da CoinGecko: <a href="https://www.coingecko.com" target="_blank" rel="noreferrer" className="text-primary underline">coingecko.com</a>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Quantidade</label>
                  <input
                    type="number"
                    step="any"
                    value={form.quantity || ""}
                    onChange={e => setForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Preço médio (R$)</label>
                  <input
                    type="number"
                    step="any"
                    value={form.avgPrice || ""}
                    onChange={e => setForm(prev => ({ ...prev, avgPrice: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Observações (opcional)</label>
                <input
                  value={form.notes ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ex: Comprado na Binance"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.ticker || form.quantity <= 0 || form.avgPrice <= 0}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {editingId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
