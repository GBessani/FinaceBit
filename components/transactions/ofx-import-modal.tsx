"use client"

import { useState, useCallback, useRef } from "react"
import { useFinance } from "@/contexts/finance-context"
import { parseOFX, OFXTransaction } from "@/lib/ofx-parser"
import { formatCurrency, localDateStr } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  X, Upload, FileText, CheckCircle2, AlertCircle,
  ChevronRight, Loader2, TrendingUp, TrendingDown, Check
} from "lucide-react"
import { CategoryIcon } from "@/components/categories/category-icon"
import { toast } from "sonner"

type Step = "upload" | "review" | "importing" | "done"

interface ImportRow extends OFXTransaction {
  selected: boolean
  categoryId: string
}

interface Props {
  onClose: () => void
}

export function OFXImportModal({ onClose }: Props) {
  const { data, addTransaction, getCategory } = useFinance()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep]         = useState<Step>("upload")
  const [dragging, setDragging] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [rows, setRows]         = useState<ImportRow[]>([])
  const [meta, setMeta]         = useState<{ bank?: string; period?: string; balance?: number }>({})
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [doneCount, setDoneCount] = useState(0)

  const todayStr = localDateStr()

  const expenseCategories = data.categories.filter(c => c.type === "expense")
  const incomeCategories  = data.categories.filter(c => c.type === "income")

  // ── Leitura do arquivo ──────────────────────────────────────────────────────
  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".ofx") && !file.name.toLowerCase().endsWith(".qfx")) {
      setError("Selecione um arquivo .ofx ou .qfx exportado pelo seu banco.")
      return
    }
    setError(null)
    const content = await file.text()
    const result = await parseOFX(content)

    if (result.error) { setError(result.error); return }
    if (result.transactions.length === 0) {
      setError("Nenhuma transação encontrada no arquivo.")
      return
    }

    const importRows: ImportRow[] = result.transactions.map(tx => ({
      ...tx,
      selected: true,
      categoryId: "",
    }))

    const period = result.startDate && result.endDate
      ? `${format(parseISO(result.startDate), "dd/MM/yy", { locale: ptBR })} – ${format(parseISO(result.endDate), "dd/MM/yy", { locale: ptBR })}`
      : undefined

    setRows(importRows)
    setMeta({ bank: result.accountId, period, balance: result.balance })
    setStep("review")
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [])

  // ── Importação ──────────────────────────────────────────────────────────────
  async function handleImport() {
    const selected = rows.filter(r => r.selected)
    if (selected.length === 0) { toast.error("Selecione ao menos uma transação."); return }

    setStep("importing")
    setProgress({ done: 0, total: selected.length })

    let imported = 0
    for (const row of selected) {
      const status: "completed" | "pending" = row.date > todayStr ? "pending" : "completed"
      await addTransaction({
        id: crypto.randomUUID(),
        description: row.memo,
        amount: row.amount,
        type: row.type,
        categoryId: row.categoryId || "",
        date: row.date,
        wallet: "digital",
        status,
        notes: `Importado via OFX · FITID: ${row.fitId}`,
      })
      imported++
      setProgress({ done: imported, total: selected.length })
    }

    setDoneCount(imported)
    setStep("done")
  }

  // ── Helpers de seleção ──────────────────────────────────────────────────────
  function toggleRow(fitId: string) {
    setRows(prev => prev.map(r => r.fitId === fitId ? { ...r, selected: !r.selected } : r))
  }

  function toggleAll() {
    const allSelected = rows.every(r => r.selected)
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })))
  }

  function setCategory(fitId: string, categoryId: string) {
    setRows(prev => prev.map(r => r.fitId === fitId ? { ...r, categoryId } : r))
  }

  const selectedCount = rows.filter(r => r.selected).length
  const totalIncome   = rows.filter(r => r.selected && r.type === "income").reduce((s, r) => s + r.amount, 0)
  const totalExpense  = rows.filter(r => r.selected && r.type === "expense").reduce((s, r) => s + r.amount, 0)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Importar OFX</h3>
            {step === "review" && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {rows.length} transações
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP 1: UPLOAD ── */}
          {step === "upload" && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Exporte o extrato da sua conta em formato <strong>.ofx</strong> diretamente no seu banco
                (Banco do Brasil, Itaú, Bradesco, Nubank, Santander, etc.) e importe aqui.
              </p>

              {/* Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-secondary/50"
                }`}
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-sm">Arraste o arquivo .ofx aqui</p>
                <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground mt-3">Suporta .ofx e .qfx</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.qfx"
                onChange={handleFileInput}
                className="hidden"
              />

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Dicas por banco */}
              <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground mb-1.5">Como exportar o OFX:</p>
                <p>🏦 <strong>Nubank:</strong> App → Perfil → Exportar extrato → OFX</p>
                <p>🏦 <strong>Itaú:</strong> Internet Banking → Extrato → Salvar como OFX</p>
                <p>🏦 <strong>BB:</strong> Internet Banking → Extrato → Arquivo Money (OFX)</p>
                <p>🏦 <strong>Bradesco:</strong> Conta Corrente → Extrato → Exportar → OFX</p>
              </div>
            </div>
          )}

          {/* ── STEP 2: REVISÃO ── */}
          {step === "review" && (
            <div className="flex flex-col">
              {/* Resumo */}
              <div className="px-4 py-3 bg-secondary/30 border-b border-border flex flex-wrap items-center gap-4 text-sm shrink-0">
                {meta.bank && <span className="text-muted-foreground">Conta: <strong className="text-foreground">{meta.bank}</strong></span>}
                {meta.period && <span className="text-muted-foreground">Período: <strong className="text-foreground">{meta.period}</strong></span>}
                {meta.balance !== undefined && (
                  <span className="text-muted-foreground">Saldo final: <strong className={meta.balance >= 0 ? "text-emerald-600" : "text-red-500"}>{formatCurrency(meta.balance)}</strong></span>
                )}
              </div>

              {/* Totais da seleção */}
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-6 text-sm shrink-0">
                <span className="text-muted-foreground">{selectedCount} de {rows.length} selecionadas</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />+{formatCurrency(totalIncome)}
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <TrendingDown className="h-3.5 w-3.5" />-{formatCurrency(totalExpense)}
                </span>
              </div>

              {/* Cabeçalho da tabela */}
              <div className="px-4 py-2 border-b border-border grid grid-cols-[20px_1fr_90px_90px] gap-2 text-xs font-medium text-muted-foreground shrink-0">
                <button onClick={toggleAll} className="flex items-center justify-center">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedCount === rows.length ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {selectedCount === rows.length && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                </button>
                <span>Descrição</span>
                <span>Categoria</span>
                <span className="text-right">Valor</span>
              </div>

              {/* Linhas */}
              <div className="divide-y divide-border">
                {rows.map(row => {
                  const cats = row.type === "income" ? incomeCategories : expenseCategories
                  const cat = row.categoryId ? getCategory(row.categoryId) : null
                  return (
                    <div
                      key={row.fitId}
                      className={`px-4 py-3 grid grid-cols-[20px_1fr_90px_90px] gap-2 items-center transition-colors ${
                        row.selected ? "bg-card" : "bg-secondary/20 opacity-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <button onClick={() => toggleRow(row.fitId)} className="flex items-center justify-center shrink-0">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          row.selected ? "bg-primary border-primary" : "border-border"
                        }`}>
                          {row.selected && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                      </button>

                      {/* Descrição + data */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{row.memo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(row.date), "dd/MM/yyyy", { locale: ptBR })}
                          {row.date > todayStr && (
                            <span className="ml-1.5 text-amber-500">· A vencer</span>
                          )}
                        </p>
                      </div>

                      {/* Seletor de categoria */}
                      <select
                        value={row.categoryId}
                        onChange={e => setCategory(row.fitId, e.target.value)}
                        disabled={!row.selected}
                        className="w-full text-xs px-1.5 py-1 border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                      >
                        <option value="">Sem cat.</option>
                        {cats.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>

                      {/* Valor */}
                      <p className={`text-sm font-semibold text-right tabular-nums ${
                        row.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                      }`}>
                        {row.type === "income" ? "+" : "-"}{formatCurrency(row.amount)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: IMPORTANDO ── */}
          {step === "importing" && (
            <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="font-medium">Importando transações...</p>
              <p className="text-sm text-muted-foreground">
                {progress.done} de {progress.total} concluídas
              </p>
              <div className="w-48 bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ── STEP 4: CONCLUÍDO ── */}
          {step === "done" && (
            <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-xl font-semibold">{doneCount} transações importadas!</p>
              <p className="text-sm text-muted-foreground">
                Elas já aparecem na lista de transações com o status correto
                (A Vencer para datas futuras, Concluída para passadas).
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Ver transações
              </button>
            </div>
          )}
        </div>

        {/* Footer com botões (só na etapa de revisão) */}
        {step === "review" && (
          <div className="p-4 border-t border-border flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => { setStep("upload"); setRows([]) }}
              className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm"
            >
              ← Outro arquivo
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Importar {selectedCount} transação{selectedCount !== 1 ? "ões" : ""}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
