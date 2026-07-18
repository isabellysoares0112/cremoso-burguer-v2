-- ============================================================================
-- CREMOSO BURGUER — SCHEMA COMPLETO DO BANCO DE DADOS
-- ============================================================================
-- Rode este arquivo INTEIRO, de uma vez, no SQL Editor de um projeto Supabase
-- NOVO (Dashboard -> SQL Editor -> New query -> cole tudo -> Run).
--
-- Esse e o unico arquivo que define a estrutura do banco. Ele reflete
-- exatamente os nomes de tabela/coluna usados pelo codigo da aplicacao
-- (conferido rota por rota, nao copiado de versoes antigas).
--
-- Seguranca: TODAS as tabelas tem RLS (Row Level Security) ligado e SEM
-- nenhuma politica para os papeis "anon"/"authenticated". Isso e
-- intencional -- o navegador do cliente nunca fala direto com o banco;
-- toda leitura e escrita passa pelas rotas /api/* do servidor, que usam a
-- chave SUPABASE_SERVICE_ROLE_KEY (que ignora RLS). Com RLS ligado e sem
-- politicas, a chave publica (anon) nao consegue ler nem escrever nada.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- CATEGORIAS
-- ============================================================================
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);
alter table categorias enable row level security;

-- ============================================================================
-- PRODUTOS
-- ============================================================================
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  preco numeric(10,2) not null default 0 check (preco >= 0),
  imagem text,
  categoria_id uuid references categorias(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists produtos_categoria_id_idx on produtos(categoria_id);
create index if not exists produtos_ativo_idx on produtos(ativo);
alter table produtos enable row level security;

-- ============================================================================
-- ADICIONAIS (agrupados por categoria de produto, ex: "burgers", "bebidas")
-- ============================================================================
create table if not exists adicionais_categoria (
  id uuid primary key default gen_random_uuid(),
  categoria_slug text not null,
  nome text not null,
  preco numeric(10,2) not null default 0 check (preco >= 0),
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists adicionais_categoria_slug_idx on adicionais_categoria(categoria_slug);
alter table adicionais_categoria enable row level security;

-- ============================================================================
-- BAIRROS (taxa de entrega por bairro)
-- ============================================================================
create table if not exists bairros (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  created_at timestamptz not null default now()
);
alter table bairros enable row level security;

-- ============================================================================
-- CUPONS (a tabela se chama "coupons" no banco -- o codigo ja usa esse nome)
-- ============================================================================
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value >= 0),
  expires_at date,
  usage_limit int,
  usage_count int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists coupons_code_idx on coupons(code);
alter table coupons enable row level security;

-- ============================================================================
-- CLIENTES (CRM)
-- ============================================================================
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  created_at timestamptz not null default now()
);
create index if not exists clientes_telefone_idx on clientes(telefone);
alter table clientes enable row level security;

-- ============================================================================
-- PEDIDOS
-- ============================================================================
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  numero_pedido int not null unique,
  cliente_nome text not null,
  telefone text not null,
  endereco text not null,
  bairro text not null,
  forma_pagamento text not null check (forma_pagamento in ('pix', 'cartao', 'dinheiro', 'link')),
  observacoes text,
  status text not null default 'novo' check (status in ('novo', 'preparando', 'pronto', 'entregue', 'cancelado')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);
create index if not exists pedidos_telefone_idx on pedidos(telefone);
create index if not exists pedidos_status_idx on pedidos(status);
create index if not exists pedidos_created_at_idx on pedidos(created_at desc);
alter table pedidos enable row level security;

-- Sequencia atomica do numero do pedido -- dois pedidos simultaneos nunca
-- recebem o mesmo numero, mesmo sob concorrencia real.
create sequence if not exists pedidos_numero_seq start 1;

create or replace function next_pedido_number()
returns int
language sql
security definer
set search_path = public
as $$
  select nextval('pedidos_numero_seq')::int;
$$;

-- So o backend (service_role, dentro da rota /api/orders) pode chamar essa
-- funcao. O navegador nao cria pedidos diretamente.
revoke execute on function next_pedido_number() from public, anon, authenticated;
grant execute on function next_pedido_number() to service_role;

-- ============================================================================
-- LOGIN_ATTEMPTS (limite de tentativas de login -- protecao contra forca bruta)
-- ============================================================================
create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  tentativas int not null default 1,
  ultima_tentativa timestamptz not null default now(),
  bloqueado_ate timestamptz,
  created_at timestamptz not null default now()
);
alter table login_attempts enable row level security;

-- ============================================================================
-- CONFIGURACOES (uma unica linha com os dados da loja)
-- ============================================================================
create table if not exists configuracoes (
  id uuid primary key default gen_random_uuid(),
  nome_loja text not null default 'Cremoso Burguer',
  telefone text default '',
  whatsapp text default '',
  instagram text default '',
  horario_funcionamento text default '',
  dias_semana text default '["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"]',
  taxa_padrao numeric(10,2) not null default 5 check (taxa_padrao >= 0),
  status_mode text not null default 'automatic' check (status_mode in ('automatic', 'force_open', 'force_closed')),
  created_at timestamptz not null default now()
);
alter table configuracoes enable row level security;

-- Garante que sempre existe pelo menos uma linha de configuracao
-- (o app sempre le "a primeira", entao criamos uma linha inicial).
insert into configuracoes (nome_loja)
select 'Cremoso Burguer'
where not exists (select 1 from configuracoes);

-- ============================================================================
-- STORAGE -- bucket publico para imagens de produtos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

-- ============================================================================
-- FIM. Depois de rodar este script:
-- 1) Cadastre suas categorias/produtos/bairros pelo painel admin (/equipe),
--    ou use a rota de seed (POST /api/setup) se quiser dados de exemplo.
-- 2) Configure as variaveis de ambiente (veja .env.example) apontando pra
--    esse projeto Supabase.
-- ============================================================================
