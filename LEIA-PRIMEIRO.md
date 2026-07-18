# Cremoso Burguer — LEIA ISTO PRIMEIRO

Este pacote é o projeto corrigido, pronto pra virar um repositório e um banco novos, do zero.

---

## 🚨 Passo 0 — Ação urgente (faça ANTES de tudo, independente do resto)

O projeto antigo (o zip que você me mandou) tinha a **service role key do Supabase** e as
**senhas de admin/entregador** gravadas em texto puro no arquivo `.replit`. Isso significa que
esse projeto Supabase antigo deve ser tratado como comprometido, mesmo que você não vá mais usá-lo.

Faça isso agora, antes de configurar o projeto novo:
1. Entre no [Supabase Dashboard](https://supabase.com/dashboard) do projeto **antigo**.
2. Se não for mais usar esse projeto: **Settings → General → Delete project**. Resolve tudo de uma vez.
3. Se ainda precisar dele por qualquer motivo: **Settings → API → JWT Settings → Rotate JWT secret**
   (isso invalida a anon key E a service role key antigas ao mesmo tempo — não tem como trocar só
   uma). Isso derruba o site antigo até você atualizar as chaves novas nas variáveis de ambiente dele.
4. Troque a senha de admin e de entregador em qualquer lugar que ainda use `Admincremoso0112` /
   `Entregadorcremoso0112` (essas senhas também vazaram e não devem ser reaproveitadas em lugar nenhum).

---

## Passo 1 — Criar o projeto Supabase novo

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Depois de criado: **SQL Editor → New query**, cole o conteúdo INTEIRO de
   `supabase/schema.sql` (está na raiz deste projeto) e clique **Run**. Isso cria todas as
   tabelas, índices, a função de numeração de pedido, a política de segurança e o bucket de
   imagens — tudo de uma vez, um projeto limpo já sai pronto.
3. Em **Settings → API**, copie:
   - `Project URL` → vai virar `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → vai virar `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → vai virar `SUPABASE_SERVICE_ROLE_KEY` (**nunca** cole isso em nenhum
     arquivo do projeto — só nas variáveis de ambiente da Vercel/Replit, explicado no Passo 3)

## Passo 2 — Criar o repositório novo no GitHub

1. Crie um repositório novo, vazio, no GitHub (não inicialize com README).
2. Suba o conteúdo desta pasta para ele. Duas formas:
   - **Pelo terminal:** dentro desta pasta, `git init`, `git add .`, `git commit -m "Início limpo"`,
     depois `git remote add origin <url-do-repo-novo>` e `git push -u origin main`.
   - **Pela interface do Replit:** crie um novo Repl a partir deste código e conecte ao GitHub
     pela aba de Version Control — ele já cria o repositório vazio pra você.
3. Confirme que **nenhum arquivo `.env` foi commitado** (o `.gitignore` já protege isso, mas vale
   olhar uma vez).

## Passo 3 — Variáveis de ambiente

Use `.env.example` (nesta pasta) como checklist. Preencha com valores reais em **dois lugares**:

- **Vercel:** Project Settings → Environment Variables (isso é o que roda em produção)
- **Replit:** ícone de cadeado (🔒) na barra lateral → Secrets (isso é o que roda no preview/dev)

Nunca em `.replit`, nunca em `.env` commitado — sempre nesses dois painéis.

Gere o `SESSION_SECRET` com, por exemplo: `openssl rand -hex 32` (ou peça pra qualquer ferramenta
gerar uma string aleatória de 64 caracteres).

## Passo 4 — Conectar a Vercel no repositório novo

1. [vercel.com/new](https://vercel.com/new) → importe o repositório novo.
2. Framework: Next.js (detecta sozinho). Não precisa mexer em build command — o `package.json`
   já usa pnpm automaticamente porque tem `pnpm-lock.yaml`.
3. Cole as variáveis de ambiente do Passo 3 antes do primeiro deploy.
4. Depois do primeiro deploy, configure o webhook do Mercado Pago apontando para
   `https://SEU-DOMINIO/api/webhook/mercadopago` (painel do Mercado Pago → Suas integrações →
   Webhooks).

## Passo 5 — Popular o cardápio

Com o site no ar, entre em `/equipe` com o `ADMIN_USERNAME`/`ADMIN_PASSWORD` que você configurou,
e cadastre categorias, produtos, bairros (com taxa de entrega) e as configurações da loja pelo
próprio painel administrativo.

---

# O que foi corrigido nesta rodada

## 🔴 Segurança e dinheiro
- **Webhook do Mercado Pago agora confere o valor pago contra o valor do pedido** antes de marcar
  como pago — fecha o golpe de "pagar centavos por um pedido caro". (`app/api/webhook/mercadopago/route.ts`)
- **Botão "Já paguei" agora verifica de verdade** o status do pagamento na API, em vez de confirmar
  sempre depois de 1,5s. (`components/pix-payment.tsx`)
- **Criação de pedido movida pro servidor** (`app/api/orders/route.ts`, novo): o navegador não
  manda mais o total — o servidor recalcula subtotal, taxa de entrega e desconto de cupom a partir
  do banco de dados. `lib/api.ts` foi atualizado para chamar essa rota nova.
- **RLS travada:** com a criação de pedido no servidor, o banco novo não dá nenhuma permissão de
  leitura/escrita para a chave pública (anon) em nenhuma tabela — tudo passa pelas rotas de API
  com a service role key.
- **`/api/track` agora exige número do pedido + telefone juntos**, sempre — antes, o número sozinho
  já devolvia nome/telefone/endereço de qualquer cliente. (`app/api/track/route.ts`,
  `app/acompanhar/page.tsx`)
- **Página de acompanhamento de pedido não usa mais realtime direto no banco** (que exigiria leitura
  pública na tabela de pedidos) — agora consulta a mesma rota protegida por telefone a cada 12s.
- **Entregador não acessa mais rotas/páginas de admin.** O `proxy.ts` (antes `middleware.ts`) agora
  confere o papel (role) salvo no cookie assinado, não só se a sessão é válida.
- **Login com limite de tentativas** (8 tentativas / 15 min, tabela `login_attempts` nova) e
  comparação de senha em tempo constante, pra dificultar força bruta.
- **Chave de idempotência do PIX corrigida** — antes incluía a hora exata, então nunca era realmente
  idempotente e podia gerar cobranças duplicadas pro mesmo pedido.
- **Segredos removidos do `.replit`** e do fluxo do projeto (veja Passo 0). `.env.example` criado
  documentando as 9 variáveis necessárias.

## 🟠 Banco de dados
- **`supabase/schema.sql` reescrito do zero**, batendo exatamente com os nomes de coluna que o
  código usa de verdade (antes estava em inglês, incompatível). Inclui as tabelas que faltavam
  por completo (`bairros`, `coupons`) e a nova `login_attempts`. Índices adicionados em
  `pedidos.telefone`, `pedidos.status`, `pedidos.created_at`, `produtos.categoria_id`, etc.
- **Migrations antigas (001/002) e a rota `/api/admin/adicionais/migrate`** foram incorporadas ao
  schema novo e removidas — agora existe um único arquivo fonte da verdade.

## 🟡 Bugs e limpeza
- **Next.js 16:** `middleware.ts` renomeado para `proxy.ts` (convenção nova da versão instalada;
  o nome antigo está depreciado e parou de aparecer na lista de rotas geradas pelo build).
- **`typescript.ignoreBuildErrors` desligado** — estava escondendo erros de tipo reais. Todos os
  erros encontrados foram corrigidos (não silenciados): tipo `Date` vs `string` em
  `dashboard-panel.tsx`, chave `cancelado` faltando nos mapas de status de `kitchen-view.tsx`.
- **`components/admin/kitchen-panel.tsx` removido** — não era usado em lugar nenhum (a página real
  de cozinha usa `kitchen-view.tsx`) e quebrava de verdade se renderizasse um pedido cancelado.
- **`lib/products.ts` e `lib/supabase.ts` removidos** — código morto, nunca importado, com nomes de
  coluna errados (sobra de uma versão antiga).
- **Relatórios não contam mais pedidos cancelados como faturamento** — antes inflava receita,
  ticket médio e "produto mais vendido". Adicionado card de cancelamentos no painel.
- **`cn()` (utilitária de classes CSS) corrigida** — o componente de gráfico (`components/ui/chart.tsx`)
  chamava ela no estilo clsx (com objeto), que a versão antiga não suportava e virava a string
  literal `"[object Object]"` dentro do className. Reescrita pra suportar strings, arrays e objetos.
- **`loading.tsx`, `error.tsx`, `not-found.tsx` e `global-error.tsx` adicionados** ao App Router —
  antes, qualquer erro não tratado caía na tela genérica do Next.js.
- **`.replit` estava rodando `npm run dev`**, indo contra a migração pra pnpm já feita no projeto —
  corrigido para `pnpm run dev`.
- Artefatos de debug/backup removidos da raiz do repositório: `tsconfig.tsbuildinfo`,
  `novos_arquivos_repo.tar.gz` (continha um painel de PDV nunca integrado — avise se quiser
  retomar essa feature depois), capturas de tela em `attached_assets/`, metadados internos do
  Replit em `.agents/`.

---

# O que ainda NÃO foi feito (avise se quiser priorizar)

- **Estoque** (`/equipe/admin/estoque`) continua só no `localStorage` do navegador — some se trocar
  de aparelho ou limpar o cache. A função de baixa automática de estoque (`deductStockForOrder`)
  existe no código mas nunca é chamada — a dedução ao fechar um pedido não está ligada ainda.
- **Caixa** (`/equipe/admin/caixa`) também é só `localStorage`.
- **Painel "Usuários"** é decorativo — o sistema só suporta 1 login de admin e 1 de entregador,
  via variável de ambiente. Sem gestão de múltiplas contas.
- **PDV / atendimento de balcão** não existe no app hoje (só pedido via site/WhatsApp). Havia uma
  versão pronta mas nunca integrada, que removi do repositório junto com o resto do backup solto —
  posso reconstruir se você quiser atendimento presencial além do delivery.
- **Webhook do Mercado Pago** não valida a assinatura (`x-signature`) da notificação — mitigado
  porque sempre rebusca o pagamento direto na API oficial antes de confiar em qualquer coisa, mas
  a validação de assinatura é uma camada extra que ainda pode ser adicionada.
