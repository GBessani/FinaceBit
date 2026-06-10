"use client"

import { X } from "lucide-react"
import { useEffect } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: "sm" | "md" | "lg"
  position?: "center" | "bottom"
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal({ isOpen, onClose, title, subtitle, size = "md", position = "center", children, footer }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxW = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-lg" : "max-w-md"
  const positionClass = position === "bottom"
    ? "items-end sm:items-center"
    : "items-center"

  return (
    <div
      className={`fixed inset-0 z-50 flex ${positionClass} justify-center bg-background/80 backdrop-blur-sm p-4`}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-card border border-border rounded-2xl shadow-xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <div>
            <h3 className="font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
