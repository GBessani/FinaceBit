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
import { CategoryIcon } from "@/components/category-icon"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, Edit, RefreshCw, Calendar, Pause, Play } from "lucide-react"

const recurrenceLabels: Record<RecurrenceType, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  biweekly: "Quinzenal",
  yearly: "Anual",
}

export function FixedBillsList() {
  const { data, addFixedBill, updateFixedBill, deleteFixedBill, getCategory } = useFinance()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingBill, setEditingBill] = React.useState<FixedBill | null>(null)
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [type, setType] = React.useState<"income" | "expense" | "transfer">("expense")
  const [categoryId, setCategoryId] = React.useState("")
  const [dueDay, setDueDay] = React.useState("1")
  const [recurrence, setRecurrence] = React.useState<RecurrenceType>("monthly")
  const [notes, setNotes] = React.useState("")

  const filteredCategories = data.categories.filter((c) => c.type === type)

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setType("expense")
    setCategoryId("")
    setDueDay("1")
    setRecurrence("monthly")
    setNotes("")
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
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !categoryId) return

    const billData: FixedBill = {
      id: editingBill?.id || "",
      description,
      amount: parseFloat(amount),
      type,
      categoryId,
      dueDay: parseInt(dueDay),
      recurrence,
      isActive: editingBill?.isActive ?? true,
      notes: notes || undefined,
    }

    if (editingBill) {
      updateFixedBill(billData)
    } else {
      addFixedBill(billData)
    }

    setIsDialogOpen(false)
    resetForm()
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v: "income" | "expense") => {
                    setType(v)
                    setCategoryId("")
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
                  <Select value={recurrence} onValueChange={(v: RecurrenceType) => setRecurrence(v)}>
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
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Aluguel, Netflix, Salário..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          {category && (
                            <CategoryIcon icon={category.icon} color={category.color} />
                          )}
                          <div>
                            <p className="font-medium">{bill.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Dia {bill.dueDay}</span>
                              <Badge variant="outline" className="text-xs">
                                {recurrenceLabels[bill.recurrence]}
                              </Badge>
                              {bill.isActive && daysUntil <= 5 && (
                                <Badge variant="destructive" className="text-xs">
                                  {daysUntil === 0 ? "Hoje" : `Em ${daysUntil} dias`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-semibold text-destructive">
                            -{formatCurrency(bill.amount)}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleActive(bill)}
                              title={bill.isActive ? "Pausar" : "Ativar"}
                            >
                              {bill.isActive ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(bill)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(bill.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          {category && (
                            <CategoryIcon icon={category.icon} color={category.color} />
                          )}
                          <div>
                            <p className="font-medium">{bill.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Dia {bill.dueDay}</span>
                              <Badge variant="outline" className="text-xs">
                                {recurrenceLabels[bill.recurrence]}
                              </Badge>
                              {bill.isActive && daysUntil <= 3 && (
                                <Badge variant="default" className="text-xs bg-primary">
                                  {daysUntil === 0 ? "Hoje" : `Em ${daysUntil} dias`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-semibold text-primary">
                            +{formatCurrency(bill.amount)}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleActive(bill)}
                              title={bill.isActive ? "Pausar" : "Ativar"}
                            >
                              {bill.isActive ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(bill)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(bill.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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