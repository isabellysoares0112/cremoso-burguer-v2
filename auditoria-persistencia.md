# Auditoria de Persistência — Cremoso Burguer Admin

Data: 18/06/2026

---

## Pedidos

| Item | Detalhe |
|---|---|
| **Armazenamento** | Supabase — tabela `pedidos` |
| **Usa Supabase** | Sim — via rotas `/api/admin/orders` |
| **Usa localStorage** | Não |
| **Sobrevive ao F5** | Sim |
| **Sobrevive à troca de dispositivo** | Sim |
| **Risco de perda** | Nenhum — banco centralizado |

---

## Caixa

| Item | Detalhe |
|---|---|
| **Armazenamento** | localStorage — chave `cremoso-caixa-v1` |
| **Usa Supabase** | Parcial — apenas para buscar pedidos no histórico/relatório |
| **Usa localStorage** | Sim — abertura, fechamento, sangrias, suprimentos |
| **Sobrevive ao F5** | Sim (mesmo navegador) |
| **Sobrevive à troca de dispositivo** | Não |
| **Risco de perda** | ALTO — limpeza de cache, troca de máquina ou navegador apaga todo o histórico de movimentos |

---

## Estoque

| Item | Detalhe |
|---|---|
| **Armazenamento** | localStorage — chaves `cremoso-insumos-v1`, `cremoso-estoque-mov-v1`, `cremoso-fornecedores-v1`, `cremoso-receitas-v1` |
| **Usa Supabase** | Não |
| **Usa localStorage** | Sim — exclusivamente |
| **Sobrevive ao F5** | Sim (mesmo navegador) |
| **Sobrevive à troca de dispositivo** | Não |
| **Risco de perda** | ALTO — todo o histórico de movimentações, insumos, fornecedores e receitas é perdido ao trocar de dispositivo ou limpar o cache |

---

## CRM

| Item | Detalhe |
|---|---|
| **Armazenamento** | Supabase — tabelas `pedidos` e `clientes` |
| **Usa Supabase** | Sim — perfis calculados em tempo real a partir dos pedidos |
| **Usa localStorage** | Não |
| **Sobrevive ao F5** | Sim |
| **Sobrevive à troca de dispositivo** | Sim |
| **Risco de perda** | Baixo — insert na tabela `clientes` é best-effort (falha silenciosa se bloqueado por RLS); dados de LTV e segmentação dependem do histórico de `pedidos` |

---

## Cupons

| Item | Detalhe |
|---|---|
| **Armazenamento** | Supabase — tabela `cupons` |
| **Usa Supabase** | Sim — via rotas `/api/admin/cupons` |
| **Usa localStorage** | Não |
| **Sobrevive ao F5** | Sim |
| **Sobrevive à troca de dispositivo** | Sim |
| **Risco de perda** | Baixo — se a tabela `cupons` não existir no banco, o painel exibe prompt de setup mas não cria automaticamente |

---

## Configurações

| Item | Detalhe |
|---|---|
| **Armazenamento** | Supabase — tabelas `configuracoes` e `bairros` |
| **Usa Supabase** | Sim — via rota `/api/admin/settings` |
| **Usa localStorage** | Não — explicitamente excluído da persistência do Zustand |
| **Sobrevive ao F5** | Sim |
| **Sobrevive à troca de dispositivo** | Sim |
| **Risco de perda** | Nenhum |

---

## Categorias

| Item | Detalhe |
|---|---|
| **Armazenamento** | Supabase — tabela `categorias` |
| **Usa Supabase** | Sim — via rota `/api/admin/categories` |
| **Usa localStorage** | Não |
| **Sobrevive ao F5** | Sim |
| **Sobrevive à troca de dispositivo** | Sim |
| **Risco de perda** | Nenhum |

---

## Produtos

| Item | Detalhe |
|---|---|
| **Armazenamento** | Supabase — tabelas `produtos` + Storage bucket `produtos` (imagens) |
| **Usa Supabase** | Sim — via rota `/api/admin/products` |
| **Usa localStorage** | Não |
| **Sobrevive ao F5** | Sim |
| **Sobrevive à troca de dispositivo** | Sim |
| **Risco de perda** | Nenhum |

---

## Resumo consolidado

| Módulo | Backend | localStorage | F5 | Multi-dispositivo | Risco |
|---|---|---|---|---|---|
| Pedidos | Supabase | Não | Sim | Sim | Nenhum |
| **Caixa** | Parcial | **Sim** | Sim | **Não** | **ALTO** |
| **Estoque** | **Não** | **Sim** | Sim | **Não** | **ALTO** |
| CRM | Supabase | Não | Sim | Sim | Baixo |
| Cupons | Supabase | Não | Sim | Sim | Baixo |
| Configurações | Supabase | Não | Sim | Sim | Nenhum |
| Categorias | Supabase | Não | Sim | Sim | Nenhum |
| Produtos | Supabase | Não | Sim | Sim | Nenhum |

---

## Módulos críticos

### Caixa
- Estado de abertura/fechamento, sangrias e suprimentos existem apenas no navegador local
- Se o computador do caixa for trocado, formatado ou o cache limpo, todo o histórico de movimentos é perdido
- Pedidos (para relatórios financeiros) são buscados do Supabase normalmente

### Estoque
- 100% local — insumos, movimentações, fornecedores e receitas não existem no banco
- Qualquer troca de dispositivo ou limpeza de cache resulta em perda total dos dados
- Não há backup automático

---

## Recomendações

1. **Caixa** — migrar abertura/fechamento e movimentos para tabela Supabase `caixa_movimentos`
2. **Estoque** — migrar insumos, fornecedores, receitas e movimentações para tabelas Supabase dedicadas
3. **Cupons** — garantir que a tabela `cupons` seja criada automaticamente via migration se não existir
4. **CRM** — revisar política de RLS na tabela `clientes` para garantir que o insert não falhe silenciosamente
