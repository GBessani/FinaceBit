-- ============================================================
-- FinaceBit — Schema inicial
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- ─── CATEGORIES ────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  icon        text not null,
  color       text not null,
  type        text not null check (type in ('income', 'expense')),
  created_at  timestamptz default now()
);

-- ─── TRANSACTIONS ───────────────────────────────────────────
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  description  text not null,
  amount       numeric(12,2) not null,
  type         text not null check (type in ('income', 'expense')),
  category_id  uuid references public.categories(id) on delete set null,
  date         date not null,
  notes        text,
  created_at   timestamptz default now()
);

-- ─── GOALS ──────────────────────────────────────────────────
create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  target_amount   numeric(12,2) not null,
  current_amount  numeric(12,2) not null default 0,
  deadline        date not null,
  color           text not null,
  created_at      timestamptz default now()
);

-- ─── FIXED BILLS ────────────────────────────────────────────
create table if not exists public.fixed_bills (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  description  text not null,
  amount       numeric(12,2) not null,
  type         text not null check (type in ('income', 'expense')),
  category_id  uuid references public.categories(id) on delete set null,
  due_day      int not null check (due_day between 1 and 31),
  recurrence   text not null check (recurrence in ('monthly', 'weekly', 'biweekly', 'yearly')),
  is_active    boolean not null default true,
  notes        text,
  created_at   timestamptz default now()
);

-- ─── SCHEDULED TRANSACTIONS ─────────────────────────────────
create table if not exists public.scheduled_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  description     text not null,
  amount          numeric(12,2) not null,
  type            text not null check (type in ('income', 'expense')),
  category_id     uuid references public.categories(id) on delete set null,
  scheduled_date  date not null,
  is_completed    boolean not null default false,
  notes           text,
  created_at      timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.categories             enable row level security;
alter table public.transactions           enable row level security;
alter table public.goals                  enable row level security;
alter table public.fixed_bills            enable row level security;
alter table public.scheduled_transactions enable row level security;

-- Policies: usuário só acessa seus próprios dados
create policy "users_own_categories"             on public.categories             for all using (auth.uid() = user_id);
create policy "users_own_transactions"           on public.transactions           for all using (auth.uid() = user_id);
create policy "users_own_goals"                  on public.goals                  for all using (auth.uid() = user_id);
create policy "users_own_fixed_bills"            on public.fixed_bills            for all using (auth.uid() = user_id);
create policy "users_own_scheduled_transactions" on public.scheduled_transactions for all using (auth.uid() = user_id);

-- ─── ÍNDICES ────────────────────────────────────────────────
create index on public.transactions           (user_id, date desc);
create index on public.categories             (user_id);
create index on public.goals                  (user_id);
create index on public.fixed_bills            (user_id);
create index on public.scheduled_transactions (user_id, scheduled_date);

-- ─── FUNÇÃO: seed categorias padrão no primeiro login ───────
create or replace function public.seed_default_categories()
returns trigger language plpgsql security definer as $$
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
$$;

-- Trigger: roda ao criar novo usuário
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.seed_default_categories();
