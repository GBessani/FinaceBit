"use client"

import { useState, useEffect } from "react"
import { Trash2, AlertTriangle } from "lucide-react"

interface DeleteConfirmProps {
  isOpen: boolean
  title?: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirm({
  isOpen,
  title = "Excluir item?",
  description = "Esta ação não pode ser desfeita.",
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  const [fired, setFired] = useState(false)

  useEffect(() => {
    if (!isOpen) setFired(false)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (!fired) { setFired(true); onConfirm() } }}
            disabled={fired}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
