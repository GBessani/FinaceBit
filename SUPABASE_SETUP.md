# 🚀 Guia de Configuração — Backend Supabase

## O que foi implementado

| Arquivo | O que faz |
|---|---|
| `lib/supabase/client.ts` | Cliente Supabase para o browser |
| `lib/supabase/server.ts` | Cliente Supabase para Server Components / middleware |
| `middleware.ts` | Protege todas as rotas — redireciona para `/login` se não autenticado |
| `app/auth/callback/route.ts` | Rota que o Google redireciona após login |
| `app/login/page.tsx` | Página de login com botão "Continuar com Google" |
| `contexts/finance-context.tsx` | Context reescrito — usa Supabase em vez de localStorage |
| `components/layout/sidebar.tsx` | Sidebar atualizada com avatar do usuário e botão Sair |
| `supabase/migrations/001_initial_schema.sql` | Schema completo do banco com RLS |

---

## Passo 1 — Criar conta e projeto no Supabase

1. Acesse **https://supabase.com** e crie uma conta gratuita
2. Clique em **New project**
3. Escolha um nome (ex: `finacebit`) e uma senha forte para o banco
4. Selecione a região **South America (São Paulo)** para menor latência
5. Aguarde ~2 minutos enquanto o projeto é criado

---

## Passo 2 — Criar as tabelas

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Copie e cole todo o conteúdo do arquivo:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
4. Clique em **Run** (▶)
5. Confirme que aparece `Success. No rows returned`

---

## Passo 3 — Configurar o Google OAuth

### No Google Cloud Console:
1. Acesse **https://console.cloud.google.com**
2. Crie um projeto ou selecione um existente
3. Vá em **APIs & Services > Credentials**
4. Clique em **Create Credentials > OAuth client ID**
5. Tipo: **Web application**
6. Em **Authorized redirect URIs**, adicione:
   ```
   https://SEU_PROJETO.supabase.co/auth/v1/callback
   ```
   *(substitua `SEU_PROJETO` pelo ID do seu projeto Supabase)*
7. Salve e copie o **Client ID** e **Client Secret**

### No Supabase:
1. Vá em **Authentication > Providers**
2. Encontre **Google** e habilite
3. Cole o **Client ID** e **Client Secret** do passo anterior
4. Salve

---

## Passo 4 — Pegar as chaves da API

1. No Supabase, vá em **Settings > API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Passo 5 — Configurar variáveis de ambiente

### Localmente (desenvolvimento):
1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env.local
   ```
2. Preencha com suas chaves:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xyzxyzxyz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### Na Vercel (produção):
1. Acesse seu projeto na Vercel
2. Vá em **Settings > Environment Variables**
3. Adicione as mesmas duas variáveis acima
4. Faça um novo deploy

---

## Passo 6 — Adicionar URL do site no Supabase

1. No Supabase, vá em **Authentication > URL Configuration**
2. Em **Site URL**, coloque a URL do seu app na Vercel:
   ```
   https://seu-app.vercel.app
   ```
3. Em **Redirect URLs**, adicione:
   ```
   https://seu-app.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

---

## Passo 7 — Instalar dependências e rodar

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000** — você será redirecionado para `/login`.

---

## Como funciona agora

```
Usuário acessa qualquer rota
        ↓
   middleware.ts verifica sessão
        ↓
  Não logado → /login
  Logado     → acessa normalmente
        ↓
  Login com Google → Google → /auth/callback → dashboard
        ↓
  Dados carregados do PostgreSQL (Supabase)
  Row Level Security garante isolamento por usuário
```

---

## Plano gratuito do Supabase — o que você tem

| Recurso | Limite gratuito |
|---|---|
| Banco PostgreSQL | 500 MB |
| Auth (usuários) | Ilimitado |
| Requests de API | 500.000 / mês |
| Projetos ativos | 2 |
| Uptime | 24h/dia |

Mais que suficiente para uso pessoal e até alguns usuários simultâneos.
