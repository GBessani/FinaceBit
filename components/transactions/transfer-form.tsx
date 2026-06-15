"use client"

import { useState } from "react"
import { useFinance } from "@/contexts/finance-context"
import { ArrowLeftRight, X, Building2, Wallet } from "lucide-react"
import { toast } from "sonner"
import { localDateStr } from "@/lib/utils"

type Direction = "to_cash" | "to_digital"

interface TransferFormProps {
  onClose: () => void
}

export function TransferForm({ onClose }: TransferFormProps) {
  const { addTransaction } = useFinance()
  const [direction, setDirection] = useState<Direction>("to_cash")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(() => {
    const d = new Date()
    return localDateStr(d)
  })
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const isToCash = direction === "to_cash"
  const fromLabel = isToCash ? "Conta Digital" : "Dinheiro Físico"
  const toLabel   = isToCash ? "Dinheiro Físico" : "Conta Digital"
  const FromIcon  = isToCash ? Building2 : Wallet
  const ToIcon    = isToCash ? Wallet : Building2

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) { toast.error("Informe um valor válido"); return }

    setLoading(true)
    try {
      await addTransaction({
        id: crypto.randomUUID(),
        description: `Transferência: ${fromLabel} → ${toLabel}`,
        amount: parseFloat(amount),
        type: "transfer",
        categoryId: "",
        date,
        notes: notes || `De ${fromLabel} para ${toLabel}`,
        wallet: "digital",
      })
      toast.success("Transferência registrada!")
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ArrowLeftRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-lg">Nova Transferência</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Direção */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setDirection("to_cash")}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${direction === "to_cash" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4" />
                <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                <Wallet className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground text-center">Conta → Físico</span>
            </button>
            <button type="button" onClick={() => setDirection("to_digital")}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${direction === "to_digital" ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" />
                <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-xs text-muted-foreground text-center">Físico → Conta</span>
            </button>
          </div>

          {/* Preview de e para */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-2 flex-1">
              <div className="p-2 bg-background rounded-lg">
                <FromIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{fromLabel}</span>
            </div>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className="text-sm font-medium">{toLabel}</span>
              <div className="p-2 bg-background rounded-lg">
                <ToIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <input type="number" step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Data</label>
              <input type="date" value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Observações (opcional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ex: saque para despesas do dia"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
              Mover <strong>R$ {parseFloat(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> de <strong>{fromLabel}</strong> para <strong>{toLabel}</strong>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}