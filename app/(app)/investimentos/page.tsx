"use client"

import { useFinance } from "@/contexts/finance-context"
import { Investment, AssetType, FixedIncomeIndex } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { calcFixedIncomeYield, calcVariableIR, formatDays, CDI_RATE_ANNUAL, SELIC_RATE_ANNUAL, IPCA_RATE_ANNUAL } from "@/lib/investment-calc"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  TrendingUp, TrendingDown, Plus, Trash2, Pencil,
  RefreshCw, Bitcoin, BarChart2, LineChart, Loader2,
  Calendar, Percent, Info, ShieldAlert,
} from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { toast } from "sonner"

type Tab = "variable" | "fixed"

const FIXED_INCOME_TYPES = ["CDB", "LCI", "LCA", "Tesouro Direto", "CRI", "CRA", "Debenture", "Poupanca"]
const RATE_INDEXES: FixedIncomeIndex[] = ["CDI", "SELIC", "IPCA", "prefixado"]

const emptyVariable = { name: "", ticker: "", assetType: "stock" as AssetType, quantity: "", price: "" }
const emptyFixed = {
  name: "", investedAmount: "", investedAt: "", rateIndex: "CDI" as FixedIncomeIndex,
  rate: "100", maturityDate: ""
}

export default function InvestimentosPage() {
  const { data, addInvestment, updateInvestment, deleteInvestment, isLoaded } = useFinance()
  const [tab, setTab] = useState<Tab>("variable")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, { price: number; change24h: number; name: string }>>({})
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [varForm, setVarForm] = useState(emptyVariable)
  const [fixForm, setFixForm] = useState(emptyFixed)
  const [priceInput, setPriceInput] = useState("")
  const [tickerDebounce, setTickerDebounce] = useState<ReturnType<typeof setTimeout> | null>(null)

  const variableInvestments = data.investments.filter(i => i.assetType !== "fixed_income")
  const fixedInvestments = data.investments.filter(i => i.assetType === "fixed_income")

  // ─── Busca preços ─────────────────────────────────
  const fetchPrices = useCallback(async () => {
    const variable = data.investments.filter(i => i.assetType !== "fixed_income")
    if (variable.length === 0) return
    setLoadingPrices(true)
    try {
      const cryptos = variable.filter(i => i.assetType === "crypto").map(i => i.ticker).join(",")
      const tickers = variable.filter(i => i.assetType !== "crypto").map(i => i.ticker).join(",")
      const params = new URLSearchParams()
      if (cryptos) params.set("cryptos", cryptos)
      if (tickers) params.set("tickers", tickers)
      const res = await fetch(`/api/investments?${params}`)
      const result = await res.json()
      setPrices(result)
    } catch { /* silently fail */ }
    finally { setLoadingPrices(false) }
  }, [data.investments])

  useEffect(() => { fetchPrices() }, [fetchPrices])

  // ─── Debounce ticker search ───────────────────────
  function onTickerChange(ticker: string) {
    setVarForm(p => ({ ...p, ticker }))
    if (tickerDebounce) clearTimeout(tickerDebounce)
    if (!ticker) return
    const t = setTimeout(async () => {
      try {
        const isAlpha = /[a-zA-Z]/.test(ticker)
        const params = new URLSearchParams()
        if (!isAlpha || ticker.length > 6) params.set("cryptos", ticker)
        else params.set("tickers", ticker)
        const res = await fetch(`/api/investments?${params}`)
        const result = await res.json()
        const key = Object.keys(result)[0]
        if (key && result[key]) {
          setPrices(prev => ({ ...prev, [ticker]: result[key] }))
          if (!varForm.name) setVarForm(p => ({ ...p, name: result[key].name || ticker }))
        }
      } catch {}
    }, 800)
    setTickerDebounce(t)
  }

  function onQuantityChange(val: string) {
    setVarForm(p => ({ ...p, quantity: val }))
    const qty = parseFloat(val.replace(",", "."))
    const price = prices[varForm.ticker]?.price
    if (qty && price) setPriceInput((qty * price).toFixed(2))
  }

  function onPriceInputChange(val: string) {
    setPriceInput(val)
    const total = parseFloat(val.replace(",", "."))
    const price = prices[varForm.ticker]?.price
    if (total && price) setVarForm(p => ({ ...p, quantity: (total / price).toFixed(8) }))
  }

  // ─── Save variável ────────────────────────────────
  async function saveVariable() {
    const qty = parseFloat(varForm.quantity.replace(",", "."))
    const currentPrice = prices[varForm.ticker]?.price
    const investedAmount = parseFloat(priceInput.replace(",", ".")) || (qty * (currentPrice || 0))
    if (!varForm.name || !varForm.ticker || !qty) return

    const payload: Investment = {
      id: editingId || "",
      name: varForm.name,
      ticker: varForm.ticker,
      assetType: varForm.assetType,
      quantity: qty,
      avgPrice: investedAmount / qty,
      investedAmount,
      investedAt: new Date().toISOString().split("T")[0],
    }
    if (editingId) await updateInvestment(payload)
    else await addInvestment(payload)
    setShowForm(false); setEditingId(null); setVarForm(emptyVariable); setPriceInput("")
  }

  // ─── Save renda fixa ──────────────────────────────
  async function saveFixed() {
    const amount = parseFloat(fixForm.investedAmount.replace(",", "."))
    if (!fixForm.name || !amount || !fixForm.investedAt) {
      toast.error("Preencha nome, valor e data de aplicação"); return
    }
    const payload: Investment = {
      id: editingId || "",
      name: fixForm.name,
      ticker: fixForm.name.toUpperCase().replace(/\s/g, "_"),
      assetType: "fixed_income" as AssetType,
      quantity: 1,
      avgPrice: amount,
      investedAmount: amount,
      investedAt: fixForm.investedAt,
      rate: parseFloat(fixForm.rate),
      rateIndex: fixForm.rateIndex,
      maturityDate: fixForm.maturityDate || undefined,
    }
    if (editingId) await updateInvestment(payload)
    else await addInvestment(payload)
    setShowForm(false); setEditingId(null); setFixForm(emptyFixed)
  }

  function openEdit(inv: Investment) {
    if (inv.assetType === "fixed_income") {
      setFixForm({
        name: inv.name,
        investedAmount: inv.investedAmount?.toString() || "",
        investedAt: inv.investedAt || "",
        rateIndex: inv.rateIndex || "CDI",
        rate: inv.rate?.toString() || "100",
        maturityDate: inv.maturityDate || "",
      })
      setTab("fixed")
    } else {
      setVarForm({ name: inv.name, ticker: inv.ticker, assetType: inv.assetType, quantity: inv.quantity.toString(), price: "" })
      setPriceInput(inv.investedAmount?.toString() || "")
      setTab("variable")
    }
    setEditingId(inv.id)
    setShowForm(true)
  }

  // ─── Totais ───────────────────────────────────────
  const totals = useMemo(() => {
    let totalInvested = 0, totalCurrent = 0, totalNet = 0

    variableInvestments.forEach(inv => {
      const cp = prices[inv.ticker]?.price || inv.avgPrice
      const { netProfit } = calcVariableIR(inv, cp)
      totalInvested += inv.investedAmount ?? 0
      totalCurrent += inv.quantity * cp
      totalNet += (inv.investedAmount ?? 0) + netProfit
    })

    fixedInvestments.forEach(inv => {
      const { netValue, currentValue } = calcFixedIncomeYield(inv)
      totalInvested += inv.investedAmount ?? 0
      totalCurrent += currentValue
      totalNet += netValue
    })

    return { totalInvested, totalCurrent, totalNet }
  }, [variableInvestments, fixedInvestments, prices])

  if (!isLoaded) return <div className="h-64 bg-muted rounded-xl animate-pulse" />

  const irLabel = (rate: number) => `${(rate * 100).toFixed(1)}%`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">Carteira completa com impostos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPrices} disabled={loadingPrices}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm">
            <RefreshCw className={`h-4 w-4 ${loadingPrices ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Total Investido</p>
          <p className="text-2xl font-bold">{formatCurrency(totals.totalInvested)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Valor Bruto Atual</p>
          <p className={`text-2xl font-bold ${totals.totalCurrent >= totals.totalInvested ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(totals.totalCurrent)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Valor Líquido (após IR/IOF)</p>
          <p className={`text-2xl font-bold ${totals.totalNet >= totals.totalInvested ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(totals.totalNet)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[
          { key: "variable", label: "Renda Variável", icon: TrendingUp },
          { key: "fixed", label: "Renda Fixa", icon: BarChart2 },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Renda Variável ── */}
      {tab === "variable" && (
        <div className="space-y-3">
          {variableInvestments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Nenhum ativo cadastrado</p>
              <p className="text-sm text-muted-foreground">Adicione ações, FIIs, ETFs ou criptomoedas</p>
            </div>
          ) : variableInvestments.map(inv => {
            const cp = prices[inv.ticker]?.price || inv.avgPrice
            const change24h = prices[inv.ticker]?.change24h || 0
            const { profit, irAmount, netProfit, irRate, days } = calcVariableIR(inv, cp)
            const currentValue = inv.quantity * cp
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary rounded-lg">
                      {inv.assetType === "crypto" ? <Bitcoin className="h-5 w-5" /> : <LineChart className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold">{inv.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{inv.ticker} • {inv.quantity} un.</p>
                      {inv.investedAt && (
                        <p className="text-xs text-muted-foreground">Desde {new Date(inv.investedAt + "T00:00:00").toLocaleDateString("pt-BR")} ({formatDays(days)})</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg">{formatCurrency(currentValue)}</p>
                    <p className={`text-sm font-medium ${change24h >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {change24h >= 0 ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}% 24h
                    </p>
                  </div>
                </div>

                {/* Detalhes de lucro e IR */}
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Investido</p>
                    <p className="font-medium">{formatCurrency(inv.investedAmount ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Lucro Bruto</p>
                    <p className={`font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> IR ({irLabel(irRate)})
                    </p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {irAmount > 0 ? `-${formatCurrency(irAmount)}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Lucro Líquido</p>
                    <p className={`font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(inv)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button onClick={() => setDeleteId(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Renda Fixa ── */}
      {tab === "fixed" && (
        <div className="space-y-3">
          {/* Taxas de referência */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex flex-wrap gap-4 text-sm">
            <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> Taxas de referência:
            </span>
            <span>CDI: {(CDI_RATE_ANNUAL * 100).toFixed(2)}% a.a.</span>
            <span>SELIC: {(SELIC_RATE_ANNUAL * 100).toFixed(2)}% a.a.</span>
            <span>IPCA: {(IPCA_RATE_ANNUAL * 100).toFixed(2)}% a.a.</span>
          </div>

          {fixedInvestments.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Nenhuma renda fixa cadastrada</p>
              <p className="text-sm text-muted-foreground">Adicione CDBs, LCIs, Tesouro Direto e outros</p>
            </div>
          ) : fixedInvestments.map(inv => {
            const { grossYield, netYield, currentValue, netValue, iofAmount, irAmount, days, irRate, iofRate } = calcFixedIncomeYield(inv)
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.rateIndex === "prefixado" ? `${inv.rate}% a.a. prefixado` : `${inv.rate}% do ${inv.rateIndex}`}
                      {inv.maturityDate && ` • Vence ${new Date(inv.maturityDate + "T00:00:00").toLocaleDateString("pt-BR")}`}
                    </p>
                    {inv.investedAt && (
                      <p className="text-xs text-muted-foreground">
                        Aplicado em {new Date(inv.investedAt + "T00:00:00").toLocaleDateString("pt-BR")} ({formatDays(days)})
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg">{formatCurrency(currentValue)}</p>
                    <p className="text-xs text-muted-foreground">Líquido: {formatCurrency(netValue)}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Investido</p>
                    <p className="font-medium">{formatCurrency(inv.investedAmount ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Rendimento Bruto</p>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(grossYield)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> IOF{iofRate > 0 ? ` (${(iofRate * 100).toFixed(0)}%)` : ""}
                    </p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {iofAmount > 0 ? `-${formatCurrency(iofAmount)}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> IR ({irLabel(irRate)})
                    </p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {irAmount > 0 ? `-${formatCurrency(irAmount)}` : "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rendimento Líquido (após IR/IOF)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(netYield)}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(inv)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button onClick={() => setDeleteId(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold text-lg">{editingId ? "Editar" : "Novo"} Investimento</h3>
              {/* Tab switch no form */}
              {!editingId && (
                <div className="flex gap-2 mt-3">
                  {[
                    { key: "variable", label: "Renda Variável" },
                    { key: "fixed", label: "Renda Fixa" },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setTab(key as Tab)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        tab === key ? "bg-primary text-primary-foreground" : "bg-secondary"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              {tab === "variable" ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Ticker / ID</label>
                    <input value={varForm.ticker} onChange={e => onTickerChange(e.target.value)}
                      placeholder="Ex: PETR4, bitcoin"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    {prices[varForm.ticker] && (
                      <p className="text-xs text-emerald-600 mt-1">Cotação: {formatCurrency(prices[varForm.ticker].price)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Nome</label>
                    <input value={varForm.name} onChange={e => setVarForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nome do ativo"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tipo</label>
                    <select value={varForm.assetType} onChange={e => setVarForm(p => ({ ...p, assetType: e.target.value as AssetType }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="stock">Ação / FII / ETF</option>
                      <option value="crypto">Criptomoeda</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Quantidade</label>
                      <input value={varForm.quantity} onChange={e => onQuantityChange(e.target.value)}
                        placeholder="0,00" type="text"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Valor investido (R$)</label>
                      <input value={priceInput} onChange={e => onPriceInputChange(e.target.value)}
                        placeholder="0,00" type="text"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tipo de investimento</label>
                    <select value={fixForm.name} onChange={e => setFixForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Selecione...</option>
                      {FIXED_INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Valor aplicado (R$)</label>
                      <input value={fixForm.investedAmount} onChange={e => setFixForm(p => ({ ...p, investedAmount: e.target.value }))}
                        placeholder="1000,00" type="text"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Data de aplicação</label>
                      <input value={fixForm.investedAt} onChange={e => setFixForm(p => ({ ...p, investedAt: e.target.value }))}
                        type="date"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Índice</label>
                      <select value={fixForm.rateIndex} onChange={e => setFixForm(p => ({ ...p, rateIndex: e.target.value as FixedIncomeIndex }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                        {RATE_INDEXES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                        <Percent className="h-3.5 w-3.5" />
                        {fixForm.rateIndex === "prefixado" ? "Taxa a.a. (%)" : `% do ${fixForm.rateIndex}`}
                      </label>
                      <input value={fixForm.rate} onChange={e => setFixForm(p => ({ ...p, rate: e.target.value }))}
                        placeholder={fixForm.rateIndex === "prefixado" ? "12,5" : "110"}
                        type="text"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Data de vencimento (opcional)</label>
                    <input value={fixForm.maturityDate} onChange={e => setFixForm(p => ({ ...p, maturityDate: e.target.value }))}
                      type="date"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  {fixForm.investedAmount && fixForm.investedAt && fixForm.rate && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
                      <p className="text-muted-foreground text-xs mb-1">Preview do rendimento atual</p>
                      {(() => {
                        const preview = calcFixedIncomeYield({
                          id: "", name: fixForm.name, ticker: "", assetType: "fixed_income" as AssetType,
                          quantity: 1, avgPrice: parseFloat(fixForm.investedAmount) || 0,
                          investedAmount: parseFloat(fixForm.investedAmount) || 0,
                          investedAt: fixForm.investedAt,
                          rate: parseFloat(fixForm.rate) || 0,
                          rateIndex: fixForm.rateIndex,
                        })
                        return (
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="text-muted-foreground">Bruto: </span><span className="font-medium text-emerald-600">+{formatCurrency(preview.grossYield)}</span></div>
                            <div><span className="text-muted-foreground">Líquido: </span><span className="font-bold text-emerald-600">+{formatCurrency(preview.netYield)}</span></div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => { setShowForm(false); setEditingId(null) }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={tab === "variable" ? saveVariable : saveFixed}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                {editingId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir investimento?"
        description="O investimento será removido permanentemente."
        onConfirm={() => { deleteId && deleteInvestment(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
