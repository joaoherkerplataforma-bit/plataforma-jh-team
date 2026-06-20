# PROJETO.md — Plataforma João Herker Personal

> **ATENÇÃO:** em 20/06/2026 foi identificado que o banco de produção real é `ajnuekldkzenrryrcxho` (não `jsnagsklweeheojqpnut`, que ficou como ambiente de testes/legado). Domínio oficial atualizado para **jhplataforma.com**.

## Visão geral
Plataforma de gestão operacional para consultoria de personal trainer online.
Cliente: João Herker Personal (marca: JH TEAM)
Nome da plataforma: JH TEAM
Domínio oficial: **jhplataforma.com** (em produção desde 20/06/2026)

## URL pública (Vercel)
- Produção: https://jhplataforma.com
- Projeto Vercel: joaoherkerplataforma-bits-projects/plataforma-jh-team-web
- Auto-deploy: push em `main` dispara build (vercel.json)

## Stack técnica
- Frontend: Next.js + TypeScript
- Banco de dados + Auth: Supabase
- Deploy frontend: Vercel
- Processos pesados (imagem, IA): Railway
- Automações externas: Make (no-code, chama webhooks da plataforma)
- Composição de imagem: Sharp
- Relatório diário: WhatsApp Business API (às 8h todos os dias)

## Identidade visual
- Paleta: preto e dourado
- Logo: arquivo disponível no Google Drive (link nas respostas do kickoff)
- Nome exibido na plataforma: JH TEAM

---

## Perfis de acesso

### João (admin)
- Acesso total a todos os módulos
- Único com acesso ao Módulo A (controle de pacientes)
- Único que pode editar prazos manualmente
- Recebe relatório diário às 8h no WhatsApp
- Marca tarefas como "entregue" em todos os módulos

### Pablo
- Acesso aos Módulos B, C e D
- Não vê o Módulo A
- Marca tarefas como "feito"
- Executa: montagem de dieta+treino, Canva Antes/Depois, atualização de dieta mensal
- IMPORTANTE: Pablo só atualiza a dieta do Módulo D depois de assistir a gravação do João

### João Estagiário
- Acesso apenas ao Módulo B
- Não vê o Módulo A
- Marca tarefas como "feito"
- Executa: montagem de dieta+treino de pacientes novos
- IMPORTANTE: João e Pablo se alternam nos pacientes novos (Pablo, João, Pablo, João...)

### Aluno
- Portal próprio com login individual
- Redirecionamento para WebDiet (dieta) e MFit Personal (treino)
- Histórico de protocolos entregues
- Calendário de frequência

---

## Google Forms (5 formulários)

### Formulários de ENTRADA (pacientes novos)
1. **Anamnese (rotina e alimentação)**
   - Link: https://forms.gle/dUs9H7bsg68ENaXt9
   - Campo obrigatório para automação: Nome Completo, Email, Qual Plano Fechou
   - É o formulário principal — os outros dois são complementos

2. **Fotos iniciais**
   - Link: https://forms.gle/rRQ7PCVoRJzRPn6h8
   - Campo obrigatório para automação: nenhum (anamnese já identificou o paciente)

3. **Treino (só para plano completo)**
   - Link: https://forms.gle/Eh2JqSBm6zYQMadFA
   - Campo obrigatório para automação: nenhum (anamnese já identificou o paciente)

### Formulários de RETORNO (30 dias)
4. **Fotos de 30 dias**
   - Link: https://forms.gle/rd4ZaYxPypuoLVmK9
   - Campo obrigatório para automação: Nome Completo
   - Enviado junto com o formulário 5

5. **Feedback e retorno dietético**
   - Link: https://forms.gle/4N8R6j3xDz8ZKHAWA
   - Campo obrigatório para automação: Nome Completo
   - Enviado junto com o formulário 4

---

## Regras de negócio — críticas

### Cadastro de paciente novo
- O João envia os 3 formulários de entrada via WhatsApp quando a venda fecha
- O paciente NÃO entra na plataforma ainda — só entra quando João confirmar que respondeu tudo
- Quando João confirma, o formulário de anamnese é o gatilho principal
- Data de início = data do formulário de anamnese + 5 dias (João informa "5 dias" ao paciente)
- Prazo interno de entrega para estagiários = 3 dias (João cobra 3, fala 5 para o paciente)
- Delegação alternada: Pablo → João Estagiário → Pablo → João Estagiário...

### Ciclo de 30 dias
- No dia do retorno, João envia os 2 formulários de retorno juntos via WhatsApp
- Paciente muitas vezes não avisa quando respondeu (João precisa checar)
- Módulo C (fotos): prazo = 4 dias (João trabalha 7 dias por semana, sem dias úteis)
- Módulo D (dieta): prazo = 3 dias APÓS Pablo assistir a gravação do João
- O Pablo só atualiza a dieta depois de assistir a gravação — isso é regra

### Prazos e extensões
- Apenas o João pode estender prazos
- Casos permitidos: tragédia familiar, viagem, TPM (mulheres)
- Para fotos ruins: João apaga as respostas no Forms → plataforma entende como "não enviado" → quando paciente reenvia, cria nova tarefa

### Sistema de cores (Módulo A)
- VERDE: retorno é hoje
- LARANJA: faltando 3, 2 ou 1 dias para o retorno
- VERMELHO: retorno já passou
- NEUTRO/SEM COR: retorno está a mais de 3 dias
- AMARELO: plano vencendo em 3, 2 ou 1 dias
- VERMELHO NO NOME: plano já venceu
- STATUS OK (neutro): plano ativo e em dia

### Planos vencidos
- Paciente sai do painel principal automaticamente
- Vai para aba "Vencidos" (separada)
- João recebe notificação no relatório diário quando plano vence
- Não é "inativo" — é "vencido" (para renovação)

### Dashboard — sem separação por funcionário
- IMPORTANTE: não mostrar separadamente fila do Pablo vs João Estagiário
- Motivo: João não quer que João Estagiário perceba a diferença de volume de trabalho
- Cada funcionário abre seus próprios módulos e vê suas tarefas
- João vê visão consolidada sem separação por pessoa

### Notificações
- Estagiários: sem notificação push — apenas veem no dashboard quando entram
- João: relatório diário às 8h no WhatsApp (todos os dias, sem exceção)
- Alerta de tarefa atrasada: após 3 dias sem conclusão
- Comunicação com aluno: continua sendo manual pelo WhatsApp (sem automação agora)

---

## Módulo A — Controle de pacientes

### Campos por linha
- Nome do aluno
- Data de início
- Data de vencimento do plano
- Próximo retorno
- Dias restantes para o retorno
- Status do retorno (com cores)
- Tipo de plano (Dieta ou Completo)
- Tempo do plano (Trimestral, Semestral, Anual)
- Vencimento do plano
- Dias ativos restantes
- Status do plano (com cores)
- Campo de observações (CRÍTICO)

### Identificação única de pacientes
- Primário: nome completo
- Secundário: número de telefone/WhatsApp
- Terciário: e-mail
- (Casos raros de nomes iguais existem — telefone é o diferenciador)

### Painel resumo no topo do dashboard
- Total de pacientes ativos
- Total de pacientes vencidos
- Total de pacientes com plano vencendo em breve

---

## Módulo B — Protocolos novos

### Campos por tarefa
- Nome do aluno
- E-mail (para estagiários encontrarem no Forms)
- Responsável (Pablo ou João Estagiário, alternado)
- Tipo de plano (Dieta ou Completo)
- Data de envio dos formulários
- Data de entrega (automática: +3 dias)
- Campo de observações do João (CRÍTICO — visível antes de começar)
- Status: Feito | Entregue

### Regra de delegação
- Alternância: paciente 1 → Pablo, paciente 2 → João Estagiário, paciente 3 → Pablo...
- A plataforma controla a alternância automaticamente

---

## Módulo C — Fotos antes/depois

### Campos por tarefa
- Nome do aluno
- Paciente novo ou antigo (para saber se Canva já existe)
- Data de envio das fotos
- Data de entrega (automática: +4 dias — sem distinção de dias úteis)
- Campo de observações do João (CRÍTICO)
- Status: Feito | Gravado | Entregue

### Fluxo
1. Paciente envia fotos pelo Forms → tarefa criada automaticamente para Pablo
2. Pablo monta Antes/Depois no Canva → marca Feito
3. João grava vídeo de acompanhamento → marca Gravado
4. João verifica, marca Entregue e envia ao paciente

---

## Módulo D — Retorno dietético

### Campos por tarefa
- Nome do aluno
- Data de envio do formulário de retorno
- Data de entrega da nova dieta (automática: +3 dias)
- Campo de observações do João (CRÍTICO)
- Status: Feito | Entregue

### REGRA CRÍTICA
- Pablo só atualiza a dieta DEPOIS de assistir a gravação do João (Módulo C)
- A tarefa do Módulo D só fica disponível para o Pablo depois que o João marcar "Gravado" no Módulo C do mesmo paciente

---

## Módulo E — Alterações de protocolo
- Aba não existe mais na operação atual
- Pode ser implementada como funcionalidade futura
- Por ora: não construir

---

## Dados de migração
- Fonte primária: Google Planilhas (dados de gestão)
- Fonte completa: Google Forms (dados pessoais dos pacientes)
- Migração necessária antes do go-live

---

## Relatório diário (WhatsApp, 8h)
Conteúdo esperado pelo João:
- Quem precisa enviar formulários de 30 dias hoje
- Pacientes com retorno próximo e quantos dias faltam
- Pacientes com plano vencendo em breve
- Pacientes com plano vencido (para renovação)
- Tarefas atrasadas (sem conclusão há mais de 3 dias)
- Resumo: X ativos, Y vencidos, Z para vencer

---

## Decisões técnicas tomadas
_(Sessão de arquitetura — 2026-04-10)_

1. **Turborepo monorepo** — `apps/web` (Next.js) + `services/relatorio` (Railway/Node.js). Compartilha tipos TypeScript entre os serviços.
2. **Next.js App Router com RSC** — Route Handlers para webhooks, Middleware nativo para proteção de rotas por perfil, Server Components para dados sensíveis.
3. **Tabela `tarefas` unificada** para Módulos B, C, D — campo `modulo` discrimina o tipo. Facilita queries de tarefas atrasadas e visão consolidada.
4. **`tarefa_pai_id`** na tabela `tarefas` — Módulo D aponta para tarefa do Módulo C. Desbloqueio automático: quando C vai para 'gravado', plataforma atualiza D para 'pendente'.
5. **Alternância Pablo/Estagiário calculada dinamicamente** — via `delegacao_controle`, não por flag. Resiliente a falhas.
6. **Make apenas como bridge de Google Forms** — Make dispara webhooks para a plataforma. Lógica de negócio fica no Next.js, não no Make.
7. **Railway para WhatsApp Business API e relatório diário** — evita timeout do Vercel (10s). Cron job às 8h via Railway. Sharp também neste serviço para imagens futuras.
8. **`service_role` Supabase apenas em backend** — webhooks usam service_role que bypassa RLS. Nunca exposta no browser.
9. **Shadcn/UI** — paleta preto/dourado via CSS variables, sem vendor lock-in.
10. **Identificação de paciente por nome + telefone** — Google Forms não tem IDs. Match por combinação nome+telefone com fila de revisão para João em casos ambíguos.

## O que foi construído

### Sessão 1 — Arquitetura (2026-04-10)
- Arquitetura fullstack completa documentada (estrutura de pastas, schema, RLS, rotas, webhooks)
- Schema SQL completo: tabelas `usuarios`, `pacientes`, `formularios_recebidos`, `delegacao_controle`, `tarefas`, `protocolos_base`, `historico_entregas`
- Políticas RLS definidas para todos os perfis (joao_admin, pablo, joao_estagiario, aluno)
- Mapa de rotas com controle de acesso por perfil
- Fluxo de integração Make → Webhooks → Supabase documentado
- Fluxo de relatório diário Railway → WhatsApp documentado
- 8 riscos identificados com mitigações

### Sessão 2 — Database (2026-04-10)
Arquivos gerados em `supabase/`:

**Migrations (`supabase/migrations/`):**
- `20260410000001_create_usuarios.sql` — tabela usuarios + função utilitária `set_updated_at()`
- `20260410000002_create_pacientes.sql` — tabela pacientes com todos os campos do dashboard
- `20260410000003_create_formularios_recebidos.sql` — tabela para payloads brutos do Make/Google Forms
- `20260410000004_create_delegacao_controle.sql` — tabela com constraint de 1 linha única (alternância Pablo/Estagiário)
- `20260410000005_create_tarefas.sql` — tabela unificada Módulos B/C/D + trigger `desbloquear_modulo_d` + constraints de negócio
- `20260410000006_create_protocolos_base.sql` — links WebDiet/MFit por paciente e versão
- `20260410000007_create_historico_entregas.sql` — registro imutável de entregas (portal do aluno)
- `20260410000008_rls_policies.sql` — políticas RLS completas + funções helper `meu_perfil()` e `tem_perfil()`
- `20260410000009_indexes.sql` — 14 indexes baseados nos access patterns do dashboard e relatório diário

**Seeds e testes (`supabase/`):**
- `seed.sql` — 6 usuários, 3 pacientes (cenários: retorno próximo, plano vencendo hoje, paciente nova), 3 tarefas (feito/bloqueada/pendente), formulários, protocolos e histórico. Idempotente.
- `smoke_test.sql` — 9 blocos de validação: existência de tabelas, RLS habilitado, contagem de policies, indexes, foreign keys, constraints de negócio, dados seed, trigger desbloqueio Módulo D, funções helper

**Decisões técnicas implementadas:**
- Trigger automático: Módulo C → 'gravado' desbloqueia Módulo D de 'bloqueada' para 'pendente'
- Constraint `chk_modulo_d_bloqueada`: Módulo D sempre referencia um Módulo C (tarefa_pai_id NOT NULL)
- Constraint `chk_gravado_apenas_modulo_c`: status 'gravado' exclusivo do Módulo C
- Index único em `delegacao_controle` garante exatamente 1 linha em produção
- Funções RLS com `SECURITY DEFINER STABLE` para performance nas verificações de perfil

### Sessão 3 — Environment Bootstrap (2026-04-10)
Monorepo Turborepo configurado e ambiente de desenvolvimento funcional.

**Estrutura criada:**
```
jh-team/
├── apps/web/           — Next.js 15.5 + TypeScript + Tailwind v3
├── services/relatorio/ — Railway/Node.js (placeholder, pronto para implementação)
├── packages/           — Tipos compartilhados (vazio, pronto para uso)
├── supabase/           — Migrations e seeds (Sessão 2)
├── turbo.json          — Turborepo pipeline: build, dev, lint, typecheck, test
├── package.json        — npm workspaces + packageManager npm@11.9.0
├── vercel.json         — Deploy monorepo configurado para Vercel
├── .env.example        — Documentação de todas as variáveis necessárias
├── .env.local          — Variáveis vazias para preencher (não commitado)
└── .gitignore          — Protege .env.local, node_modules, .next, .turbo
```

**Dependências instaladas em `apps/web`:**
- `next@15.5.15`, `react@19`, `react-dom@19`
- `@supabase/supabase-js@^2`, `@supabase/ssr@^0.6`
- `tailwindcss@^3`, `postcss`, `autoprefixer`
- `zod@^3`, `react-hook-form@^7`, `@hookform/resolvers`
- `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react` (base shadcn/ui)
- `typescript@^5`, todos os `@types/*` necessários

**Página inicial:**
- `apps/web/src/app/page.tsx` — "JH TEAM" em dourado (#C9A84C) sobre fundo preto
- `src/lib/utils.ts` — utilitário `cn()` para shadcn/ui
- CSS brand tokens: `--gold: #C9A84C`, `--gold-light: #E8C97A`, `--gold-dark: #A07830`

**Validações executadas:**
- `npm run build` → 2 packages, 2 success, 0 erros
- `npm run dev` → `✓ Ready in 1576ms`, `GET / 200` confirmado em localhost:3000
- Next.js 15.5.15, compile time 4.5s, bundle inicial 102 kB

**Próximo passo:** Preencher `.env.local` com as chaves do Supabase e conectar o cliente.

### Sessao 4 -- Autenticacao e perfis de acesso (2026-04-10)
Sistema de autenticacao completo com Supabase Auth, protecao de rotas por middleware e redirecionamento por perfil.

**Arquivos criados:**
```
apps/web/src/
├── types/auth.ts                    — Tipos TypeScript: UserProfile, PerfilAcesso, PERFIL_ROUTES
├── lib/supabase/
│   ├── client.ts                    — Cliente Supabase browser (createBrowserClient)
│   ├── server.ts                    — Cliente Supabase server (createServerClient + cookies)
│   └── middleware.ts                — Helper de refresh de sessao + protecao de rotas + redirect por perfil
├── middleware.ts                    — Middleware Next.js (matcher para rotas protegidas)
├── app/login/page.tsx               — Pagina de login (react-hook-form + zod + identidade visual)
├── app/dashboard/
│   ├── page.tsx                     — Dashboard placeholder (Server Component protegido)
│   └── logout-button.tsx            — Componente de logout (Client Component)
├── app/tarefas/page.tsx             — Pagina tarefas placeholder (Server Component protegido)
└── app/portal/page.tsx              — Portal do aluno placeholder (Server Component protegido)
```

**Funcionalidades implementadas:**
- Login com email/senha via Supabase Auth (validacao com zod)
- Middleware protege `/dashboard`, `/tarefas`, `/portal` — redireciona para `/login` se nao autenticado
- Apos login, busca perfil na tabela `usuarios` e redireciona: joao_admin->/dashboard, pablo->/tarefas, joao_estagiario->/tarefas, aluno->/portal
- Usuario autenticado em `/login` e redirecionado automaticamente para sua rota de perfil
- Logout funcional com redirecionamento para `/login`
- Identidade visual: fundo preto, elementos dourados (#C9A84C), tipografia tracking

**Validacoes executadas:**
- `npx tsc --noEmit` — 0 erros
- `next lint` — 0 warnings, 0 erros

**Proximo passo:** Criar usuarios de teste no Supabase Auth (joao@jhteam.com, pablo@jhteam.com, etc.) e vincular com a tabela `usuarios` via seed ou dashboard.

### Sessao 5 -- Modulo A: Controle de Pacientes (2026-04-10)
Dashboard real substituindo o placeholder, com gestao completa de pacientes.

**Arquivos criados/modificados:**
```
apps/web/src/
├── types/pacientes.ts                       — Tipos TypeScript: Paciente, PacienteComCalculos, ResumoCards, labels
├── lib/pacientes.ts                         — Funcoes de calculo (dias retorno, dias ativos), formatacao, cores, badges
├── app/dashboard/
│   ├── page.tsx                             — MODIFICADO: Server Component com fetch de pacientes do Supabase
│   ├── pacientes-table.tsx                  — Client Component: tabela com tabs Ativos/Vencidos, cards de resumo
│   ├── adicionar-paciente-modal.tsx         — Client Component: modal com formulario de novo paciente
│   └── observacoes-inline.tsx               — Client Component: edicao inline de observacoes (click-to-edit)
```

**Funcionalidades implementadas:**
- Dashboard com header JH TEAM (dourado) + info do usuario + logout
- Painel de resumo: 3 cards (Total Ativos, Vencidos, Vencendo em breve)
- Tabela de pacientes com 11 colunas (nome, datas, status, tipo/tempo plano, observacoes)
- Sistema de cores automatico por linha (verde=hoje, laranja=1-3 dias, vermelho=atrasado)
- Nome em vermelho quando plano venceu (dias_ativos < 0)
- Badges de status: retorno (verde/laranja/vermelho) e plano (amarelo vencendo/vermelho vencido)
- Tabs Ativos/Vencidos com contagem
- Tab Vencidos sem colunas de status de retorno
- Modal "Adicionar Paciente" com calculo automatico da data de vencimento (trimestral=+3m, semestral=+6m, anual=+12m)
- Observacoes editaveis inline: click abre textarea, blur ou Enter salva no Supabase, Escape cancela
- Identidade visual: fundo #1A1A1A, cards #242424, linhas alternadas #1E1E1E, dourado #C9A84C

**Validacoes executadas:**
- `npx tsc --noEmit` — 0 erros
- `next lint` — 0 warnings, 0 erros

**Proximo passo:** Implementar Modulos B, C e D (protocolos novos, fotos antes/depois, retorno dietetico).

### Sessao 6 -- Layout base: Sidebar + Tema claro/escuro (2026-04-10)
Layout compartilhado para todas as rotas protegidas com sidebar, header e sistema de temas.

**Arquivos criados:**
```
apps/web/src/
├── components/
│   ├── theme-provider.tsx               — Context API para tema light/dark, persistencia localStorage
│   └── layout/
│       ├── sidebar.tsx                  — Sidebar responsiva (240px/64px), menu filtrado por perfil
│       ├── header.tsx                   — Saudacao, badge perfil, toggle tema, botao sair
│       └── app-layout.tsx              — Wrapper: sidebar + header + conteudo
├── app/
│   └── (protected)/
│       ├── layout.tsx                   — Server Component: auth check + busca perfil + ThemeProvider + AppLayout
│       ├── dashboard/
│       │   ├── page.tsx                 — REESCRITO: sem auth check (layout cuida), 4 cards com tarefas
│       │   ├── pacientes-table.tsx      — ATUALIZADO: 4 cards (Ativos, Vencidos, Tarefas Aberto, Tarefas Atrasadas) + dark mode
│       │   ├── adicionar-paciente-modal.tsx  — MOVIDO de app/dashboard/
│       │   ├── observacoes-inline.tsx   — MOVIDO de app/dashboard/
│       │   └── logout-button.tsx        — MOVIDO de app/dashboard/
│       ├── tarefas/page.tsx             — SIMPLIFICADO: sem auth check, sem header proprio
│       └── portal/page.tsx              — SIMPLIFICADO: sem auth check, sem header proprio
```

**Arquivos modificados:**
- `tailwind.config.ts` — adicionado `darkMode: 'class'`
- `app/globals.css` — body com cores light/dark
- `app/layout.tsx` — classe `dark` no html, `suppressHydrationWarning`

**Arquivos removidos:**
- `app/dashboard/` (antigo, movido para `(protected)/dashboard/`)
- `app/tarefas/` (antigo, movido para `(protected)/tarefas/`)
- `app/portal/` (antigo, movido para `(protected)/portal/`)

**Funcionalidades implementadas:**
- Sidebar com logo JH TEAM (dourado), avatar com inicial, menu filtrado por perfil
- Sidebar expandida (240px) / recolhida (64px) com transicao suave (duration-300)
- Badges de perfil: ADMIN, PABLO, ESTAGIARIO, ALUNO
- Toggle tema claro/escuro com icones Sun/Moon, persistencia em localStorage
- Header com saudacao personalizada, badge de perfil, botao sair
- Mobile: sidebar escondida por padrao, hamburger menu no header, overlay para fechar
- 4 cards no dashboard: Total Ativos, Vencidos, Tarefas em Aberto, Tarefas Atrasadas
- Tarefas em Aberto: query `status NOT IN ('entregue', 'cancelada')`
- Tarefas Atrasadas: query `data_entrega < NOW() - 3 dias`
- Route group `(protected)` centraliza auth check e layout em um unico Server Component
- Todas as classes CSS com suporte dual: `bg-white dark:bg-[#1A1A1A]`, etc.

**Validacoes executadas:**
- `npx tsc --noEmit` — 0 erros
- `next lint` — 0 warnings, 0 erros

**Proximo passo:** Implementar Modulos B, C e D (protocolos novos, fotos antes/depois, retorno dietetico).

### Sessao 7 -- Modulos B, C, D e pagina /tarefas (2026-04-13)
Fila operacional completa para Pablo, Joao Estagiario e Joao Admin com tabs por modulo.

**Arquivos criados/modificados:**
```
apps/web/src/
├── app/(protected)/tarefas/
│   ├── page.tsx                          — Server Component: fetch tarefas + perfil + nome paciente
│   └── tarefas-tabs.tsx                  — Client Component: 4 abas (Pendencias/Fotos 30 Dias/Retornos de Dieta/Alteracoes)
├── app/api/tarefas/
│   ├── route.ts                          — POST: criar tarefa avulsa (usado pela aba Alteracoes)
│   └── [id]/
│       ├── status/route.ts               — PATCH: transicao de status (feito/gravado/entregue)
│       └── observacoes/route.ts          — PATCH: editar observacoes_joao (admin only)
├── components/layout/sidebar.tsx         — Menu /tarefas liberado para joao_admin
├── lib/supabase/service.ts               — Cliente service-role para route handlers
└── types/tarefas.ts                      — Tipos: Tarefa, ModuloTarefa, StatusTarefa, labels

supabase/migrations/
└── 20260414000001_add_modulo_e.sql       — Adiciona valor 'E' ao enum modulo (Alteracoes)
```

**Funcionalidades implementadas:**
- Tabs com nomes da operacao real: **Pendencias** (B), **Fotos 30 Dias** (C), **Retornos de Dieta** (D), **Alteracoes** (E)
- Visibilidade por perfil:
  - `joao_estagiario` → so ve Pendencias
  - `pablo` → ve B, C e D (tarefas D bloqueadas ficam ocultas)
  - `joao_admin` → ve todas as 4 abas, inclusive D bloqueadas com cadeado
- Transicoes de status por perfil:
  - Pablo marca **feito** em B/D, **feito** em C
  - Joao marca **gravado** em C (libera D do mesmo paciente via trigger DB)
  - Joao marca **entregue** em qualquer modulo
- Observacoes do Joao com destaque dourado e edicao inline (admin only)
- Highlight visual de prazo: neutro (no prazo), laranja (1-3 dias), vermelho (atrasado)
- Modal "Nova alteracao" na aba E para registrar pedidos de ajuste avulso
- Trigger DB `desbloquear_modulo_d` continua sendo a fonte da verdade para o desbloqueio do Modulo D

**Validacoes executadas:**
- `npx tsc --noEmit` — 0 erros
- `next lint` — 0 warnings, 0 erros

**Proximo passo:** Conectar webhooks Make → API para automatizar criacao de pacientes e tarefas a partir do Google Forms.

### Sessao 8 -- Webhooks Make (2026-04-16)
Cinco endpoints REST que recebem os Google Forms via Make e geram pacientes + tarefas automaticamente.

**Arquivos criados:**
```
apps/web/src/
├── app/api/webhooks/
│   ├── anamnese/route.ts                 — POST: cria paciente + tarefa B com alternancia Pablo/Estagiario
│   ├── fotos-iniciais/route.ts           — POST: registra formulario do paciente novo
│   ├── treino/route.ts                   — POST: registra formulario do plano completo
│   ├── fotos-30-dias/route.ts            — POST: cria tarefa C (Pablo monta Antes/Depois)
│   └── retorno-dieta/route.ts            — POST: cria tarefa D bloqueada (espera Joao gravar)
├── lib/
│   ├── webhook-auth.ts                   — Helper de verificacao do Bearer WEBHOOK_SECRET
│   └── dates.ts                          — Helpers: data_inicio = anamnese + 5 dias, data_entrega = +3/+4 dias
└── scripts/test-webhooks.ts              — Script de teste local (npx tsx scripts/test-webhooks.ts)
```

**Regras de negocio aplicadas pelos webhooks:**
- **Anamnese:** Match de paciente existente por (email) ou (nome+telefone). Se nao existir, cria novo paciente com `data_inicio = hoje + 5 dias`. Cria tarefa B com prazo +3 dias e responsavel definido pela `delegacao_controle` (alternancia Pablo/Estagiario, atualizada apos cada criacao).
- **Fotos iniciais / Treino:** Apenas registram payload em `formularios_recebidos`. Se paciente nao existe, retornam 404 (anamnese deve vir primeiro).
- **Fotos 30 dias:** Cria tarefa C para Pablo com prazo +4 dias.
- **Retorno dieta:** Cria tarefa D bloqueada (`status = 'bloqueada'`) com `tarefa_pai_id` apontando para a ultima tarefa C do paciente. So fica disponivel quando Joao marcar a C como `gravado`.

**Seguranca:**
- Todos os endpoints exigem header `Authorization: Bearer ${WEBHOOK_SECRET}`
- Token invalido → 401 Unauthorized
- Payload invalido → 400 Bad Request com lista de campos faltantes
- Service-role key usada no servidor (bypassa RLS, nunca exposta ao browser)

**Testes executados (`scripts/test-webhooks.ts`):**
1. Token invalido → **401** OK
2. Anamnese paciente novo → **200** cria paciente + tarefa B
3. Fotos iniciais → **200** registra formulario
4. Treino → **200** registra formulario
5. Fotos 30 dias → **200** cria tarefa C para Pablo
6. Retorno dieta → **200** cria tarefa D bloqueada
7. Anamnese duplicada → **200** reusa paciente existente (sem criar duplicata)
8. Fotos iniciais com paciente inexistente → **404** OK
9. Anamnese com campos faltando → **400** OK

**Proximo passo:** Configurar os 5 cenarios no Make para apontar para os webhooks de producao em https://jhplataforma.com/api/webhooks/*.

### Configuração Make — Cenários

Documentação de como configurar cada cenário no Make para que os Google Forms cheguem aos webhooks da plataforma.

Todos os webhooks exigem o header:

```
Authorization: Bearer ${WEBHOOK_SECRET}
```

URL base de produção: `https://jhplataforma.com`

#### Cenário 1: Anamnese (anamnese)

**Webhook:** `POST /api/webhooks/anamnese`
**Trigger Make:** nova resposta no Google Form "JH - Dieta"

##### Payload esperado

```json
{
  "nome_completo": "Nome do paciente",
  "email": "paciente@email.com",
  "telefone": "+5511999999999",
  "qual_plano": "Trimestral - Dieta",
  "origem": "Instagram",
  "respostas": [
    { "pergunta": "E-mail", "resposta": "..." },
    { "pergunta": "Qual é o seu nome COMPLETO?", "resposta": "..." },
    { "pergunta": "Número do celular", "resposta": "..." },
    { "pergunta": "Qual é o seu plano atual?", "resposta": "..." },
    { "pergunta": "Por onde você me conheceu ou soube da consultoria?", "resposta": "..." }
  ]
}
```

O campo `respostas` é **opcional** — se não vier, o webhook continua funcionando como antes (mantém compatibilidade com a configuração atual do Make). Quando enviado, o array completo é persistido em `formularios_recebidos.dados_raw` junto com o resto do payload.

##### Ordem das perguntas (mapear no Make)

1. E-mail
2. Qual é o seu nome COMPLETO?
3. Número do celular
4. Qual é o seu plano atual?
5. Por onde você me conheceu ou soube da consultoria? (Instagram, TikTok, YouTube, Indicação)
6. (demais perguntas da anamnese — adicionar conforme João for documentando)

##### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://jhplataforma.com/api/webhooks/anamnese`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com os campos estruturados (`nome_completo`, `email`, `telefone`, `qual_plano`, `origem`) **e** `respostas` como array com a ordem das perguntas acima.

##### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição. Isso evita quebrar o fluxo se o Make mandar algo errado durante a configuração.

#### Cenário 2: Fotos Iniciais (fotos-iniciais)

**Webhook:** `POST /api/webhooks/fotos-iniciais`
**Trigger Make:** nova resposta no Google Form "2026 JH - Fotos"

##### Payload esperado

```json
{
  "nome_completo": "Nome do paciente",
  "email": "paciente@email.com",
  "respostas": [
    { "pergunta": "Nome completo", "resposta": "..." },
    { "pergunta": "E-mail", "resposta": "..." },
    { "pergunta": "Foto frente", "resposta": "https://drive.google.com/..." },
    { "pergunta": "Foto lado", "resposta": "https://drive.google.com/..." },
    { "pergunta": "Foto costas", "resposta": "https://drive.google.com/..." }
  ]
}
```

O campo `respostas` é **opcional** — se não vier, o webhook continua funcionando como antes. Quando enviado, o array completo é persistido em `formularios_recebidos.dados_raw`.

##### Ordem das perguntas (mapear no Make)

1. Nome completo
2. E-mail
3. (campos de upload de foto — Make deve enviar como URLs públicas do Drive em `respostas[].resposta`)

**Importante:** As URLs de fotos devem ser **públicas** (Drive: "Qualquer pessoa com o link") para o `<img>` carregar no modal da plataforma.

##### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://jhplataforma.com/api/webhooks/fotos-iniciais`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com `nome_completo`, `email` e `respostas` como array. Para os campos de upload, garanta que o link do Drive já esteja com permissão pública antes de enviar.

##### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição.

#### Cenário 3: Treino (treino)

**Webhook:** `POST /api/webhooks/treino`
**Trigger Make:** nova resposta no Google Form "JH - Treino"

##### Payload esperado

```json
{
  "nome_completo": "Nome do paciente",
  "email": "paciente@email.com",
  "respostas": [
    { "pergunta": "Nome completo", "resposta": "..." },
    { "pergunta": "E-mail", "resposta": "..." }
  ]
}
```

O campo `respostas` é **opcional** — se não vier, o webhook continua funcionando como antes. Quando enviado, o array completo é persistido em `formularios_recebidos.dados_raw`.

##### Ordem das perguntas (mapear no Make)

1. Nome completo
2. E-mail
3. (demais perguntas do formulário de treino — documentar conforme João for confirmando)

##### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://jhplataforma.com/api/webhooks/treino`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com `nome_completo`, `email` e `respostas` como array seguindo a ordem das perguntas acima.

##### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição.

#### Cenário 4: Fotos 30 Dias (fotos-30-dias)

**Webhook:** `POST /api/webhooks/fotos-30-dias`
**Trigger Make:** nova resposta no Google Form "Fotos - RETORNO JH"

##### Payload esperado

```json
{
  "nome_completo": "Nome do paciente",
  "respostas": [
    { "pergunta": "Nome completo", "resposta": "..." },
    { "pergunta": "Foto frente", "resposta": "https://drive.google.com/..." },
    { "pergunta": "Foto lado", "resposta": "https://drive.google.com/..." },
    { "pergunta": "Foto costas", "resposta": "https://drive.google.com/..." }
  ]
}
```

O campo `respostas` é **opcional** — se não vier, o webhook continua funcionando como antes. Quando enviado, o array completo é persistido em `formularios_recebidos.dados_raw`.

##### Ordem das perguntas (mapear no Make)

1. Nome completo
2. (campos de upload de foto — análogo ao Cenário 2; URLs do Drive precisam estar públicas)

##### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://jhplataforma.com/api/webhooks/fotos-30-dias`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com `nome_completo` e `respostas` como array. Para os campos de upload, garanta que o link do Drive já esteja com permissão pública antes de enviar.

##### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição.

#### Cenário 5: Feedback & Retorno (retorno-dieta)

**Webhook:** `POST /api/webhooks/retorno-dieta`
**Trigger Make:** nova resposta no Google Form "JH - Feedback & Retorno"

##### Payload esperado

```json
{
  "nome_completo": "Nome do paciente",
  "respostas": [
    { "pergunta": "E-mail", "resposta": "..." },
    { "pergunta": "Qual seu nome completo?", "resposta": "..." }
  ]
}
```

O campo `respostas` é **opcional** — se não vier, o webhook continua funcionando como antes (mantém compatibilidade com a configuração atual do Make). Quando enviado, o array completo é persistido em `formularios_recebidos.dados_raw` junto com o resto do payload.

##### Ordem das perguntas (mapear no Make)

1. E-mail
2. Qual seu nome completo?
3. Você saberia me relatar seu peso em jejum?
4. De 0-10, qual nota você daria a sua adesão à dieta último mês ao protocolo atual
5. De 0-10, qual nota você daria ao nível de fome no último mês ao protocolo atual
6. Para o nosso próximo mês juntos, existe alguma alteração que você gostaria que fosse feita no âmbito DIETÉTICO?
7. Como foi sua relação mental com as refeições livres? Fez as refeições como programado e explicado?
8. De 0-10, qual nota você daria a sua adesão ao treino no último mês ao protocolo atual
9. Me conte como foi seu desempenho nos treinos
10. De 0-10, qual nota você daria a sua adesão ao cardio no último mês ao protocolo atual
11. Qual foi a sua MÉDIA SEMANAL de cardio desse mês que passamos juntos?
12. E me relembre aqui, qual foi nossa meta semanal teórica no começo do mês?
13. De 0-10, qual nota você daria a sua saúde intestinal no último mês ao protocolo atual?
14. De 0-10, qual nota você daria a sua ingestão de água no último mês ao protocolo atual?
15. De 0-10, qual nota você daria ao seu sono no último mês ao protocolo atual?
16. Gostaria de justificar sua resposta acima?
17. De 0-10, como você classificaria seus resultados esse mês? (tanto físico, como mental)
18. Agora me conte sobre sua visão e opinião desse mês — Como foi sua auto percepção das mudanças do seu físico esse mês?
19. Além disso, me conte como foi sua experiência nesses últimos 30 dias de acompanhamento

##### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://jhplataforma.com/api/webhooks/retorno-dieta`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com `nome_completo` (campo 2 do Form) e `respostas` como array. Cada item tem `pergunta` (texto literal da pergunta acima) e `resposta` (valor capturado pelo Make do Google Forms).

Exemplo do array (no formato da expressão Make):

- Item 1: pergunta = "E-mail", resposta = `{{1.email}}`
- Item 2: pergunta = "Qual seu nome completo?", resposta = `{{1.nome_completo}}`
- Item 3: pergunta = "Você saberia me relatar seu peso em jejum?", resposta = `{{1.peso_jejum}}`
- ... (etc, seguindo a ordem das 19 perguntas acima)

##### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição. Isso evita quebrar o fluxo se o Make mandar algo errado durante a configuração.

### Sessao 9 -- Deploy no Vercel (2026-04-21)
Plataforma publicada com URL pública funcional.

**Configuracao Vercel:**
- Projeto linkado: `joaoherkerplataforma-bits-projects/plataforma-jh-team-web` (projectId `prj_J99bewKl7B64vpoJns7eL5HPw1PK`)
- Framework detectado: Next.js
- Build command: `npx turbo run build --filter=@jh-team/web...`
- Output directory: `apps/web/.next`
- Install command: `npm install`
- Auto-deploy ativo no push em `main` via `vercel.json`

**Variaveis de ambiente configuradas em Production:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEBHOOK_SECRET`

**Ajuste no Turborepo:**
- `turbo.json` recebeu bloco `env` no task `build` declarando as 5 variaveis (4 do Supabase/webhook + `NODE_ENV`).
- Sem isso o Turborepo nao expoe as env vars ao processo do Next.js e o build quebra na geracao de paginas que usam `createClient()` em build time.

**Deploy de producao:**
- URL canonica: https://jhplataforma.com
- Build time: 56s
- Status: Ready (HTTP 200)
- Deployment ID: `dpl_GaoGQ1sxC2MWMZHAk14K5u68tPJ1`

**Domínio oficial:** jhplataforma.com (em produção desde 20/06/2026). Supabase de produção: `ajnuekldkzenrryrcxho` (o projeto `jsnagsklweeheojqpnut` é legado/testes).

### Sessao 10 -- Servico de relatorio diario (Railway) (2026-05-23)
Implementacao completa do `services/relatorio` (antes era placeholder). Monta o
relatorio diario do Joao a partir do Supabase e envia por WhatsApp Business API
as 8h (BRT).

**Arquivos criados:**
```
services/relatorio/
├── railway.json              — cron 0 11 * * * (= 08:00 BRT), startCommand npm start, restart NEVER
├── .env.example              — Supabase (obrigatorio) + WhatsApp Cloud API (opcional) + REPORT_CRON/TZ
├── README.md                 — modos de execucao, deploy Railway, nota sobre template do WhatsApp
└── src/
    ├── index.ts              — entrypoint: modos --once (cron) / --scheduler (node-cron) / --dry
    ├── config.ts             — carrega e valida env; WhatsApp opcional (degrada para modo log)
    ├── supabase.ts           — cliente service_role (bypassa RLS, so backend)
    ├── types.ts              — tipos minimos do schema relevante ao relatorio
    ├── dates.ts              — hoje no fuso BRT, diasEntre (UTC, sem erro de DST), formatacao
    ├── relatorio.ts          — montarRelatorio (queries) + classificarRelatorio (logica pura)
    ├── formatar.ts           — render do texto WhatsApp com as 6 secoes do PROJETO.md
    ├── whatsapp.ts           — envio via Meta Cloud API + chunking do limite de 4096 chars
    └── smoke.ts              — teste da logica de classificacao + preview (sem banco/WhatsApp)
```

**Conteudo do relatorio (conforme PROJETO.md):**
1. Enviar formularios de 30 dias hoje (retorno = hoje)
2. Retornos proximos (1-3 dias) + retornos atrasados
3. Planos vencendo em breve (0-3 dias)
4. Planos vencidos (renovacao)
5. Tarefas atrasadas (sem conclusao ha mais de 3 dias apos o prazo; ignora 'bloqueada' e 'entregue')
6. Resumo: X ativos / Y vencidos / Z para vencer

**Regras espelhadas de `apps/web/src/lib/pacientes.ts`:** classificacao ativo/vencido
por `dias_ativos` (vencimento - hoje), janela de alerta de 3 dias, `cancelado`
excluido de todas as secoes. Resumo identico a `calcularResumo`.

**Decisoes:**
- One-shot por padrao (sai apos enviar) para o cron nativo do Railway; modo
  `--scheduler` com node-cron disponivel como alternativa always-on.
- WhatsApp opcional: sem as 3 chaves (`WHATSAPP_PHONE_NUMBER_ID/ACCESS_TOKEN/RECIPIENT`)
  o servico imprime o relatorio no log em vez de falhar — permite validar conteudo.
- Logica de classificacao isolada em funcao pura (`classificarRelatorio`) para
  ser testavel sem Supabase.

**Validacoes executadas:**
- `npm run typecheck` (relatorio) — 0 erros
- `npm run build` (relatorio) — 0 erros, dist/ gerado
- `npm run smoke` — 10/10 asserções OK + preview da mensagem
- `npm run typecheck` (turbo, monorepo) — 2/2 packages OK

**Proximo passo:** Criar app WhatsApp Business (Meta) e preencher as 3 chaves no
Railway; opcionalmente migrar para envio via *template* aprovado (mensagem proativa
fora da janela de 24h). Composicao de imagem com Sharp segue como item futuro.

### Sessao 11 -- Construtor de formularios nativo (substitui Google Forms + Make) (2026-05-23)
Formularios nativos mobile-first na plataforma. Os pacientes preenchem direto
(link publico via WhatsApp), os dados vao para o Supabase e a mesma logica de
negocio dos webhooks roda no envio. Elimina a dependencia de Google Forms + Make.

**Banco (migrations):**
```
supabase/migrations/
├── 20260523000001_create_formularios.sql  — tabela formularios (campos JSONB + acao + share_token),
│                                             RLS (admin gerencia / equipe le), FK formulario_id e tipo
│                                             'avulso' em formularios_recebidos, bucket publico formularios-fotos
└── 20260523000002_seed_formularios.sql     — pre-cria os 5 forms (anamnese, fotos-iniciais, treino,
                                              fotos-30-dias, feedback-retorno) com campos; idempotente
```

**App (apps/web):**
```
src/
├── types/formulario-builder.ts             — TipoCampo, AcaoFormulario, CampoFormulario, Formulario, labels
├── lib/
│   ├── formulario-schema.ts                — slugify, normalizarCampos (builder), validarValor (envio)
│   └── automacoes.ts                       — FONTE UNICA da logica: processarAnamnese/FotosIniciais/Treino/
│                                             Fotos30Dias/RetornoDieta + registrarAvulso
├── app/f/[slug]/                           — PUBLICO (sem login): page.tsx + formulario-publico.tsx (renderer
│                                             mobile-first: escolha, escala 0-10, upload de foto com camera)
├── app/api/forms/[slug]/
│   ├── submit/route.ts                     — POST publico (valida token + campos, grava, dispara a acao)
│   └── upload/route.ts                     — POST publico (foto -> bucket via service_role, retorna URL publica)
├── app/(protected)/formularios/            — BUILDER (admin): lista + editor [id] (campos drag por setas,
│                                             tipos, obrigatorio, mapeamento, opcoes, link/QR, ativar/rotacionar)
└── app/api/admin/formularios/              — POST criar, PATCH editar (normaliza campos), DELETE
```

**Decisoes:**
- Builder com **acoes fixas** (escolhido): Joao edita perguntas/opcoes/ordem; cada form
  tem um papel (anamnese cria paciente, etc.); forms avulsos usam acao 'nenhuma'.
- **Webhooks Make refatorados** para wrappers finos sobre `lib/automacoes` — fonte unica
  da verdade. Continuam vivos durante a transicao; podem ser removidos ao desligar o Make.
- `dados_raw` gravado no formato `respostas: [{pergunta,resposta}]` + campos mapeados no topo,
  100% compativel com a tela `/pacientes/[id]` existente (texto e fotos renderizam sem mudanca).
- Fotos em **bucket publico** com path UUID (nao descobrivel) — preserva o `<img>` direto que
  a UI ja usava com as URLs do Drive. Upload server-side (service_role) gated pelo `share_token`.
- Seguranca do envio publico: `share_token` no link + honeypot; sem login (paciente nao tem conta
  na entrada, igual ao fluxo atual de mandar o link pelo WhatsApp).

**Validacoes executadas:**
- `npx tsc --noEmit` (web) — 0 erros
- `next lint` — 0 warnings, 0 erros
- `npm run build` (turbo, monorepo) — 2/2 packages OK; rotas /f/[slug], /formularios,
  /formularios/[id], /api/forms/* e /api/admin/formularios/* compiladas
- Teste das funcoes puras (normalizarCampos, validarValor, slugify) — todas OK

**Proximo passo:** Aplicar as 2 migrations no Supabase; abrir `/formularios`, revisar os
5 forms pre-criados, copiar os links e enviar pelo WhatsApp no lugar dos Google Forms.
Quando estiver rodando, desligar os cenarios do Make e (opcional) remover as rotas
`/api/webhooks/*`.

---

## Status atual do projeto (2026-04-21)

### Pronto e funcional
- **Infraestrutura:** Turborepo (apps/web + services/relatorio + packages) + Next.js 15.5 + TypeScript + Tailwind v3
- **Banco de dados:** Supabase com 7 tabelas, RLS completa, trigger de desbloqueio do Modulo D, 9 migrations + seed + smoke tests
- **Auth:** Login Supabase Auth + middleware de protecao + redirect por perfil (joao_admin / pablo / joao_estagiario / aluno)
- **Layout:** Sidebar responsiva, tema claro/escuro com persistencia, identidade visual preto + dourado (#C9A84C)
- **Modulo A (Controle de pacientes):** Dashboard com cards de resumo, tabela de 11 colunas, sistema de cores automatico, modal "Adicionar Paciente", observacoes editaveis inline, abas Ativos/Vencidos
- **Modulos B, C, D, E (Tarefas):** Pagina /tarefas com 4 abas (Pendencias, Fotos 30 Dias, Retornos de Dieta, Alteracoes), visibilidade por perfil, transicoes de status, observacoes do Joao com destaque, alertas de prazo
- **Webhooks Make → API (5 endpoints, todos testados):**
  - `POST /api/webhooks/anamnese`
  - `POST /api/webhooks/fotos-iniciais`
  - `POST /api/webhooks/treino`
  - `POST /api/webhooks/fotos-30-dias`
  - `POST /api/webhooks/retorno-dieta`
- **Deploy producao:** https://jhplataforma.com — auto-deploy ativo no push em `main`, env vars configuradas em Production

### Em aberto / proximos passos
1. ~~**Configurar Make**~~ ✅ **substituido na Sessao 11** por formularios nativos (`/formularios` + `/f/{slug}`). Acao restante: aplicar as 2 migrations no Supabase, revisar os 5 forms pre-criados, enviar os links pelo WhatsApp e desligar o Make.
2. ~~**Servico Railway** — implementar `services/relatorio`~~ ✅ **codigo concluido na Sessao 10.** Falta apenas: criar app WhatsApp Business (Meta) e preencher as 3 chaves no Railway. Composicao de imagem (Sharp) segue como item futuro.
3. ~~**Portal do aluno**~~ ✅ implementado (area personalizada, videoaulas com gating, player com signed URL) — ver historico de commits pos-Sessao 9
4. **Migracao de dados** — importar pacientes existentes do Google Planilhas *(externo: depende do export real da planilha)*
5. **Dominio definitivo** — jhplataforma.com (domínio oficial em produção desde 20/06/2026)
6. **Usuarios de producao** — criar contas reais (Joao, Pablo, Joao Estagiario) no Supabase Auth e vincular a tabela `usuarios` *(externo: Supabase Dashboard)*

### Sessoes concluidas
| # | Data | Entrega |
|---|------|---------|
| 1 | 2026-04-10 | Arquitetura fullstack |
| 2 | 2026-04-10 | Database (migrations + RLS + seed) |
| 3 | 2026-04-10 | Environment bootstrap (Turborepo + Next.js) |
| 4 | 2026-04-10 | Auth + perfis de acesso |
| 5 | 2026-04-10 | Modulo A (Controle de pacientes) |
| 6 | 2026-04-10 | Layout base (sidebar + tema) |
| 7 | 2026-04-13 | Modulos B, C, D + pagina /tarefas |
| 8 | 2026-04-16 | Webhooks Make (5 endpoints + testes) |
| 9 | 2026-04-21 | Deploy Vercel (https://jhplataforma.com — domínio oficial desde 20/06/2026) |
| 10 | 2026-05-23 | Servico de relatorio diario (Railway + WhatsApp Business API) |
| 11 | 2026-05-23 | Construtor de formularios nativo (substitui Google Forms + Make) |

## Problemas resolvidos
[atualizar quando bugs importantes forem resolvidos]
