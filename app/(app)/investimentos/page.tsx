"use client"

import { useFinance } from "@/contexts/finance-context"
import { Investment, AssetType, FixedIncomeIndex } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { calcFixedIncomeYield, calcVariableIR, calcSavingsBoxYield, calcPortfolioStats, formatDays, CDI_RATE_ANNUAL, SELIC_RATE_ANNUAL, IPCA_RATE_ANNUAL } from "@/lib/investment-calc"
import { useState, useEffect, useCallback, useMemo } from "react"
import {
  TrendingUp, TrendingDown, Plus, Trash2, Pencil,
  RefreshCw, Bitcoin, BarChart2, LineChart, Loader2,
  Calendar, Percent, Info, ShieldAlert,
  Clock, ArrowDownCircle, ArrowUpCircle, X, Wallet2, PiggyBank,
} from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { toast } from "sonner"

type Tab = "variable" | "fixed" | "savings"

const SAVINGS_BOX_RATES = [
  { label: "100% CDI", value: 100, index: "CDI" as const },
  { label: "110% CDI", value: 110, index: "CDI" as const },
  { label: "Poupança (~6.17% a.a.)", value: 6.17, index: "prefixado" as const },
]

const FIXED_INCOME_TYPES = ["CDB", "LCI", "LCA", "Tesouro Direto", "CRI", "CRA", "Debenture", "Poupanca"]
const RATE_INDEXES: FixedIncomeIndex[] = ["CDI", "SELIC", "IPCA", "prefixado"]

const emptyVariable = { name: "", ticker: "", assetType: "stock" as AssetType, quantity: "", price: "", investedAt: "" }
const emptyFixed = {
  name: "", investedAmount: "", investedAt: "", rateIndex: "CDI" as FixedIncomeIndex,
  rate: "100", maturityDate: ""
}

export default function InvestimentosPage() {
  const { data, addInvestment, updateInvestment, deleteInvestment, isLoaded, addInvestmentTransaction, deleteInvestmentTransaction } = useFinance()
  const [tab, setTab] = useState<Tab>("variable")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [txModalId, setTxModalId] = useState<string | null>(null)
  const [txForm, setTxForm] = useState({ type: "buy" as "buy" | "sell", quantity: "", price: "", date: new Date().toISOString().split("T")[0], notes: "" })
  const [txDeleteId, setTxDeleteId] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, { price: number; change24h: number; name: string }>>({})
  const [loadingPrices, setLoadingPrices] = useState(false)
  const [varForm, setVarForm] = useState(emptyVariable)
  const [fixForm, setFixForm] = useState(emptyFixed)
  const [priceInput, setPriceInput] = useState("")
  const [manualMode, setManualMode] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tickerDebounce, setTickerDebounce] = useState<ReturnType<typeof setTimeout> | null>(null)

  const variableInvestments = data.investments.filter(i => i.assetType !== "fixed_income" && i.assetType !== "savings_box")
  const fixedInvestments = data.investments.filter(i => i.assetType === "fixed_income")
  const savingsBoxes = data.investments.filter(i => i.assetType === "savings_box")

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

  // ─── Save investment transaction ─────────────────
  async function saveTx() {
    if (!txModalId) return
    const qty = parseFloat(txForm.quantity.replace(",", "."))
    const price = parseFloat(txForm.price.replace(",", "."))
    if (!qty || !price) { toast.error("Informe quantidade e preço"); return }
    await addInvestmentTransaction({
      investmentId: txModalId,
      type: txForm.type,
      quantity: qty,
      price,
      total: qty * price,
      date: txForm.date,
      notes: txForm.notes || undefined,
    })
    setTxForm({ type: "buy", quantity: "", price: "", date: new Date().toISOString().split("T")[0], notes: "" })
  }

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
    if (manualMode) return
    const qty = parseFloat(val.replace(",", "."))
    const price = prices[varForm.ticker]?.price
    if (qty && price) setPriceInput((qty * price).toFixed(2))
  }

  function onPriceInputChange(val: string) {
    setPriceInput(val)
    if (manualMode) return
    const total = parseFloat(val.replace(",", "."))
    const price = prices[varForm.ticker]?.price
    if (total && price) setVarForm(p => ({ ...p, quantity: (total / price).toFixed(8) }))
  }

  // ─── Save variável ────────────────────────────────
  async function saveVariable() {
    const qty = parseFloat(varForm.quantity.replace(",", "."))
    const currentPrice = prices[varForm.ticker]?.price
    const investedAmount = parseFloat(priceInput.replace(",", ".")) || (qty * (currentPrice || 0))
    const errs: Record<string, string> = {}
    if (!varForm.ticker.trim()) errs.ticker = "Ticker é obrigatório"
    if (!varForm.name.trim()) errs.name = "Nome é obrigatório"
    if (!qty || qty <= 0) errs.quantity = "Quantidade deve ser maior que zero"
    if (!priceInput || parseFloat(priceInput) <= 0) errs.price = "Valor investido deve ser maior que zero"
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const payload: Investment = {
      id: editingId || "",
      name: varForm.name,
      ticker: varForm.ticker,
      assetType: varForm.assetType,
      quantity: qty,
      avgPrice: investedAmount / qty,
      investedAmount,
      investedAt: varForm.investedAt || new Date().toISOString().split("T")[0],
    }
    if (editingId) await updateInvestment(payload)
    else await addInvestment(payload)
    setShowForm(false); setEditingId(null); setVarForm(emptyVariable); setPriceInput("")
  }

  // ─── Save renda fixa ──────────────────────────────
  async function saveFixed() {
    const amount = parseFloat(fixForm.investedAmount.replace(",", "."))
    const errs: Record<string, string> = {}
    if (!fixForm.name) errs.name = "Selecione o tipo"
    if (!fixForm.investedAmount || amount <= 0) errs.investedAmount = "Valor deve ser maior que zero"
    if (!fixForm.investedAt) errs.investedAt = "Data de aplicação é obrigatória"
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const payload: Investment = {
      id: editingId || "",
      name: fixForm.name,
      ticker: fixForm.name.toUpperCase().replace(/\s/g, "_"),
      assetType: (tab === "savings" ? "savings_box" : "fixed_income") as AssetType,
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
      setVarForm({ name: inv.name, ticker: inv.ticker, assetType: inv.assetType, quantity: inv.quantity.toString(), price: "", investedAt: inv.investedAt || "" })
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
      const currentValue = inv.quantity * cp
      const invTxs = data.investmentTransactions.filter(t => t.investmentId === inv.id)
      const totalBought = invTxs.filter(t => t.type === "buy").reduce((s, t) => s + t.total, 0)
      const totalSold = invTxs.filter(t => t.type === "sell").reduce((s, t) => s + t.total, 0)
      const hasHistory = invTxs.length > 0
      const invested = hasHistory ? totalBought - totalSold : (inv.investedAmount ?? 0)
      const profit = hasHistory ? currentValue + totalSold - totalBought : currentValue - (inv.investedAmount ?? 0)
      const irAmount = profit > 0 ? profit * 0.15 : 0
      totalInvested += Math.max(0, invested)
      totalCurrent += currentValue
      totalNet += currentValue + (hasHistory ? totalSold - totalBought - irAmount : profit - irAmount)
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
          <p className="text-sm text-muted-foreground mb-1">Capital em Carteira</p>
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
          { key: "savings", label: "Caixinha", icon: Wallet2 },
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
            const invTxs = data.investmentTransactions.filter(t => t.investmentId === inv.id)

            // Usa cálculo por movimentação se tiver histórico
            const stats = invTxs.length > 0
              ? calcPortfolioStats(invTxs, cp, inv.assetType)
              : null

            const currentValue = stats ? stats.quantity * cp : inv.quantity * cp
            const profit = stats ? stats.profit : currentValue - (inv.investedAmount ?? 0)
            const irAmount = stats ? stats.irAmount : (profit > 0 ? profit * 0.15 : 0)
            const netProfit = stats ? stats.netProfit : profit - irAmount
            const irRate = stats ? stats.irRate : 0.15
            const days = 0
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
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
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
                  <button onClick={() => setTxModalId(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors">
                    <Clock className="h-3.5 w-3.5" /> Movimentações
                  </button>
                  <button onClick={() => openEdit(inv)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(inv.id)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
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
            const invTxs = data.investmentTransactions.filter(t => t.investmentId === inv.id)
            const { grossYield, netYield, currentValue, netValue, iofAmount, irAmount, days, irRate, iofRate } = invTxs.length > 0
              ? (() => {
                  const r = calcSavingsBoxYield(invTxs, inv.rate ?? 100, inv.rateIndex ?? "CDI")
                  return { ...r, currentValue: r.netValue, iofAmount: 0, irAmount: r.grossYield - r.netYield, iofRate: 0, irRate: 0.15 }
                })()
              : calcFixedIncomeYield(inv)
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

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
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
                  <button onClick={() => setTxModalId(inv.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors">
                    <Clock className="h-3.5 w-3.5" /> Movimentações
                  </button>
                  <button onClick={() => openEdit(inv)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(inv.id)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Caixinha ── */}
      {tab === "savings" && (
        <div className="space-y-3">
          {savingsBoxes.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Nenhuma caixinha cadastrada</p>
              <p className="text-sm text-muted-foreground">Adicione sua caixinha ou reserva de emergência</p>
            </div>
          ) : savingsBoxes.map(inv => {
            const invTxs = data.investmentTransactions.filter(t => t.investmentId === inv.id)
            const invTxsSorted = [...invTxs].sort((a, b) => a.date.localeCompare(b.date))
            const totalDeposited = invTxs.filter(t => t.type === "buy").reduce((s, t) => s + t.total, 0)
            const totalWithdrawn = invTxs.filter(t => t.type === "sell").reduce((s, t) => s + t.total, 0)
            const { grossYield, netYield, netValue, balance, iofAmount, irAmount, iofRate, irRate } = invTxs.length > 0
              ? calcSavingsBoxYield(invTxs, inv.rate ?? 100, inv.rateIndex ?? "CDI")
              : (() => { const r = calcFixedIncomeYield(inv); return { ...r, balance: inv.investedAmount ?? 0 } })()
            return (
              <div key={inv.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <PiggyBank className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold">{inv.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.rateIndex === "prefixado" ? `${inv.rate}% a.a.` : `${inv.rate}% do ${inv.rateIndex}`}
                        {inv.investedAt && ` • Desde ${new Date(inv.investedAt + "T00:00:00").toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(netValue)}</p>
                    <p className="text-xs text-muted-foreground">Saldo líquido</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Depositado</p>
                    <p className="font-medium">{formatCurrency(balance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Rendimento Bruto</p>
                    <p className="font-medium text-emerald-600">+{formatCurrency(grossYield)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> IOF {iofRate > 0 ? `(${(iofRate*100).toFixed(0)}%)` : ""}
                    </p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {iofAmount > 0 ? `-${formatCurrency(iofAmount)}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> IR ({(irRate*100).toFixed(1)}%)
                    </p>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {irAmount > 0 ? `-${formatCurrency(irAmount)}` : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rendimento Líquido (após IOF/IR)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(netYield)}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => setTxModalId(inv.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs hover:bg-emerald-100 transition-colors">
                    <ArrowDownCircle className="h-3.5 w-3.5" /> Depositar / Retirar
                  </button>
                  <button onClick={() => openEdit(inv)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(inv.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
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
                    { key: "savings", label: "Caixinha" },
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
              {tab === "savings" ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Nome da caixinha</label>
                    <input value={fixForm.name} onChange={e => setFixForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Reserva de emergência, Viagem..."
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Saldo inicial (R$)</label>
                      <input value={fixForm.investedAmount} onChange={e => setFixForm(p => ({ ...p, investedAmount: e.target.value }))}
                        placeholder="0,00" type="text"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Data de início</label>
                      <input value={fixForm.investedAt} onChange={e => setFixForm(p => ({ ...p, investedAt: e.target.value }))}
                        type="date"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Rendimento</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {SAVINGS_BOX_RATES.map(r => (
                        <button key={r.label}
                          onClick={() => setFixForm(p => ({ ...p, rate: r.value.toString(), rateIndex: r.index }))}
                          className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                            fixForm.rate === r.value.toString()
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-secondary"
                          }`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          step="0.01"
                          value={fixForm.rate}
                          onChange={e => setFixForm(p => ({ ...p, rate: e.target.value, rateIndex: "CDI" }))}
                          placeholder="Ex: 110"
                          className="w-full px-3 py-2 pr-16 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">% CDI</span>
                      </div>
                    </div>
                    {fixForm.rate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        = {((parseFloat(fixForm.rate) / 100) * 10.65).toFixed(2)}% a.a. efetivo
                      </p>
                    )}
                  </div>
                </>
              ) : tab === "variable" ? (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Ticker / ID</label>
                    <input value={varForm.ticker} onChange={e => onTickerChange(e.target.value)}
                      placeholder="Ex: PETR4, bitcoin"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    {errors.ticker && <p className="text-xs text-red-500 mt-1">{errors.ticker}</p>}
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
                  {/* Toggle automático/manual */}
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{manualMode ? "Modo Manual" : "Modo Automático"}</p>
                      <p className="text-xs text-muted-foreground">
                        {manualMode
                          ? "Quantidade e valor independentes"
                          : "Quantidade ↔ Valor calculados automaticamente"}
                      </p>
                    </div>
                    <button
                      onClick={() => setManualMode(m => !m)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${manualMode ? "bg-primary" : "bg-border"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${manualMode ? "translate-x-6" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Quantidade</label>
                      <input value={varForm.quantity} onChange={e => { onQuantityChange(e.target.value); setErrors(p => ({ ...p, quantity: "" })) }}
                        placeholder="0,00" type="text"
                        className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.quantity ? "border-red-400" : "border-border"}`} />
                      {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Valor investido (R$)</label>
                      <input value={priceInput} onChange={e => { onPriceInputChange(e.target.value); setErrors(p => ({ ...p, price: "" })) }}
                        placeholder="0,00" type="text"
                        className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${errors.price ? "border-red-400" : "border-border"}`} />
                      {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Data de aplicação
                    </label>
                    <input
                      type="date"
                      value={varForm.investedAt}
                      onChange={e => setVarForm(p => ({ ...p, investedAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
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

      {/* Modal de Movimentações */}
      {txModalId && (() => {
        const inv = data.investments.find(i => i.id === txModalId)
        const txs = data.investmentTransactions.filter(t => t.investmentId === txModalId)
        if (!inv) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div>
                  <h3 className="font-semibold text-lg">{inv.name}</h3>
                  <p className="text-sm text-muted-foreground">Histórico de movimentações</p>
                </div>
                <button onClick={() => setTxModalId(null)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nova movimentação */}
              <div className="p-5 border-b border-border space-y-3">
                <p className="text-sm font-semibold">Nova movimentação</p>
                {(() => {
                  const inv = data.investments.find(i => i.id === txModalId)
                  const isSavings = inv?.assetType === "savings_box"
                  const buyLabel = isSavings ? "Depositar" : "Compra"
                  const sellLabel = isSavings ? "Retirar" : "Venda"
                  const BuyIcon = ArrowDownCircle
                  const SellIcon = ArrowUpCircle
                  return (
                    <>
                      <div className="flex gap-2">
                        {[{ v: "buy" as const, label: buyLabel, Icon: BuyIcon }, { v: "sell" as const, label: sellLabel, Icon: SellIcon }].map(({ v, label, Icon }) => (
                          <button key={v} onClick={() => setTxForm(p => ({ ...p, type: v }))}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                              txForm.type === v
                                ? v === "buy" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                                : "bg-secondary"
                            }`}>
                            <Icon className="h-4 w-4" /> {label}
                          </button>
                        ))}
                      </div>
                      {isSavings ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-1">
                            <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                            <input value={txForm.price}
                              onChange={e => setTxForm(p => ({ ...p, price: e.target.value, quantity: "1" }))}
                              placeholder="0,00" type="text"
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                            <input value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))}
                              type="date"
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Quantidade</label>
                            <input value={txForm.quantity} onChange={e => setTxForm(p => ({ ...p, quantity: e.target.value }))}
                              placeholder="0.00" type="text"
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Preço unit. (R$)</label>
                            <input value={txForm.price} onChange={e => setTxForm(p => ({ ...p, price: e.target.value }))}
                              placeholder="0.00" type="text"
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                            <input value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))}
                              type="date"
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          </div>
                        </div>
                      )}
                      {txForm.quantity && txForm.price && !isSavings && (
                        <p className="text-xs text-muted-foreground">
                          Total: <strong>{formatCurrency(parseFloat(txForm.quantity.replace(",", ".") || "0") * parseFloat(txForm.price.replace(",", ".") || "0"))}</strong>
                        </p>
                      )}
                      <button onClick={saveTx}
                        className={`w-full py-2 rounded-lg text-sm font-medium text-white transition-colors ${txForm.type === "buy" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                        {txForm.type === "buy" ? buyLabel : sellLabel}
                      </button>
                    </>
                  )
                })()}
              </div>

              {/* Histórico */}
              <div className="p-5">
                <p className="text-sm font-semibold mb-3">Histórico</p>
                {txs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação registrada</p>
                ) : (
                  <div className="space-y-2">
                    {txs.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                        <div className="flex items-center gap-3">
                          {tx.type === "buy"
                            ? <ArrowDownCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                            : <ArrowUpCircle className="h-4 w-4 text-red-500 shrink-0" />
                          }
                          <div>
                            <p className="text-sm font-medium">{tx.type === "buy" ? "Compra" : "Venda"} — {tx.quantity} un.</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.date + "T00:00:00").toLocaleDateString("pt-BR")} • {formatCurrency(tx.price)}/un.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={`font-semibold text-sm ${tx.type === "buy" ? "text-emerald-600" : "text-red-500"}`}>
                            {tx.type === "buy" ? "-" : "+"}{formatCurrency(tx.total)}
                          </p>
                          <button onClick={() => setTxDeleteId(tx.id)} className="p-1 hover:bg-secondary rounded transition-colors">
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <DeleteConfirm
        isOpen={!!txDeleteId}
        title="Remover movimentação?"
        description="A movimentação será removida. O saldo do ativo será recalculado."
        onConfirm={() => { txDeleteId && deleteInvestmentTransaction(txDeleteId); setTxDeleteId(null) }}
        onCancel={() => setTxDeleteId(null)}
      />

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