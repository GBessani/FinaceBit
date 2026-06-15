# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Este arquivo descreve a arquitetura, as regras técnicas e o estado atual do projeto. Mantenha-o atualizado conforme o projeto evolui.

---

## Visão geral

**FinaceBit** é um app de gestão financeira pessoal (PWA) com suporte a um modo "consultor"
(um consultor financeiro gerencia as finanças de múltiplos clientes).

- **Produção:** https://finace-bit.vercel.app
- **Domínio planejado:** finacebit.com (a comprar)
- **Dono/dev:** Gabriel Bessani Ferreira (Cianorte-PR)

---

## Stack

- **Framework:** Next.js 16.2.6 (App Router, Turbopack)
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS v4 + shadcn/ui
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage). Project ID: `kdyxkjjbgpcwzexrujxy`
- **Hospedagem:** Vercel (deploy automático via push na branch `main`)
- **IA:** Groq AI (assistente financeiro, Llama 3.3-70b-versatile)
- **Testes:** Vitest (44 testes em `__tests__/`)
- **Analytics:** Google Analytics (G-CYNBJWSP9J)

---

## Commands

```bash
npm run dev        # Dev server (Turbopack)
npm run build      # Build de produção
npm run lint       # ESLint
npm run test       # Rodar testes (Vitest)
npm run test:watch # Watch mode
npm run test:ui    # Vitest UI
```

Rodar um único arquivo de testes:
```bash
npx vitest run __tests__/utils.test.ts
```

## Environment

Copiar `.env.example` para `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` — painel do Supabase > Settings > API
- `GROQ_API_KEY` — para o assistente IA

---

## Estrutura de pastas

```
app/
  (app)/                    # route group autenticado (não aparece na URL)
    page.tsx                # Dashboard
    transacoes/             # Transações (3 abas: A Vencer, Atrasadas, Concluídas)
    cartoes/                # Cartões de crédito + faturas
    calendario/             # Calendário financeiro
    contas-fixas/           # Contas fixas recorrentes
    metas/                  # Metas financeiras
    categorias/             # Categorias
    investimentos/          # Investimentos (refatorado em componentes)
    orcamento/              # Orçamento por categoria
    relatorios/             # Relatórios
    clientes/               # Modo consultor: lista de clientes
    perfil/                 # Perfil do usuário
    layout.tsx              # Layout autenticado (Sidebar + Providers)
  login/                    # Login (Google OAuth + email/senha + cadastro)
  auth/callback/            # Callback OAuth
  api/
    chat/                   # Endpoint do assistente IA (Groq, rate-limit 20/hr por IP)
    investments/            # Cotações de ativos
    consultant/             # Convite/ativação de vínculo consultor-cliente
components/
  layout/                   # Sidebar, banners, PWA install
  dashboard/                # Cards do dashboard, charts, alert-banner
  transactions/             # transactions-list, transfer-form
  categories/               # categories-list, category-icon
  fixed-bills/              # fixed-bills-list
  goals/                    # goals-list
  investments/              # use-investments (hook), investment-form,
                            #   investment-summary, investment-transaction-modal
  onboarding/               # onboarding-tour
  ai/                       # ai-assistant
  ui/                       # shadcn + Modal, delete-confirm, etc.
contexts/
  finance-context.tsx       # Estado global financeiro (toda a lógica de dados)
  consultant-context.tsx    # Estado do modo consultor
lib/
  types.ts                  # Tipos (Transaction, Category, CreditCard, etc.)
  utils.ts                  # formatCurrency, localDateStr, getInvoiceWindow, etc.
  investment-calc.ts        # Cálculos de IR/IOF e rendimentos
  supabase/                 # Clients (client.ts, server.ts)
supabase/migrations/        # Migrations SQL (013, 014, 015...)
__tests__/                  # Testes Vitest
```

---

## Regras técnicas OBRIGATÓRIAS

1. **IDs:** usar `crypto.randomUUID()`. NUNCA usar `generateId()` (gera formato inválido para colunas UUID do Postgres).

2. **Datas:** usar `localDateStr(date)` de `lib/utils` para formatar como `YYYY-MM-DD`.
   NUNCA usar `toISOString().split("T")[0]` — converte para UTC e causa bug de fuso no Brasil
   (uma data de "hoje" à noite vira "amanhã" em UTC).

3. **Transações pendentes (`status: "pending"`):** NÃO entram em nenhum cálculo de saldo real
   (totalBalance, walletBalances, getTotalIncome/Expenses). Só aparecem como PREVISÃO
   (barras tracejadas nos gráficos, alertas). Filtrar sempre `status !== "pending"` para saldo real.

4. **Status de transação é determinado pela data:** data futura → `pending`; data de hoje ou passada → `completed`.

5. **`mapTransaction` (em finance-context):** DEVE mapear todos os campos do banco, incluindo
   `status`, `wallet`, `installmentNumber`, `totalInstallments`, `installmentGroupId`.
   (Bug recorrente: esquecer campos aqui faz transações aparecerem na aba errada.)

6. **Import do CategoryIcon:** `@/components/categories/category-icon`.

7. **Modais:** usar o componente `<Modal>` de `components/ui/modal.tsx`
   (props: isOpen, onClose, title, subtitle, size "sm"|"md"|"lg", footer).
   NÃO criar modais inline com `fixed inset-0 z-50`.

8. **Funções utilitárias centralizadas** (não duplicar):
   - `getInvoiceWindow(closingDay)` → janela de fatura do cartão
   - `getInvoiceMonth(purchaseDate, closingDay)` → qual fatura recebe a compra
   - `addMonthsToInvoiceMonth(invoiceMonth, n)` → dueMonth das parcelas seguintes
   - `localDateStr(date)` → data local sem bug de fuso
   - `formatCurrency(value)` → R$ formatado pt-BR

9. **Padrão visual:** cards `p-5`, botões ícone `p-2`, labels `mb-1.5`, empty states `py-12`,
   inputs com `focus:outline-none focus:ring-2 focus:ring-primary/20`, botões `rounded-lg`.

10. **Supabase clients:** `lib/supabase/server.ts` (Server Components / Route Handlers) e
    `lib/supabase/client.ts` (Client Components). Nunca misturar.

11. **Modo consultor:** quando um consultor seleciona um cliente, `activeClientId` é setado em
    `ConsultantContext`. O `FinanceContext` usa `targetUserIdRef.current || user.id` em todas as
    escritas — não usar `user.id` diretamente em inserts.

12. **payCCInvoice:** usa IDs exatos das parcelas (`.in("id", installmentIds)`), NÃO filtro por
    `due_month`. A UI passa os IDs que exibiu; não inferir pelo mês.

---

## Modelo de dados (principais tabelas Supabase)

- `profiles` — 1:1 com `auth.users`; `role` (user/consultant), `initial_balance`, `onboarding_completed`, `avatar_url`
- `transactions` — `status` (pending/completed), `wallet` (digital/cash), `installment_*`, `type` (income/expense/transfer)
- `categories` — `icon` (nome Lucide OU emoji), `color`, `type`
- `credit_cards` — `due_day`, `closing_day`, `limit_amount`
- `credit_card_purchases` + `credit_card_installments` — compras parceladas; `dueMonth` = YYYY-MM
- `fixed_bills` — contas recorrentes com parcelamento opcional
- `goals` — metas financeiras
- `budgets` — orçamento por categoria (`month`: YYYY-MM ou "recorrente")
- `investments` + `investment_transactions` — carteira (renda variável, fixa, caixinha)
- `consultant_clients` — vínculo N:M consultor↔cliente (`status`: pending/active/revoked)
- `scheduled_transactions` — parcelas geradas por contas fixas parceladas

**Migrations aplicadas:** 013 (wallet), 014 (credit cards), 015 (transaction status + installments).

---

## Fluxo de trabalho

- Deploy: push em `main` → Vercel builda automaticamente (~20s, Turbopack).
- Build pode falhar por: import em caminho errado, export faltando, arquivo no lugar errado. Sempre conferir caminhos de import.
- Erros de tipo locais (`any` implícito, módulos não encontrados) geralmente NÃO afetam o build do Vercel (`ignoreBuildErrors: true`) — focar nos erros reais reportados pelo Turbopack.
- Ao mexer em lógica financeira, rodar/atualizar os testes em `__tests__/`.

---

## Funcionalidades já implementadas

- Auth: Google OAuth + email/senha + cadastro completo (nome, email, telefone)
- Dashboard com saldo (conta digital / dinheiro físico / total), gráficos, alertas
- Transações unificadas com 3 abas (A Vencer / Atrasadas / Concluídas), parcelamento 1-12x,
  filtro de mês (dropdown flutuante), transferências entre carteiras
- Cartões de crédito com janela de fatura, faturas virtuais em tempo real, pagamento de fatura
- Calendário financeiro
- Contas fixas, metas, orçamento, investimentos (renda variável/fixa/caixinha com IR/IOF)
- Categorias com toggle ícones Lucide / emojis, edição de ícone e cor
- Relatórios, modo consultor (clientes), perfil, PWA, onboarding tour
- Assistente IA (Groq)

---

## Backlog de bugs (31 itens — detalhado em `FinaceBit_Backlog_Testes.md`)

### Já corrigidos

- **[Cartão] Pagar fatura não baixava as parcelas** — `payCCInvoice` usa `.in("id", installmentIds)` com IDs exatos, não mais `.eq("due_month", month)`.
- **[Cartão] #18 — Compra no cartão não aparecia na fatura ativa nem no gráfico por categoria** — `addCCPurchase` calcula `dueMonth` via `getInvoiceMonth(purchaseDate, closingDay)`; fatura, barra de limite e gráfico alinhados ao mesmo critério.
- **[UX] Aba "Cartão" no formulário de transações** — terceira opção de carteira com seleção de cartão, preview de parcelas e submit via `addCCPurchase`.

> **Pendência de dados:** parcelas gravadas antes da correção têm `due_month` calculado sem considerar o dia de fechamento. Falta script SQL de migração para recalcular `due_month` das parcelas não pagas usando `purchase_date + closing_day` do cartão.

### Próximo: Lote A — Validação de inputs (iniciado, não entregue)

Arquivos parcialmente preparados: `lib/validation.ts`, `transactions-list.tsx`, `fixed-bills-list.tsx`.
Resolve: **#10, #13, #14, #15, #17, #24, #25, #26, #27** e parte do **#19**.

- **#15 / #26** — data vazia quebra banco (erro 22007) — validar antes do INSERT
- **#27 / #24** — texto em campo de valor → `NaN` → `null` → erro 23502 — inputs numéricos obrigatórios
- **#10** — conta fixa aceita valor negativo
- **#14** — cartão aceita limite negativo
- **#25** — renda fixa aceita % CDI negativa
- **#17** — campos bloqueiam zero sem dar feedback
- **#13** — descrição sem limite de caracteres (`maxLength` no front + `CHECK` no banco)
- **#19** — permite meta com prazo já vencido (validar data futura)

> Padrão a seguir: todo input de valor bloqueia negativos e texto; todo bloqueio de submit mostra mensagem clara (toast ou erro inline); campos de data validam preenchimento e, quando aplicável, data futura.

### Lotes entregues

- **Lote B** — Overflow de UI (`truncate` + `min-w-0`): **#2, #7, #9, #20, #21, #22** ✓
- **Lote C** — Erro de FK no F5 (**#1**) + limite de cartão (**#16**) + cotação de investimento (**#23**) ✓
- **Lote D** — Idempotência de confirmação (**#12**) + IA (**#6**) + gráfico eixo Y (**#8**) ✓
- **Lote E** — Excluir conta (**#28**) + termos (**#29**) + e-mail (**#30, #31**) ✓
- **Lote F** — Paginação "Mostrar mais" (**#3, #4**) + query de `profiles` movida para `Promise.all` (**#5, #11**) ✓

> **Pendência Lote E:** `SUPABASE_SERVICE_ROLE_KEY` deve ser adicionada às env vars da Vercel para que a exclusão de conta funcione em produção (Settings > Environment Variables).
> **Pendência Lote C (migração 016):** Executar `supabase/migrations/016_consultant_fk.sql` no Supabase SQL Editor para adicionar a FK em `consultant_clients`.
