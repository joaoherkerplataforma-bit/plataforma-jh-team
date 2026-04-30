# Smoke Test E2E — Portal do Aluno

Checklist manual para validar o Portal do Aluno (`/portal`) ponta-a-ponta antes
de liberar para alunos reais.

> **IMPORTANTE — produção:** este smoke roda contra o banco real configurado em
> `.env.local`. Use os scripts `seed-portal-teste.ts` / `cleanup-portal-teste.ts`
> para criar e remover o aluno de teste — **não use seu usuário admin** para
> esta validação.

---

## Pré-requisitos

- [ ] Banco em produção com migrations `20260430000001` até `20260430000005` aplicadas
- [ ] Bucket privado `videoaulas` configurado no Supabase Storage
- [ ] `.env.local` na raiz do repo com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Pelo menos **2 videoaulas reais cadastradas e ativas** em `/pacientes/videoaulas`
      (ordem 1 e 2; subir antes de rodar o smoke como aluno)
- [ ] Servidor rodando — `npm run dev` (ou usar a URL de produção do Vercel)

---

## Setup

A partir da raiz do repositório:

```bash
npx tsx scripts/seed-portal-teste.ts
```

O script pede confirmação interativa. Para CI/automação, use `--yes`.

**Credenciais geradas:**

| Campo | Valor |
|-------|-------|
| Email | `aluno.teste.portal@plataforma-jh-team.test` |
| Senha | `TestePortal2026!` |
| Nome  | Aluno Teste do Portal |
| Plano | Trimestral · Completo (dieta + treino) |

**O que é criado:**

- `auth.users` — login pronto, email já confirmado
- `public.usuarios` — perfil = `aluno`
- `public.pacientes` — vinculado via `usuario_id`, `data_inicio = hoje`,
  vencimento = hoje + 90 dias, `proximo_retorno = hoje + 30 dias`
- `public.protocolos_base` — link WebDiet `https://webdiet.com.br/teste-aluno-portal`
  e link MFit `https://mfitpersonal.com.br/teste-aluno-portal` (ativo, versão 1)
- `public.formularios_recebidos` — 2 linhas: anamnese + feedback_retorno (com
  marcador `dados_raw.fonte = 'seed_portal_teste'`)

**O que NÃO é criado pelo seed (intencional):**

- Videoaulas — você sobe via UI antes do smoke
- Progresso de videoaulas — o cenário B valida exatamente isto
- Tarefas — não são exibidas no portal do aluno

---

## Cenários

Marque cada item conforme valida no navegador. Use **janela anônima** para evitar
contaminar a sessão admin.

### A. Login e roteamento por perfil

- [ ] Acessar `/login`
- [ ] Logar com `aluno.teste.portal@plataforma-jh-team.test` / `TestePortal2026!`
- [ ] Após login, ser redirecionado **para `/portal`** (não `/dashboard` nem `/tarefas`)
- [ ] Sidebar (se visível) mostra apenas o menu do aluno (não mostra Pacientes, Tarefas, Videoaulas admin)
- [ ] Header mostra badge `ALUNO`

### B. Estado inicial — videoaulas pendentes (gating ativo)

- [ ] Página `/portal` mostra título "Portal do Aluno"
- [ ] Mensagem: *"Antes de acessar sua área personalizada, assista as videoaulas obrigatórias na ordem."*
- [ ] Lista mostra **apenas as videoaulas ativas** (mínimo 2)
- [ ] **Videoaula 1** (ordem=1) está **desbloqueada** — botão "Assistir" clicável
- [ ] **Videoaula 2+** (ordem >=2) estão **bloqueadas** — exibem cadeado / texto "Disponível após concluir as anteriores"
- [ ] **Área personalizada NÃO aparece no DOM** (inspecionar HTML — `Sua Área Personalizada` não deve estar na página)
- [ ] Cards "Minha Dieta" e "Meu Treino" também não aparecem

### C. Assistir e marcar como assistida

- [ ] Clicar em "Assistir" na videoaula 1 → abre `/portal/videoaula/{id}`
- [ ] Player carrega o vídeo via signed URL (Network tab: URL com `?token=...` do Supabase Storage)
- [ ] URL não vaza o storage path bruto (deve ser uma signed URL temporária)
- [ ] Reproduzir até o fim (ou skip para perto do fim)
- [ ] Botão "Marcar como assistida" fica disponível
- [ ] Clicar em "Marcar como assistida" — chamada `POST /api/portal/progresso` retorna 200
- [ ] Voltar para `/portal` → videoaula 1 marcada como **concluída** (check verde)

### D. Desbloqueio sequencial

- [ ] Após marcar videoaula 1 como assistida, **videoaula 2** vira clicável
- [ ] Videoaulas 3+ continuam bloqueadas (se houver)
- [ ] Clicar em videoaula bloqueada — botão é `disabled` ou link para `/portal/videoaula/[id]` retorna `403`/redirect (gating server-side)

### E. Área personalizada liberada (após assistir TODAS)

- [ ] Marcar **todas** as videoaulas ativas como assistidas
- [ ] Voltar para `/portal`
- [ ] Banner "Sua Área Personalizada" aparece com ícone Sparkles
- [ ] Card **"Minha Dieta"** com botão `Acessar dieta` que abre `https://webdiet.com.br/teste-aluno-portal` em nova aba
- [ ] Card **"Meu Treino"** com botão `Acessar treino` que abre `https://mfitpersonal.com.br/teste-aluno-portal` em nova aba
- [ ] Card "Seu plano" mostra:
  - Nome: Aluno Teste do Portal
  - Plano: Completo · Trimestral
  - Início: data de hoje (formato dd/mm/yyyy)
  - Vencimento: hoje + 90 dias
  - "Restam ~90 dias" com cor dourada (#C9A84C) ou verde
- [ ] Seção **"Histórico de formulários"** lista 2 cards: Anamnese e Feedback & Retorno
- [ ] Clicar no card "Anamnese" → modal "Ver respostas" mostra as perguntas/respostas do seed
- [ ] Trilha de videoaulas continua visível abaixo, mas com título "Videoaulas concluídas" (referência apenas)

### F. Equipe em modo preview

- [ ] Logout do aluno
- [ ] Login como **João admin** (joao_admin)
- [ ] Acessar manualmente `/portal`
- [ ] Banner amarelo no topo: *"Modo preview — você está vendo a visão do aluno."*
- [ ] Tela renderiza com o **primeiro paciente da lista** (não bloqueia)
- [ ] Repetir com `pablo` e `joao_estagiario` — mesmo comportamento (preview)

### G. Aluno sem paciente vinculado

> Cenário de borda: simula um auth user com perfil `aluno` que ainda não foi
> vinculado a um paciente.

- [ ] Em outro terminal, criar um aluno órfão pelo Supabase Auth UI (email `orfao@plataforma-jh-team.test`)
- [ ] Inserir manualmente em `public.usuarios` com `perfil = 'aluno'` (sem inserir em `pacientes`)
- [ ] Logar como esse aluno
- [ ] Acessar `/portal` → tela **"Sua conta está sendo configurada"** (componente `ContaSendoConfigurada`)
- [ ] Mensagem: *"Estamos finalizando o seu cadastro no portal. Aguarde o contato do João..."*
- [ ] Limpar manualmente: deletar o auth user e a linha em `usuarios`

### H. Edge cases — plano vencido

> Validação opcional, requer alteração do banco.

- [ ] Atualizar `pacientes.data_vencimento_plano` do aluno teste para `hoje - 5 dias`
      (via SQL: `UPDATE pacientes SET data_vencimento_plano = current_date - 5 WHERE email = 'aluno.teste.portal@plataforma-jh-team.test';`)
- [ ] Recarregar `/portal` (estando com videoaulas todas assistidas)
- [ ] Card "Seu plano" mostra "Vencido há 5 dias" com cor cinza (`text-white/50`)
- [ ] Cards de Dieta/Treino continuam acessíveis (não bloqueia consumo)
- [ ] Reverter via cleanup ou restaurar o vencimento original

### I. Edge case — sem protocolo

- [ ] Deletar manualmente o protocolo do aluno teste:
      `DELETE FROM protocolos_base WHERE paciente_id = (SELECT id FROM pacientes WHERE email = 'aluno.teste.portal@plataforma-jh-team.test');`
- [ ] Recarregar `/portal`
- [ ] Card "Minha Dieta" usa link genérico `https://webdiet.com.br`
- [ ] Card "Meu Treino" usa link genérico `https://mfitpersonal.com.br`
- [ ] Não há erro 500 — fallback gracioso

### J. Segurança / RLS

- [ ] Como aluno teste logado, abrir DevTools → Network
- [ ] Confirmar que **nenhuma resposta** contém dados de outros pacientes
- [ ] Tentar acessar `/dashboard` ou `/pacientes` — middleware redireciona para `/portal` (ou bloqueia)
- [ ] Tentar abrir signed URL de videoaula em outra aba após >5 min — deve expirar (URL inválida)

---

## Cleanup

Após terminar todos os cenários:

```bash
npx tsx scripts/cleanup-portal-teste.ts
```

O script remove **idempotentemente**:

- `progresso_videoaulas` do aluno teste
- `historico_entregas` do paciente teste
- `tarefas` do paciente teste
- `formularios_recebidos` do paciente teste (todos — não só os do seed, para
  liberar deleção do paciente)
- `protocolos_base` do paciente teste
- `pacientes` row
- `usuarios` row
- `auth.users` (via `auth.admin.deleteUser`)

Rodar 2x não falha — apenas reporta `0` removidos.

---

## Definition of Done do smoke

- [ ] Cenários A, B, C, D, E, F, G concluídos com sucesso
- [ ] Cenários H, I, J validados ou conscientemente pulados (anotar motivo)
- [ ] Cleanup executado e banco limpo (verificar com `SELECT * FROM usuarios WHERE email = 'aluno.teste.portal@plataforma-jh-team.test';` retornando vazio)
- [ ] Quaisquer bugs encontrados anotados em `PROJETO.md` ou em issues
