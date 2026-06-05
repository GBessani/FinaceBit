"use client"

import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Verifica se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) return

    // Verifica se o usuário já dispensou
    if (localStorage.getItem("pwa-banner-dismissed")) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") setShow(false)
    setDeferredPrompt(null)
  }

  function dismiss() {
    setShow(false)
    localStorage.setItem("pwa-banner-dismissed", "1")
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <div className="p-2 bg-primary/10 rounded-xl shrink-0">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Instalar FinaceBit</p>
        <p className="text-xs text-muted-foreground">Acesse direto da tela inicial</p>
      </div>
      <button onClick={install}
        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
        Instalar
      </button>
      <button onClick={dismiss} className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0">
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
