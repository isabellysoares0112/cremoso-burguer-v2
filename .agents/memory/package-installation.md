---
name: Instalação de dependências
description: Particularidade do instalador de pacotes do ambiente ao instalar um projeto Node existente.
---

O instalador de pacotes do ambiente pode executar `pnpm add .` quando recebe o projeto como alvo. Isso pode adicionar uma dependência `link:` apontando para o próprio pacote e normalizar metadados de plataformas nativas no lockfile, mesmo sem uma mudança intencional nas dependências.

**Why:** Esse comportamento já produziu alterações colaterais no `package.json` e no lockfile durante a preparação de um projeto importado.

**How to apply:** Depois de instalar dependências de um projeto existente, confira imediatamente `package.json`, o lockfile e os arquivos gerados pelo framework; preserve apenas as mudanças intencionais antes de validar ou concluir.