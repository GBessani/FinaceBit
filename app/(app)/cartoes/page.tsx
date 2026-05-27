"use client"

import { useFinance } from "@/contexts/finance-context"
import { CreditCard } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { useState, useMemo } from "react"
import {
  CreditCard as CardIcon, Plus, Trash2, Pencil,
  AlertTriangle, Bell, CheckCircle,
} from "lucide-react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { toast } from "sonner"

const CARD_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#10b981", "#3b82f6", "#0891b2",
]

const emptyForm = {
  name: "",
  limitAmount: "",
  dueDay: "10",
  color: "#6366f1",
}

export default function CartoesPage() {
  const { data, addCreditCard, updateCreditCard, deleteCreditCard, addScheduledTransaction } = useFinance()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [invoiceCardId, setInvoiceCardId] = useState<string | null>(null)
  const [invoiceAmount, setInvoiceAmount] = useState("")

  const today = new Date()

  // Calcula status de cada cartão
  const cardStatus = useMemo(() => {
    return data.creditCards.map(card => {
      const closingDay = card.closingDay
      const dueDay = card.dueDay
      const currentDay = today.getDate()

      // Dias até fechamento
      let daysToClose = closingDay - currentDay
      if (daysToClose < 0) daysToClose += 30

      // Dias até vencimento
      let daysToDue = dueDay - currentDay
      if (daysToDue < 0) daysToDue += 30

      // Fatura do mês atual (soma transações categorizadas como cartão)
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`

      const status = daysToClose <= 3 ? "closing" : daysToDue <= 5 ? "due_soon" : "ok"

      return { card, daysToClose, daysToDue, status, currentMonth }
    })
  }, [data.creditCards, today])

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(card: CreditCard) {
    setForm({
      name: card.name,
      limitAmount: card.limitAmount.toString(),
      dueDay: card.dueDay.toString(),
      color: card.color,
    })
    setEditingId(card.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.limitAmount || !form.dueDay) return
    const dueDay = parseInt(form.dueDay)
    const closingDay = dueDay - 7 <= 0 ? dueDay - 7 + 30 : dueDay - 7

    if (editingId) {
      await updateCreditCard({
        id: editingId, name: form.name,
        limitAmount: parseFloat(form.limitAmount),
        dueDay, closingDay, color: form.color, isActive: true,
      })
    } else {
      await addCreditCard({
        id: "", name: form.name,
        limitAmount: parseFloat(form.limitAmount),
        dueDay, closingDay, color: form.color, isActive: true,
      })
    }
    setShowForm(false)
    setEditingId(null)
  }

  async function handleAddInvoice(cardId: string) {
    const amount = parseFloat(invoiceAmount)
    if (!amount || amount <= 0) { toast.error("Informe um valor válido"); return }

    const card = data.creditCards.find(c => c.id === cardId)
    if (!card) return

    // Calcula próxima data de vencimento possível
    const today = new Date()
    const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), card.dueDay)
    const dueDate = thisMonthDue >= today ? thisMonthDue : new Date(today.getFullYear(), today.getMonth() + 1, card.dueDay)
    const scheduledDate = dueDate.toISOString().split("T")[0]

    // Adiciona como lançamento futuro único
    await addScheduledTransaction({
      id: "", description: `Fatura ${card.name}`,
      amount, type: "expense", categoryId: "",
      scheduledDate, isCompleted: false,
    })

    setInvoiceCardId(null)
    setInvoiceAmount("")
    toast.success(`Fatura de ${formatCurrency(amount)} agendada para ${dueDate.toLocaleDateString("pt-BR")}!`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gerencie seus cartões e faturas</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Adicionar Cartão
        </button>
      </div>

      {data.creditCards.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <CardIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum cartão cadastrado</h3>
          <p className="text-muted-foreground mb-6">Adicione seus cartões para controlar faturas e vencimentos</p>
          <button onClick={openAdd} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Adicionar cartão
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cardStatus.map(({ card, daysToClose, daysToDue, status }) => (
            <div key={card.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              {/* Header colorido */}
              <div className="p-5 text-white relative" style={{ backgroundColor: card.color }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg">{card.name}</p>
                    <p className="text-white/70 text-sm">Limite: {formatCurrency(card.limitAmount)}</p>
                  </div>
                  <CardIcon className="h-8 w-8 text-white/50" />
                </div>
                <div className="flex gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-white/70">Fechamento</p>
                    <p className="font-semibold">Dia {card.closingDay}</p>
                  </div>
                  <div>
                    <p className="text-white/70">Vencimento</p>
                    <p className="font-semibold">Dia {card.dueDay}</p>
                  </div>
                </div>
              </div>

              {/* Alertas */}
              {status === "closing" && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2 text-amber-800 dark:text-amber-300 text-sm">
                  <Bell className="h-4 w-4 shrink-0" />
                  <span>Fatura fecha em {daysToClose === 0 ? "hoje" : `${daysToClose} dias`}! Lance a fatura.</span>
                </div>
              )}
              {status === "due_soon" && (
                <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center gap-2 text-red-800 dark:text-red-300 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Vence em {daysToDue === 0 ? "hoje" : `${daysToDue} dias`}!</span>
                </div>
              )}
              {status === "ok" && (
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Fecha em {daysToClose} dias · Vence em {daysToDue} dias</span>
                </div>
              )}

              {/* Ações */}
              <div className="p-4 space-y-3">
                {/* Lançar fatura */}
                {invoiceCardId === card.id ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceAmount}
                      onChange={e => setInvoiceAmount(e.target.value)}
                      placeholder="Valor da fatura"
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddInvoice(card.id)}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setInvoiceCardId(null)}
                      className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setInvoiceCardId(card.id); setInvoiceAmount("") }}
                    className="w-full py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    + Lançar fatura do próximo mês
                  </button>
                )}

                {/* Editar / Excluir */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(card)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-border rounded-lg text-xs hover:bg-secondary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteId(card.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-lg mb-4">{editingId ? "Editar Cartão" : "Novo Cartão"}</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome do cartão</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Nubank, Itaú Gold"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Limite (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.limitAmount}
                    onChange={e => setForm(p => ({ ...p, limitAmount: e.target.value }))}
                    placeholder="5000,00"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Dia de vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.dueDay}
                    onChange={e => setForm(p => ({ ...p, dueDay: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {form.dueDay && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Fechamento: dia {parseInt(form.dueDay) - 7 <= 0 ? parseInt(form.dueDay) - 7 + 30 : parseInt(form.dueDay) - 7}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Cor do cartão</label>
                <div className="flex gap-2 flex-wrap">
                  {CARD_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(p => ({ ...p, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === color ? "scale-110 border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name || !form.limitAmount}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {editingId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir cartão?"
        description="O cartão será removido permanentemente."
        onConfirm={() => { deleteId && deleteCreditCard(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}