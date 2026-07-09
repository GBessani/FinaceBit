"use client"

import { useState } from "react"
import * as React from "react"
import { DeleteConfirm } from "@/components/ui/delete-confirm"
import { useFinance } from "@/contexts/finance-context"
import { FixedBill, RecurrenceType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CategoryIcon } from "@/components/categories/category-icon"
import { formatCurrency, localDateStr } from "@/lib/utils"
import { validateAmount, parseAmount } from "@/lib/validation"
import { Plus, Trash2, Edit, RefreshCw, Calendar, Pause, Play, CheckCircle } from "lucide-react"

const recurrenceLabels: Record<RecurrenceType, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  yearly: "Anual",
}

export function FixedBillsList() {
  const { data, addFixedBill, updateFixedBill, deleteFixedBill, getCategory, addTransaction } = useFinance()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [editingBill, setEditingBill] = React.useState<FixedBill | null>(null)
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [type, setType] = React.useState<"income" | "expense" | "transfer">("expense")
  const [categoryId, setCategoryId] = React.useState("")
  const [dueDay, setDueDay] = React.useState("1")
  const [recurrence, setRecurrence] = React.useState<RecurrenceType>("monthly")
  const [notes, setNotes] = React.useState("")
  const [wallet, setWallet] = React.useState<"digital" | "cash" | "credit_card">("digital")
  const [creditCardId, setCreditCardId] = React.useState("")

  const filteredCategories = data.categories.filter((c) => c.type === type)

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setType("expense")
    setCategoryId("")
    setDueDay("1")
    setRecurrence("monthly")
    setNotes("")
    setWallet("digital")
    setCreditCardId("")
    setEditingBill(null)
  }

  const handleOpenDialog = (bill?: FixedBill) => {
    if (bill) {
      setEditingBill(bill)
      setDescription(bill.description)
      setAmount(bill.amount.toString())
      setType(bill.type)
      setCategoryId(bill.categoryId)
      setDueDay(bill.dueDay.toString())
      setRecurrence(bill.recurrence)
      setNotes(bill.notes || "")
      setWallet(bill.wallet ?? "digital")
      setCreditCardId(bill.creditCardId ?? "")
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!description.trim()) errs.description = "Descrição é obrigatória"
    const amtErr = validateAmount(amount)
    if (amtErr) errs.amount = amtErr
    if (!dueDay) errs.dueDay = "Dia de vencimento é obrigatório"
    else if (parseInt(dueDay) < 1 || parseInt(dueDay) > 31) errs.dueDay = "Dia deve ser entre 1 e 31"
    if (wallet === "credit_card" && !creditCardId) errs.creditCard = "Selecione o cartão"
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const billData: FixedBill = {
      id: editingBill?.id || "",
      description,
      amount: parseAmount(amount)!,
      type,
      categoryId,
      dueDay: parseInt(dueDay),
      recurrence: wallet === "credit_card" ? "monthly" : recurrence,
      isActive: editingBill?.isActive ?? true,
      notes: notes || undefined,
      wallet,
      creditCardId: wallet === "credit_card" ? creditCardId : undefined,
    }

    if (editingBill) {
      updateFixedBill(billData)
    } else {
      addFixedBill(billData)
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const confirmBill = async (bill: FixedBill) => {
    if (confirmingId === bill.id) return
    setConfirmingId(bill.id)
    try {
      const today = localDateStr()
      await addTransaction({
        id: crypto.randomUUID(),
        description: bill.description,
        amount: bill.amount,
        type: bill.type as "income" | "expense",
        categoryId: bill.categoryId,
        date: today,
        wallet: "digital" as const,
        notes: `Confirmado de conta fixa`,
      })
    } finally {
      setConfirmingId(null)
    }
  }

  const toggleActive = (bill: FixedBill) => {
    updateFixedBill({ ...bill, isActive: !bill.isActive })
  }

  const getDaysUntilDue = (dueDay: number) => {
    const today = new Date()
    const currentDay = today.getDate()
    if (dueDay >= currentDay) {
      return dueDay - currentDay
    }
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    return daysInMonth - currentDay + dueDay
  }

  const expenses = data.fixedBills.filter((b) => b.type === "expense")
  const incomes = data.fixedBills.filter((b) => b.type === "income")

  const totalFixedExpenses = expenses.filter(b => b.isActive).reduce((sum, b) => sum + b.amount, 0)
  const totalFixedIncomes = incomes.filter(b => b.isActive).reduce((sum, b) => sum + b.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contas Fixas</h2>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas recorrentes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta Fixa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBill ? "Editar Conta Fixa" : "Nova Conta Fixa"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v: "income" | "expense") => {
                    setType(v)
                    setCategoryId("")
                    if (v === "income") { setWallet("digital"); setCreditCardId("") }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recorrência</Label>
                  <Select
                    value={recurrence}
                    onValueChange={(v: RecurrenceType) => setRecurrence(v)}
                    disabled={wallet === "credit_card"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  {wallet === "credit_card" && (
                    <p className="text-xs text-muted-foreground">
                      Contas no cartão são sempre mensais.
                    </p>
                  )}
                </div>
              </div>

              {/* Carteira — só mostra "Cartão" para despesas */}
              {type === "expense" && (
                <div className="space-y-2">
                  <Label>Cobrado em</Label>
                  <div className="flex gap-2">
                    {(["digital", "cash", "credit_card"] as const).map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => { setWallet(w); if (w === "credit_card") setRecurrence("monthly"); else setCreditCardId("") }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          wallet === w
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        {w === "digital" ? "💳 Digital" : w === "cash" ? "💵 Físico" : "🔄 Cartão"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seletor de cartão — só aparece quando wallet = credit_card */}
              {wallet === "credit_card" && (
                <div className="space-y-2">
                  <Label>Cartão de Crédito</Label>
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger className={errors.creditCard ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione o cartão..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data.creditCards.filter(c => c.isActive).map(card => (
                        <SelectItem key={card.id} value={card.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: card.color }}
                            />
                            {card.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.creditCard && (
                    <p className="text-xs text-red-500">{errors.creditCard}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A parcela será gerada automaticamente na fatura todo mês.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Aluguel, Netflix, Salário..."
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia do Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon icon={cat.icon} color={cat.color} size={14} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione notas..."
                />
              </div>

              <Button type="submit" className="w-full">
                {editingBill ? "Salvar Alterações" : "Adicionar Conta Fixa"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Despesas Fixas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totalFixedExpenses)}
            </p>
            <p className="text-xs text-muted-foreground">{expenses.filter(b => b.isActive).length} contas ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Receitas Fixas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(totalFixedIncomes)}
            </p>
            <p className="text-xs text-muted-foreground">{incomes.filter(b => b.isActive).length} contas ativas</p>
          </CardContent>
        </Card>
      </div>

      {data.fixedBills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma conta fixa cadastrada.
              <br />
              Adicione suas despesas e receitas recorrentes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {expenses.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 text-destructive">Despesas Fixas</h3>
              <div className="space-y-2">
                {expenses.map((bill) => {
                  const category = getCategory(bill.categoryId)
                  const daysUntil = getDaysUntilDue(bill.dueDay)
                  return (
                    <Card key={bill.id} className={!bill.isActive ? "opacity-50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {category && <CategoryIcon icon={category.icon} color={category.color} />}
                            <div className="min-w-0">
                              <p className="font-medium truncate">{bill.description}</p>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Dia {bill.dueDay}</span>
                                <Badge variant="outline" className="text-xs">{recurrenceLabels[bill.recurrence]}</Badge>
                                {bill.wallet === "credit_card" && (() => {
                                  const card = data.creditCards.find(c => c.id === bill.creditCardId)
                                  return card ? (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: card.color }} />
                                      {card.name}
                                    </Badge>
                                  ) : null
                                })()}
                                {bill.isActive && daysUntil <= 5 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {daysUntil === 0 ? "Hoje" : `Em ${daysUntil} dias`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="font-semibold text-destructive shrink-0">-{formatCurrency(bill.amount)}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                          <Button variant="ghost" size="sm" onClick={() => confirmBill(bill)}
                            disabled={confirmingId === bill.id}
                            className="flex-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />{confirmingId === bill.id ? "Confirmando..." : "Confirmar"}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleActive(bill)} title={bill.isActive ? "Pausar" : "Ativar"}>
                            {bill.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(bill)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(bill.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {incomes.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 text-primary">Receitas Fixas</h3>
              <div className="space-y-2">
                {incomes.map((bill) => {
                  const category = getCategory(bill.categoryId)
                  const daysUntil = getDaysUntilDue(bill.dueDay)
                  return (
                    <Card key={bill.id} className={!bill.isActive ? "opacity-50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {category && <CategoryIcon icon={category.icon} color={category.color} />}
                            <div className="min-w-0">
                              <p className="font-medium truncate">{bill.description}</p>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Dia {bill.dueDay}</span>
                                <Badge variant="outline" className="text-xs">{recurrenceLabels[bill.recurrence]}</Badge>
                                {bill.isActive && daysUntil <= 3 && (
                                  <Badge variant="default" className="text-xs bg-primary">
                                    {daysUntil === 0 ? "Hoje" : `Em ${daysUntil} dias`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="font-semibold text-primary shrink-0">+{formatCurrency(bill.amount)}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                          <Button variant="ghost" size="sm" onClick={() => confirmBill(bill)}
                            disabled={confirmingId === bill.id}
                            className="flex-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />{confirmingId === bill.id ? "Confirmando..." : "Confirmar"}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toggleActive(bill)} title={bill.isActive ? "Pausar" : "Ativar"}>
                            {bill.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(bill)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(bill.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
      <DeleteConfirm
        isOpen={!!deleteId}
        title="Excluir conta fixa?"
        description="A conta fixa será removida permanentemente."
        onConfirm={() => { deleteId && deleteFixedBill(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}