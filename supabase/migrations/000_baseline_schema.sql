-- ============================================================================
-- FinaceBit — Recriação completa do schema public (DROP + CREATE)
-- ============================================================================
-- Recria as 13 tabelas, RLS policies, índices, function e trigger, fiel ao
-- estado atual do banco. NÃO toca em auth.users — seu login é preservado.
--
-- ⚠️ ANTES DE RODAR:
--   1. Faça um snapshot do banco (Database → Backups). Irreversível.
--   2. Rode o bloco inteiro de uma vez no SQL Editor do Supabase.
--   3. Como auth.users é preservado, seu usuário continua existindo — mas o
--      profile e as categorias dele serão recriados em branco. As categorias
--      padrão só são semeadas no signup (via trigger); para o seu usuário já
--      existente, veja a NOTA no final do arquivo.
--
-- Correção aplicada: a policy consultants_read_client_profiles tinha um bug
-- (comparava consultant_clients.id em vez de profiles.id). Corrigida aqui.
-- ============================================================================

-- ─── 1. DROP das tabelas (ordem reversa de dependência; CASCADE limpa FKs/policies) ───
DROP TABLE IF EXISTS public.credit_card_installments CASCADE;
DROP TABLE IF EXISTS public.credit_card_purchases   CASCADE;
DROP TABLE IF EXISTS public.investment_transactions CASCADE;
DROP TABLE IF EXISTS public.budgets                 CASCADE;
DROP TABLE IF EXISTS public.scheduled_transactions  CASCADE;  -- caso ainda exista
DROP TABLE IF EXISTS public.transactions            CASCADE;
DROP TABLE IF EXISTS public.fixed_bills             CASCADE;
DROP TABLE IF EXISTS public.goals                   CASCADE;
DROP TABLE IF EXISTS public.investments             CASCADE;
DROP TABLE IF EXISTS public.credit_cards            CASCADE;
DROP TABLE IF EXISTS public.consultant_clients      CASCADE;
DROP TABLE IF EXISTS public.categories              CASCADE;
DROP TABLE IF EXISTS public.profiles                CASCADE;

-- ─── 2. CREATE TABLES ───

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  avatar_url text,
  initial_balance numeric DEFAULT 0,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'consultant'::text])),
  name text,
  email text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['income'::text, 'expense'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.consultant_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL,
  client_id uuid,
  client_email text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'rejected'::text, 'revoked'::text])),
  invite_token text,
  created_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  CONSTRAINT consultant_clients_pkey PRIMARY KEY (id),
  CONSTRAINT consultant_clients_consultant_id_fkey FOREIGN KEY (consultant_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT consultant_clients_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['income'::text, 'expense'::text, 'transfer'::text])),
  category_id uuid,
  date date NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  wallet text NOT NULL DEFAULT 'digital'::text CHECK (wallet = ANY (ARRAY['digital'::text, 'cash'::text])),
  status text NOT NULL DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text])),
  installment_number integer,
  total_installments integer,
  installment_group_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric NOT NULL DEFAULT 0,
  deadline date NOT NULL,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.fixed_bills (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['income'::text, 'expense'::text])),
  category_id uuid,
  due_day integer NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  recurrence text NOT NULL CHECK (recurrence = ANY (ARRAY['monthly'::text, 'weekly'::text, 'biweekly'::text, 'yearly'::text])),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  total_installments integer,
  current_installment integer,
  start_date date,
  CONSTRAINT fixed_bills_pkey PRIMARY KEY (id),
  CONSTRAINT fixed_bills_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fixed_bills_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

CREATE TABLE public.investments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  ticker text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type = ANY (ARRAY['crypto'::text, 'stock'::text, 'fund'::text, 'fixed_income'::text, 'savings_box'::text])),
  quantity numeric NOT NULL,
  avg_price numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  invested_at date,
  invested_amount numeric DEFAULT 0,
  rate numeric,
  rate_index text,
  maturity_date date,
  CONSTRAINT investments_pkey PRIMARY KEY (id),
  CONSTRAINT investments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.investment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  investment_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['buy'::text, 'sell'::text])),
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  total numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT investment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT investment_transactions_investment_id_fkey FOREIGN KEY (investment_id) REFERENCES public.investments(id) ON DELETE CASCADE
);

CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  amount numeric NOT NULL,
  month text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE
);

CREATE TABLE public.credit_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  limit_amount numeric NOT NULL DEFAULT 0,
  due_day integer NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  closing_day integer NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  color text NOT NULL DEFAULT '#6366f1'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_cards_pkey PRIMARY KEY (id),
  CONSTRAINT credit_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.credit_card_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credit_card_id uuid NOT NULL,
  description text NOT NULL,
  total_amount numeric NOT NULL,
  installments integer NOT NULL DEFAULT 1,
  category_id uuid,
  purchase_date date NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_card_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT credit_card_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT credit_card_purchases_credit_card_id_fkey FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  CONSTRAINT credit_card_purchases_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

CREATE TABLE public.credit_card_installments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  user_id uuid NOT NULL,
  credit_card_id uuid NOT NULL,
  installment_num integer NOT NULL,
  due_month text NOT NULL,
  amount numeric NOT NULL,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamp with time zone,
  transaction_id uuid,
  CONSTRAINT credit_card_installments_pkey PRIMARY KEY (id),
  CONSTRAINT credit_card_installments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT credit_card_installments_credit_card_id_fkey FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  CONSTRAINT credit_card_installments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE SET NULL,
  CONSTRAINT credit_card_installments_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.credit_card_purchases(id) ON DELETE CASCADE
);

-- ─── 3. ÍNDICES (fiéis ao banco atual) ───
CREATE UNIQUE INDEX budgets_user_id_category_id_month_key ON public.budgets USING btree (user_id, category_id, month);
CREATE INDEX categories_user_id_idx ON public.categories USING btree (user_id);
CREATE INDEX idx_cc_client ON public.consultant_clients USING btree (client_id);
CREATE INDEX idx_cc_consultant ON public.consultant_clients USING btree (consultant_id);
CREATE UNIQUE INDEX consultant_clients_invite_token_key ON public.consultant_clients USING btree (invite_token);
CREATE INDEX idx_cc_installments_card_month ON public.credit_card_installments USING btree (credit_card_id, due_month, is_paid);
CREATE INDEX credit_card_installments_user_id_credit_card_id_due_month_idx ON public.credit_card_installments USING btree (user_id, credit_card_id, due_month);
CREATE INDEX credit_card_installments_purchase_id_idx ON public.credit_card_installments USING btree (purchase_id);
CREATE INDEX idx_cc_purchases_card ON public.credit_card_purchases USING btree (credit_card_id);
CREATE INDEX credit_card_purchases_user_id_credit_card_id_idx ON public.credit_card_purchases USING btree (user_id, credit_card_id);
CREATE INDEX credit_cards_user_id_idx ON public.credit_cards USING btree (user_id);
CREATE INDEX idx_fixed_bills_active ON public.fixed_bills USING btree (user_id, is_active);
CREATE INDEX fixed_bills_user_id_idx ON public.fixed_bills USING btree (user_id);
CREATE INDEX goals_user_id_idx ON public.goals USING btree (user_id);
CREATE INDEX investment_transactions_user_id_idx ON public.investment_transactions USING btree (user_id);
CREATE INDEX investment_transactions_investment_id_idx ON public.investment_transactions USING btree (investment_id);
CREATE INDEX investments_user_id_idx ON public.investments USING btree (user_id);
CREATE INDEX idx_transactions_status ON public.transactions USING btree (user_id, status);
CREATE INDEX idx_transactions_user_date ON public.transactions USING btree (user_id, date DESC);
CREATE UNIQUE INDEX uq_installment_group ON public.transactions USING btree (installment_group_id, installment_number);

-- ─── 4. HABILITAR RLS em todas as tabelas ───
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultant_clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_bills             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_purchases   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_installments ENABLE ROW LEVEL SECURITY;

-- ─── 5. RLS POLICIES ───

-- profiles
CREATE POLICY users_own_profile ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY users_read_own_profile ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own_profile ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY users_insert_own_profile ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- (corrigida: comparava consultant_clients.id; o correto é profiles.id)
CREATE POLICY consultants_read_client_profiles ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = profiles.id
            AND consultant_clients.status = 'active'::text)
);

-- categories
CREATE POLICY users_own_categories ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY consultants_access_client_categories ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = categories.user_id
            AND consultant_clients.status = 'active'::text)
);

-- consultant_clients
CREATE POLICY clients_see_own_relations ON public.consultant_clients FOR SELECT USING (client_id = auth.uid());
CREATE POLICY clients_update_own_relations ON public.consultant_clients FOR UPDATE USING (client_id = auth.uid());
CREATE POLICY consultants_manage_own_clients ON public.consultant_clients FOR ALL USING (consultant_id = auth.uid());

-- transactions
CREATE POLICY users_own_transactions ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY consultants_read_client_transactions ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = transactions.user_id
            AND consultant_clients.status = 'active'::text)
);
CREATE POLICY consultants_write_client_transactions ON public.transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = transactions.user_id
            AND consultant_clients.status = 'active'::text)
);

-- goals
CREATE POLICY users_own_goals ON public.goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY consultants_access_client_goals ON public.goals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = goals.user_id
            AND consultant_clients.status = 'active'::text)
);

-- fixed_bills
CREATE POLICY users_own_fixed_bills ON public.fixed_bills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY consultants_access_client_fixed_bills ON public.fixed_bills FOR ALL USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = fixed_bills.user_id
            AND consultant_clients.status = 'active'::text)
);

-- investments
CREATE POLICY users_own_investments ON public.investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY consultants_access_client_investments ON public.investments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = investments.user_id
            AND consultant_clients.status = 'active'::text)
);

-- investment_transactions
CREATE POLICY users_own_investment_transactions ON public.investment_transactions FOR ALL USING (auth.uid() = user_id);

-- budgets
CREATE POLICY users_own_budgets ON public.budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY consultants_access_client_budgets ON public.budgets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = budgets.user_id
            AND consultant_clients.status = 'active'::text)
);

-- credit_cards
CREATE POLICY users_own_credit_cards ON public.credit_cards FOR ALL USING (auth.uid() = user_id);

-- credit_card_purchases
CREATE POLICY users_own_cc_purchases ON public.credit_card_purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY consultants_access_cc_purchases ON public.credit_card_purchases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = credit_card_purchases.user_id
            AND consultant_clients.status = 'active'::text)
);

-- credit_card_installments
CREATE POLICY users_own_cc_installments ON public.credit_card_installments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY consultants_access_cc_installments ON public.credit_card_installments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.consultant_clients
          WHERE consultant_clients.consultant_id = auth.uid()
            AND consultant_clients.client_id = credit_card_installments.user_id
            AND consultant_clients.status = 'active'::text)
);

-- ─── 6. FUNCTION + TRIGGER (semeia categorias padrão no signup) ───
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  insert into public.categories (user_id, name, icon, color, type) values
    (new.id, 'Salário',        'Briefcase',    '#10b981', 'income'),
    (new.id, 'Freelance',      'Laptop',       '#06b6d4', 'income'),
    (new.id, 'Investimentos',  'TrendingUp',   '#8b5cf6', 'income'),
    (new.id, 'Outros',         'Plus',         '#6b7280', 'income'),
    (new.id, 'Alimentação',    'Utensils',     '#f97316', 'expense'),
    (new.id, 'Transporte',     'Car',          '#3b82f6', 'expense'),
    (new.id, 'Moradia',        'Home',         '#ec4899', 'expense'),
    (new.id, 'Saúde',          'Heart',        '#ef4444', 'expense'),
    (new.id, 'Educação',       'GraduationCap','#14b8a6', 'expense'),
    (new.id, 'Lazer',          'Gamepad2',     '#a855f7', 'expense'),
    (new.id, 'Compras',        'ShoppingBag',  '#f59e0b', 'expense'),
    (new.id, 'Contas',         'FileText',     '#64748b', 'expense');
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_categories();

-- ============================================================================
-- NOTA — seu usuário já existente:
-- O trigger só semeia categorias para signups NOVOS. Como seu usuário em
-- auth.users foi preservado, ele ficará sem profile e sem categorias após o
-- DROP. Para recriar AS DUAS coisas para o seu usuário atual, rode o bloco
-- abaixo UMA vez (descomente). Ele cria o profile e dispara as categorias
-- padrão manualmente para todos os usuários que ainda não as têm.
-- ============================================================================
-- INSERT INTO public.profiles (id, email, name)
-- SELECT id, email, COALESCE(raw_user_meta_data->>'name', email)
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
--
-- DO $seed$
-- DECLARE u RECORD;
-- BEGIN
--   FOR u IN SELECT id FROM auth.users LOOP
--     IF NOT EXISTS (SELECT 1 FROM public.categories WHERE user_id = u.id) THEN
--       INSERT INTO public.categories (user_id, name, icon, color, type) VALUES
--         (u.id, 'Salário','Briefcase','#10b981','income'),
--         (u.id, 'Freelance','Laptop','#06b6d4','income'),
--         (u.id, 'Investimentos','TrendingUp','#8b5cf6','income'),
--         (u.id, 'Outros','Plus','#6b7280','income'),
--         (u.id, 'Alimentação','Utensils','#f97316','expense'),
--         (u.id, 'Transporte','Car','#3b82f6','expense'),
--         (u.id, 'Moradia','Home','#ec4899','expense'),
--         (u.id, 'Saúde','Heart','#ef4444','expense'),
--         (u.id, 'Educação','GraduationCap','#14b8a6','expense'),
--         (u.id, 'Lazer','Gamepad2','#a855f7','expense'),
--         (u.id, 'Compras','ShoppingBag','#f59e0b','expense'),
--         (u.id, 'Contas','FileText','#64748b','expense');
--     END IF;
--   END LOOP;
-- END $seed$;
