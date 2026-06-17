-- 017_drop_scheduled_transactions.sql
-- Remove a tabela scheduled_transactions (código morto).
--
-- Justificativa:
--   * Nenhum SELECT em todo o app — a tabela é escrita mas nunca lida.
--   * O único INSERT (em addFixedBill) está num ramo que a UI nunca dispara:
--     o formulário de conta fixa não envia total_installments/start_date.
--   * Nenhuma outra tabela possui FK apontando para scheduled_transactions,
--     então o DROP não cascateia para dados em uso.
--
-- As FKs que SAEM de scheduled_transactions (para users, categories,
-- fixed_bills, credit_cards) são removidas junto com a tabela; isso não
-- afeta as tabelas referenciadas.
--
-- ⚠️ Antes de rodar em produção: faça um backup/snapshot do banco no painel
--    do Supabase. O DROP é irreversível.

-- Verificação de segurança: aborta se houver linhas com is_completed = true,
-- o que indicaria que a tabela esteve em uso real em algum momento.
DO $$
DECLARE
  completed_count integer;
BEGIN
  SELECT COUNT(*) INTO completed_count
  FROM public.scheduled_transactions
  WHERE is_completed = true;

  IF completed_count > 0 THEN
    RAISE EXCEPTION
      'Abortado: % linha(s) com is_completed=true encontradas. Revise antes de dropar.',
      completed_count;
  END IF;
END $$;

DROP TABLE IF EXISTS public.scheduled_transactions;
