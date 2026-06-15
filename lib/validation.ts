import { localDateStr } from "./utils"

export function parseAmount(value: string): number | null {
  const n = parseFloat(String(value).replace(",", "."))
  return isNaN(n) || !isFinite(n) ? null : n
}

// Retorna mensagem de erro ou null se válido. min padrão = 0.01 (> zero).
export function validateAmount(value: string, fieldName = "Valor", { allowZero = false } = {}): string | null {
  if (!value || String(value).trim() === "") return `${fieldName} é obrigatório`
  const n = parseAmount(value)
  if (n === null) return `${fieldName} deve ser um número válido`
  if (!allowZero && n <= 0) return `${fieldName} deve ser maior que zero`
  if (allowZero && n < 0) return `${fieldName} não pode ser negativo`
  return null
}

export function validateDate(value: string, fieldName = "Data"): string | null {
  if (!value) return `${fieldName} é obrigatória`
  const d = new Date(value)
  if (isNaN(d.getTime())) return `${fieldName} inválida`
  return null
}

// Válido apenas se a data for hoje ou no futuro.
export function validateFutureDate(value: string, fieldName = "Prazo"): string | null {
  const base = validateDate(value, fieldName)
  if (base) return base
  if (value < localDateStr()) return `${fieldName} não pode ser uma data passada`
  return null
}
