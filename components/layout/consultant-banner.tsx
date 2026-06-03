"use client"

import { useConsultant } from "@/contexts/consultant-context"
import { useRouter } from "next/navigation"
import { Eye, X } from "lucide-react"

export function ConsultantBanner() {
  const { activeClientId, activeClientName, setActiveClient } = useConsultant()

  if (!activeClientId) return null

  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>Você está vendo o sistema de <strong>{activeClientName}</strong></span>
      </div>
      <button
        onClick={() => setActiveClient(null, null)}
        className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-xs"
      >
        <X className="h-3.5 w-3.5" /> Voltar ao meu sistema
      </button>
    </div>
  )
}
