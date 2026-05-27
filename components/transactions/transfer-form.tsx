"use client"

import { useState } from "react"
import { useFinance } from "@/contexts/finance-context"
import { ArrowLeftRight, X } from "lucide-react"
import { toast } from "sonner"

const ACCOUNTS = [
  "Conta Corrente",
  "Poupança",
  "Carteira",
  "Investimentos",
  "Outro",
]

interface TransferFormProps {
  onClose: () => void
}

export function TransferForm({ onClose }: TransferFormProps) {
  const { addTransaction } = useFinance()
  const [amount, setAmount] = useState("")
  const [from, setFrom] = useState(ACCOUNTS[0])
  const [to, setTo] = useState(ACCOUNTS[1])
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return
    if (from === to) { toast.error("Origem e destino não podem ser iguais"); return }

    setLoading(true)
    try {
      await addTransaction({
        id: "",
        description: `Transferência: ${from} → ${to}`,
        amount: parseFloat(amount),
        type: "transfer",
        categoryId: "",
        date,
        notes: notes || `De ${from} para ${to}`,
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
          {/* Origem → Destino */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">De</label>
              <select
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <ArrowLeftRight className="h-5 w-5 text-muted-foreground mt-5 shrink-0" />

            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Para</label>
              <select
                value={to}
                onChange={e => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {from === to && (
            <p className="text-xs text-red-500">Origem e destino não podem ser iguais</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Observações (opcional)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: reserva de emergência"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Preview */}
          {amount && from !== to && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
              <ArrowLeftRight className="h-3.5 w-3.5 inline mr-1" />
              Mover <strong>R$ {parseFloat(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> de <strong>{from}</strong> para <strong>{to}</strong>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !amount || from === to}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
