# Relatório de Auditoria Técnica — Cremoso Burguer
**Data:** 07 de julho de 2026

---

## AMBIENTE — Variáveis de Ambiente

| Variável | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Presente |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Presente |
| `SUPABASE_SERVICE_ROLE_KEY` | Presente |
| `SESSION_SECRET` | Presente |
| `ADMIN_USERNAME` | Presente — 5 chars, inicial maiúscula |
| `ADMIN_PASSWORD` | Presente |
| `ENTREGADOR_USERNAME` | Presente |
| `ENTREGADOR_PASSWORD` | Presente |

---

## PROBLEMA 1 — CARDÁPIO NÃO APARECE

### Causa raiz confirmada por teste real

```
GET /api/admin/categories → {"error":"Não autorizado"}   ← 401
GET /api/admin/products   → {"error":"Não autorizado"}   ← 401
GET /api/menu             → {"ok":true,"categories":[...],"products":[...]}  ← 200 ✅
```

### Cadeia completa do bug

```
components/menu.tsx
  └── loadProducts() + loadCategories()   [useStore()]
        └── lib/api.ts
              ├── fetchProducts()  → GET /api/admin/products  ← PROTEGIDO pelo middleware
              └── fetchCategories()→ GET /api/admin/categories ← PROTEGIDO pelo middleware
                    └── middleware.ts retorna 401 (sem cookie de sessão)
                          └── lib/api.ts retorna []
                                └── store.products = []
                                      └── menu renderiza vazio
```

A rota pública `/api/menu` existe, retorna todos os dados corretamente, mas nunca é chamada pelo frontend. O `lib/api.ts` usa as rotas `/api/admin/*` para tudo — inclusive para o cardápio público, que o visitante anônimo não pode acessar.

**Arquivo com problema:** `lib/api.ts` — `fetchProducts()` (linha 52) e `fetchCategories()` (linha 14)

---

## PROBLEMA 2 — LOGIN NÃO FUNCIONA

### Status de cada camada

| Camada | Resultado |
|---|---|
| `POST /api/auth/login` (credenciais corretas) | 200 OK |
| Cookie `Set-Cookie` recebido | Presente e correto |
| Cookie URL-encoding (`:` → `%3A`) | Next.js serializa e decodifica automaticamente |
| Middleware com cookie URL-encoded | HTTP 200 — funciona corretamente |
| `GET /api/auth/me` com cookie | Retorna usuário corretamente |

O mecanismo de cookie e o middleware funcionam corretamente. O problema real é outro:

### Causa raiz

O `ADMIN_USERNAME` tem **5 caracteres com inicial maiúscula** — valor `"Admin"`. O `app/api/auth/login/route.ts` faz comparação exata:

```typescript
if (role === 'admin' && username === adminUser && password === adminPass)
//                      ^^^^^^^^^^^^^^^^^^^^^^^^
//                      "admin" (digitado) !== "Admin" (env var) → 401
```

Qualquer usuário que digitar `admin` (minúsculo) recebe "Usuário ou senha incorretos" mesmo com a senha correta.

**Arquivo com problema:** `app/api/auth/login/route.ts` — linhas 40–50

---

## TODOS OS PROBLEMAS ENCONTRADOS

| # | Problema | Arquivo | Prioridade |
|---|---|---|---|
| 1 | `fetchCategories()` e `fetchProducts()` chamam rotas admin protegidas — cardápio público sempre retorna vazio | `lib/api.ts` linhas 14–22, 51–64 | P0 — CRÍTICO |
| 2 | Comparação case-sensitive do username no login — `"admin" !== "Admin"` | `app/api/auth/login/route.ts` linhas 40–50 | P0 — CRÍTICO |
| 3 | `supabase/schema.sql` documenta colunas em inglês mas o banco real usa português | `supabase/schema.sql` | P2 — Médio |
| 4 | `lib/api.ts` tem diretiva `'use client'` mas é usado como módulo compartilhado | `lib/api.ts` linha 1 | P2 — Médio |
| 5 | Middleware deprecation warning no Next.js 16 (`middleware` → `proxy`) | `middleware.ts` | P3 — Baixo |
| 6 | `sameSite: 'strict'` pode causar problemas em redirecionamentos cross-origin | `app/api/auth/login/route.ts` linha 64 | P3 — Baixo |

---

## DIAGNÓSTICO POR SISTEMA

| Sistema | Status | Detalhe |
|---|---|---|
| Variáveis de ambiente | OK | Todas presentes |
| Conexão Supabase | OK | `/api/menu` retorna dados reais |
| Tabelas `produtos`, `categorias` | OK | 10 produtos, 4 categorias no banco |
| RLS Supabase | OK | Dados acessíveis via service role |
| Storage Supabase | OK | Bucket `produtos` configurado |
| `middleware.ts` | OK | Protege `/api/admin/*` e `/equipe/admin/*`, HMAC verificado |
| Cookie HMAC (login → middleware) | OK | URL-encoding transparente; HTTP 200 confirmado |
| `SessionProvider` | OK | Chama `/api/auth/me`, hidrata Zustand |
| `lib/store.ts` | OK | `login()` async, `logout()` async, sem persist do `user` |
| `app/layout.tsx` | OK | `SessionProvider` envolvendo toda a aplicação |
| `app/api/auth/me` | OK | Valida cookie, retorna usuário |
| `app/equipe/page.tsx` | OK | `handleSubmit` async, sem bloco de demo |
| Zustand | OK | Store sem `persist` para `user`, `setUser` disponível |
| Importações | OK | Build compila sem erros de tipo |
| Runtime errors | OK | Nenhum no startup |

---

## ORDEM RECOMENDADA DE CORREÇÃO

### 1. [P0] `app/api/auth/login/route.ts`
Normalizar username para minúsculo antes de comparar:
```typescript
// Antes
username === adminUser

// Depois
username.toLowerCase() === adminUser?.toLowerCase()
```

### 2. [P0] `lib/api.ts`
`fetchCategories()` e `fetchProducts()` devem usar `/api/menu` (rota pública) em vez de `/api/admin/categories` e `/api/admin/products`:
```typescript
// fetchCategories() e fetchProducts() devem chamar /api/menu
// que já existe, já retorna os dois recursos, e é pública (sem auth)
```

### 3. [P2] `supabase/schema.sql`
Atualizar para refletir os nomes de colunas reais em português:
- `nome`, `descricao`, `preco`, `imagem`, `ativo`, `categoria_id`

### 4. [P3] `middleware.ts`
Planejar migração para `proxy` quando Next.js 16 exigir.

---

## RESUMO EXECUTIVO

O app está operacional e conectado ao banco. Dois bugs pontuais bloqueiam os fluxos principais — ambos corrigíveis em menos de 10 linhas de código cada.

- **Cardápio:** o frontend chama rotas admin protegidas para exibir o menu público → solução: usar `/api/menu` já existente.
- **Login:** comparação de username é case-sensitive e o valor da variável de ambiente usa inicial maiúscula → solução: comparação `.toLowerCase()`.
