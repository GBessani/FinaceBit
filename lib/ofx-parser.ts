/**
 * lib/ofx-parser.ts
 *
 * Parser de arquivos OFX (Open Financial Exchange) — formato padrão de
 * extrato dos bancos brasileiros (BB, Itaú, Bradesco, Nubank, etc.).
 *
 * Usa a lib `ofx-js` (zero deps) apenas para converter SGML → objeto JS.
 * O mapeamento para o modelo de Transaction do FinaceBit fica aqui,
 * isolando a dependência externa do resto do app.
 */

import { parse } from "ofx-js"
import { localDateStr } from "./utils"

export interface OFXTransaction {
  /** ID único do banco — usado para detectar duplicatas */
  fitId: string
  /** "CREDIT" | "DEBIT" | "INT" | "DIV" | "FEE" | "SRVCHG" | "OTHER" */
  trnType: string
  /** Data da transação no formato YYYY-MM-DD (já convertida para fuso local) */
  date: string
  /** Valor absoluto (sempre positivo) */
  amount: number
  /** income | expense */
  type: "income" | "expense"
  /** Descrição original do banco */
  memo: string
  /** Nome do beneficiário (nem sempre presente) */
  name?: string
}

export interface OFXParseResult {
  transactions: OFXTransaction[]
  bankId?: string
  accountId?: string
  accountType?: string
  startDate?: string
  endDate?: string
  balance?: number
  error?: string
}

/**
 * Converte o formato de data OFX (YYYYMMDD[HHMMSS][[+-HH:TZ]]) para YYYY-MM-DD.
 * Extrai apenas os 8 dígitos iniciais — sem conversão de fuso — para preservar
 * a data local informada pelo banco (que já considera o fuso do cliente).
 */
/**
 * Converte o valor de uma transação OFX para número, tratando os dois formatos
 * comuns: americano (1234.56 ou 1,234.56) e brasileiro (1.234,56).
 * A regra: se houver vírgula E ponto, o último separador é o decimal.
 */
function parseOfxAmount(raw: unknown): number {
  const s = String(raw ?? "0").trim()
  if (!s) return 0
  const hasComma = s.includes(",")
  const hasDot = s.includes(".")
  if (hasComma && hasDot) {
    // O separador que aparecer por último é o decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // formato BR: 1.234,56 → remove pontos de milhar, vírgula vira ponto
      return parseFloat(s.replace(/\./g, "").replace(",", "."))
    }
    // formato US: 1,234.56 → remove vírgulas de milhar
    return parseFloat(s.replace(/,/g, ""))
  }
  // Só um separador: se for vírgula, é decimal (padrão BR sem milhar)
  return parseFloat(s.replace(",", "."))
}

function ofxDateToLocal(dtPosted: string): string {
  const digits = dtPosted.replace(/\[.*\]/, "").replace(/\s/g, "")
  const y = digits.substring(0, 4)
  const m = digits.substring(4, 6)
  const d = digits.substring(6, 8)
  if (!y || !m || !d || isNaN(Number(y + m + d))) return localDateStr()
  return `${y}-${m}-${d}`
}

/**
 * Determina o tipo da transação a partir do TRNTYPE e do sinal do valor.
 * CREDIT = entrada, DEBIT = saída; INT/DIV podem ser entradas; FEE = saída.
 */
function resolveType(trnType: string, amount: number): "income" | "expense" {
  const creditTypes = ["CREDIT", "INT", "DIV", "DIRECTDEPOSIT"]
  const debitTypes  = ["DEBIT", "FEE", "SRVCHG", "PAYMENT", "ATM", "POS"]

  if (creditTypes.includes(trnType.toUpperCase())) return "income"
  if (debitTypes.includes(trnType.toUpperCase()))  return "expense"
  // Fallback pelo sinal do valor quando o tipo é genérico ("OTHER", "XFER")
  return amount >= 0 ? "income" : "expense"
}

/**
 * Faz o parse de um arquivo OFX e retorna as transações normalizadas.
 * Suporta tanto OFX/SGML (mais comum nos bancos BR) quanto OFX/XML.
 */
export async function parseOFX(content: string): Promise<OFXParseResult> {
  try {
    const data = await parse(content)

    // Navega até o extrato — suporta conta corrente/poupança (BANK) e cartão (CC)
    const stmtRs =
      data?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS ??
      data?.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS

    if (!stmtRs) {
      return { transactions: [], error: "Formato OFX não reconhecido — extrato não encontrado no arquivo." }
    }

    const acct      = stmtRs.BANKACCTFROM ?? stmtRs.CCACCTFROM
    const tranList  = stmtRs.BANKTRANLIST
    const ledger    = stmtRs.LEDGERBAL

    // O OFX pode retornar um array ou um único objeto quando há 1 transação
    const rawTxs = tranList?.STMTTRN
    const txArray: any[] = Array.isArray(rawTxs)
      ? rawTxs
      : rawTxs != null ? [rawTxs] : []

    const transactions: OFXTransaction[] = txArray.map((tx: any) => {
      const rawAmount = parseOfxAmount(tx.TRNAMT)
      const absAmount = Math.abs(rawAmount)
      const trnType   = String(tx.TRNTYPE ?? "OTHER").toUpperCase()
      const type      = resolveType(trnType, rawAmount)

      return {
        fitId:   String(tx.FITID ?? crypto.randomUUID()),
        trnType,
        date:    ofxDateToLocal(String(tx.DTPOSTED ?? "")),
        amount:  Math.round(absAmount * 100) / 100,
        type,
        memo:    String(tx.MEMO ?? tx.NAME ?? "Sem descrição").trim(),
        name:    tx.NAME ? String(tx.NAME).trim() : undefined,
      }
    })

    // Ordena por data decrescente (mais recente primeiro)
    transactions.sort((a, b) => b.date.localeCompare(a.date))

    return {
      transactions,
      bankId:      acct?.BANKID,
      accountId:   acct?.ACCTID ?? acct?.ACCTID,
      accountType: acct?.ACCTTYPE,
      startDate:   tranList?.DTSTART ? ofxDateToLocal(tranList.DTSTART) : undefined,
      endDate:     tranList?.DTEND   ? ofxDateToLocal(tranList.DTEND)   : undefined,
      balance:     ledger?.BALAMT    ? parseOfxAmount(ledger.BALAMT) : undefined,
    }
  } catch (err: any) {
    return {
      transactions: [],
      error: `Erro ao ler o arquivo: ${err?.message ?? "formato inválido"}`,
    }
  }
}