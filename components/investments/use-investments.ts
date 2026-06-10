"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useFinance } from "@/contexts/finance-context"
import { Investment, AssetType, FixedIncomeIndex } from "@/lib/types"
import { calcFixedIncomeYield, calcPortfolioStats, calcSavingsBoxYield, formatDays } from "@/lib/investment-calc"
import { toast } from "sonner"

export type Tab = "variable" | "fixed" | "savings"
export type PriceMap = Record<string, { price: number; change24h: number; name: string }>

export const SAVINGS_BOX_RATES = [
  { label: "100% CDI", value: 100, index: "CDI" as const },
  { label: "110% CDI", value: 110, index: "CDI" as const },
  { label: "Poupança (~6.17% a.a.)", value: 6.17, index: "prefixado" as const },
]

export const FIXED_INCOME_TYPES = ["CDB", "LCI", "LCA", "Tesouro Direto", "CRI", "CRA", "Debenture", "Poupanca"]
export const RATE_INDEXES: FixedIncomeIndex[] = ["CDI", "SELIC", "IPCA", "prefixado"]

export const emptyVariable = { name: "", ticker: "", assetType: "stock" as AssetType, quantity: "", price: "", investedAt: "" }
export const emptyFixed = { name: "", investedAmount: "", investedAt: "", rateIndex: "CDI" as FixedIncomeIndex, rate: "100", maturityDate: "" }

export function useInvestments() {
  const { data, addInvestment, updateInvestment, deleteInvestment, isLoaded, addInvestmentTransaction, deleteInvestmentTransaction } = useFinance()
  const [tab, setTab] = useState<Tab>("variable")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [txModalId, setTxModalId] = useState<string | null>(null)
  const [txForm, setTxForm] = useState({ type: "buy" as "buy" | "sell", quantity: "", price: "", date: new Date().toISOString().split("T")[0], notes: "" })
  const [txDeleteId, setTxDeleteId] = useState<string | null>(null)
  const [prices, setPrices] = useState<PriceMap>({})
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
    } catch { }
    finally { setLoadingPrices(false) }
  }, [data.investments])

  useEffect(() => { fetchPrices() }, [fetchPrices])

  async function saveTx() {
    if (!txModalId) return
    const qty = parseFloat(txForm.quantity.replace(",", "."))
    const price = parseFloat(txForm.price.replace(",", "."))
    if (!qty || !price) { toast.error("Informe quantidade e preço"); return }
    await addInvestmentTransaction({ investmentId: txModalId, type: txForm.type, quantity: qty, price, total: qty * price, date: txForm.date, notes: txForm.notes || undefined })
    setTxForm({ type: "buy", quantity: "", price: "", date: new Date().toISOString().split("T")[0], notes: "" })
  }

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
      } catch { }
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
    const payload: Investment = { id: editingId || "", name: varForm.name, ticker: varForm.ticker, assetType: varForm.assetType, quantity: qty, avgPrice: investedAmount / qty, investedAmount, investedAt: varForm.investedAt || new Date().toISOString().split("T")[0] }
    if (editingId) await updateInvestment(payload)
    else await addInvestment(payload)
    setShowForm(false); setEditingId(null); setVarForm(emptyVariable); setPriceInput("")
  }

  async function saveFixed() {
    const amount = parseFloat(fixForm.investedAmount.replace(",", "."))
    const errs: Record<string, string> = {}
    if (!fixForm.name) errs.name = "Selecione o tipo"
    if (!fixForm.investedAmount || amount <= 0) errs.investedAmount = "Valor deve ser maior que zero"
    if (!fixForm.investedAt) errs.investedAt = "Data de aplicação é obrigatória"
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    const payload: Investment = { id: editingId || "", name: fixForm.name, ticker: fixForm.name.toUpperCase().replace(/\s/g, "_"), assetType: (tab === "savings" ? "savings_box" : "fixed_income") as AssetType, quantity: 1, avgPrice: amount, investedAmount: amount, investedAt: fixForm.investedAt, rate: parseFloat(fixForm.rate), rateIndex: fixForm.rateIndex, maturityDate: fixForm.maturityDate || undefined }
    if (editingId) await updateInvestment(payload)
    else await addInvestment(payload)
    setShowForm(false); setEditingId(null); setFixForm(emptyFixed)
  }

  function openEdit(inv: Investment) {
    if (inv.assetType === "fixed_income") {
      setFixForm({ name: inv.name, investedAmount: inv.investedAmount?.toString() || "", investedAt: inv.investedAt || "", rateIndex: inv.rateIndex || "CDI", rate: inv.rate?.toString() || "100", maturityDate: inv.maturityDate || "" })
      setTab("fixed")
    } else if (inv.assetType === "savings_box") {
      setFixForm({ name: inv.name, investedAmount: inv.investedAmount?.toString() || "", investedAt: inv.investedAt || "", rateIndex: inv.rateIndex || "CDI", rate: inv.rate?.toString() || "100", maturityDate: "" })
      setTab("savings")
    } else {
      setVarForm({ name: inv.name, ticker: inv.ticker, assetType: inv.assetType, quantity: inv.quantity.toString(), price: "", investedAt: inv.investedAt || "" })
      setPriceInput(inv.investedAmount?.toString() || "")
      setTab("variable")
    }
    setEditingId(inv.id)
    setShowForm(true)
  }

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
  }, [variableInvestments, fixedInvestments, prices, data.investmentTransactions])

  return {
    data, isLoaded,
    tab, setTab,
    showForm, setShowForm,
    editingId, setEditingId,
    deleteId, setDeleteId,
    txModalId, setTxModalId,
    txForm, setTxForm,
    txDeleteId, setTxDeleteId,
    prices, loadingPrices, fetchPrices,
    varForm, setVarForm,
    fixForm, setFixForm,
    priceInput, setPriceInput,
    manualMode, setManualMode,
    errors, setErrors,
    variableInvestments, fixedInvestments, savingsBoxes,
    totals,
    saveTx, saveVariable, saveFixed, openEdit,
    onTickerChange, onQuantityChange, onPriceInputChange,
    deleteInvestment, deleteInvestmentTransaction,
  }
}
