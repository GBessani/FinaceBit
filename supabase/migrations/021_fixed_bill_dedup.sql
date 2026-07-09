-- 021_fixed_bill_dedup.sql
-- Corrige a proteção contra geração duplicada de conta fixa de cartão.
--
-- A constraint anterior (user_id, notes, purchase_date) usava purchase_date = hoje,
-- então só bloqueava duplicatas no MESMO DIA — não protegia contra gerar duas
-- parcelas para o mesmo mês de fatura em dias diferentes.
--
-- Solução: adiciona uma coluna dedicada `fixed_bill_month` em credit_card_purchases
-- e cria uma UNIQUE parcial sobre (user_id, notes, fixed_bill_month).

-- 1. Remove a constraint antiga (ajuste o nome se você usou outro)
DROP INDEX IF EXISTS uniq_fixed_bill_purchase_month;

-- 2. Coluna que guarda o mês da fatura ao qual essa geração pertence (YYYY-MM-01)
ALTER TABLE public.credit_card_purchases
  ADD COLUMN IF NOT EXISTS fixed_bill_month date;

-- 3. UNIQUE parcial: uma conta fixa (identificada em notes) só pode ter
--    UMA purchase por mês de fatura. Aplica só às geradas automaticamente.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fixed_bill_month
  ON public.credit_card_purchases (user_id, notes, fixed_bill_month)
  WHERE notes LIKE 'fixed_bill:%';
