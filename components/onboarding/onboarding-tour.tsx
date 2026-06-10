"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useFinance } from "@/contexts/finance-context"
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"

interface TourStep {
  target: string
  title: string
  description: string
  position: "top" | "bottom" | "left" | "right"
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='summary']",
    title: "Resumo Financeiro",
    description: "Aqui você acompanha suas receitas, despesas e saldo do mês. Navegue entre os meses pelas setas.",
    position: "bottom",
  },
  {
    target: "[data-tour='upcoming']",
    title: "Próximos Vencimentos",
    description: "Veja contas fixas e lançamentos futuros que estão chegando. Nunca mais esqueça um pagamento!",
    position: "bottom",
  },
  {
    target: "[data-tour='charts']",
    title: "Gráficos",
    description: "Visualize seus gastos por categoria e a evolução mensal das suas finanças.",
    position: "top",
  },
  {
    target: "[data-tour='recent']",
    title: "Transações Recentes",
    description: "Suas últimas movimentações ficam aqui. Clique em 'Ver todas' para o histórico completo.",
    position: "top",
  },
  {
    target: "[data-tour='ai']",
    title: "Assistente IA ✨",
    description: "Clique aqui para conversar com a IA sobre suas finanças. Ela analisa seus dados e dá dicas personalizadas!",
    position: "left",
  },
]

interface Rect { top: number; left: number; width: number; height: number }

export function OnboardingTour() {
  const { user } = useFinance()
  const [phase, setPhase] = useState<"idle" | "ask" | "tour">("idle")
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const supabase = createClient()

  useEffect(() => {
    if (!user) return
    const done = localStorage.getItem("onboarding-done")
    if (!done) setTimeout(() => setPhase("ask"), 1000)
  }, [user])

  const updatePosition = useCallback(() => {
    if (phase !== "tour") return
    const step = TOUR_STEPS[currentStep]
    const el = document.querySelector(step.target)
    if (!el) return

    const rect = el.getBoundingClientRect()
    const pad = 8
    // Scroll first, then recalculate after animation
    el.scrollIntoView({ behavior: "smooth", block: "center" })

    setTimeout(() => {
      const r2 = el.getBoundingClientRect()
      setTargetRect({ top: r2.top - pad, left: r2.left - pad, width: r2.width + pad * 2, height: r2.height + pad * 2 })

      const tw = 320; const th = 180
      let top = 0; let left = 0

      if (step.position === "bottom") { top = r2.bottom + pad + 12; left = r2.left + r2.width / 2 - tw / 2 }
      else if (step.position === "top") { top = r2.top - th - pad - 12; left = r2.left + r2.width / 2 - tw / 2 }
      else if (step.position === "left") { top = r2.top + r2.height / 2 - th / 2; left = r2.left - tw - pad - 12 }
      else { top = r2.top + r2.height / 2 - th / 2; left = r2.right + pad + 12 }

      left = Math.max(16, Math.min(left, window.innerWidth - tw - 16))
      top = Math.max(80, Math.min(top, window.innerHeight - th - 16))
      setTooltipPos({ top, left })
    }, 500)
  }, [phase, currentStep])

  useEffect(() => {
    updatePosition()
    window.addEventListener("resize", updatePosition)
    return () => window.removeEventListener("resize", updatePosition)
  }, [updatePosition])

  async function dismiss() {
    localStorage.setItem("onboarding-done", "1")
    if (user) await supabase.from("profiles").upsert({ id: user.id, onboarding_completed: true })
    setPhase("idle")
  }

  function startTour() { setPhase("tour"); setCurrentStep(0) }

  function next() {
    if (currentStep < TOUR_STEPS.length - 1) setCurrentStep(p => p + 1)
    else dismiss()
  }

  function prev() { if (currentStep > 0) setCurrentStep(p => p - 1) }

  if (phase === "idle") return null

  // Tela de boas-vindas
  if (phase === "ask") return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Bem-vindo ao FinaceBit!</h2>
            <p className="text-sm text-muted-foreground">Quer fazer um tour rápido?</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Vou te mostrar as principais funcionalidades em menos de 1 minuto. Você pode pular a qualquer momento!
        </p>
        <div className="flex gap-3">
          <button onClick={dismiss} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-secondary transition-colors">
            Pular
          </button>
          <button onClick={startTour} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            Começar tour <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  // Tour
  const step = TOUR_STEPS[currentStep]
  return (
    <>
      <div className="fixed inset-0 z-[60] pointer-events-none">
        {targetRect && (
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect x={targetRect.left} y={targetRect.top} width={targetRect.width} height={targetRect.height} rx="12" fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
            <rect x={targetRect.left} y={targetRect.top} width={targetRect.width} height={targetRect.height} rx="12" fill="none" stroke="#10b981" strokeWidth="2" className="animate-pulse" />
          </svg>
        )}
      </div>

      <button onClick={dismiss} className="fixed top-4 right-4 z-[70] flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors shadow-lg">
        <X className="h-3.5 w-3.5" /> Pular tour
      </button>

      <div className="fixed z-[70] w-80 bg-card border border-border rounded-2xl shadow-2xl p-5" style={{ top: tooltipPos.top, left: tooltipPos.left }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-primary/10 rounded-lg"><Sparkles className="h-4 w-4 text-primary" /></div>
          <h3 className="font-semibold">{step.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? "w-4 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button onClick={prev} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button onClick={next} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              {currentStep === TOUR_STEPS.length - 1 ? "Concluir 🎉" : "Próximo"}
              {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}