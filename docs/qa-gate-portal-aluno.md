# QA Gate — Portal do Aluno

**Story:** Portal do Aluno (commits 1-7/8)
**Reviewer:** Quinn (QA Test Architect)
**Data:** 2026-04-30
**Verdict:** PASS (com 3 CONCERNS observacionais)

---

## Sumário Executivo

- **Total de itens revisados:** 35
- **PASS:** 32
- **CONCERNS:** 3 (não-bloqueantes — todos arquiteturais e documentados, com mitigação fácil)
- **FAIL:** 0

**Decisão final:** PASS. A implementação está coerente com a arquitetura aprovada pela Aria,
respeita os princípios constitucionais (CLI First, Quality First), e os controles de segurança
críticos (gating server-side, RLS, signed URLs, service-role isolada no servidor) estão
corretos e validados em código. Os três CONCERNS são observacionais — riscos arquiteturais
de baixa probabilidade que valem ser anotados em backlog mas não bloqueiam o push.

Todos os 5 commits 1-7 estão prontos para `@devops *push`.

---

## 1. Schema & Migrations

| AC | Status | Evidência |
|---|---|---|
| 5 migrations aplicadas (000001..000005) | PASS | `npx supabase migration list --linked`: todas as 5 listadas com remote = local (linhas 14-18 do output) |
| `videoaulas` tem `IF NOT EXISTS` | PASS | `20260430000001_create_videoaulas.sql:8` `CREATE TABLE IF NOT EXISTS public.videoaulas` |
| `progresso_videoaulas` tem `IF NOT EXISTS` | PASS | `20260430000002_create_progresso_videoaulas.sql:7` |
| Bucket usa `ON CONFLICT DO NOTHING` | PASS | `20260430000004_storage_videoaulas_bucket.sql:21` |
| FK progresso `ON DELETE CASCADE` em aluno_id e videoaula_id | PASS | `20260430000002:9-10` ambas as FKs com `ON DELETE CASCADE` |
| FK videoaulas.created_by `ON DELETE SET NULL` | PASS | `20260430000001:16` |
| UNIQUE INDEX parcial em `ordem WHERE ativo` | PASS | `20260430000001:29-31` `CREATE UNIQUE INDEX IF NOT EXISTS idx_videoaulas_ordem_ativo ON public.videoaulas(ordem) WHERE ativo = true` |
| Index secundário `(ativo, ordem)` para listagem | PASS | `20260430000001:34-35` |
| Trigger `set_updated_at` em videoaulas | PASS | `20260430000001:37-39` |
| Bucket `file_size_limit = 1 GB` | PASS | `20260430000004:18` `1073741824` (= 1024^3) |
| Bucket MIME types restritos | PASS | `20260430000004:19` `'video/mp4', 'video/webm', 'video/quicktime'` |
| Bucket `public = false` | PASS | `20260430000004:17` |
| UNIQUE (aluno_id, videoaula_id) em progresso | PASS | `20260430000002:12` — base da idempotência do "marcar assistida" |

**Observação positiva:** o uso de UNIQUE INDEX parcial (`WHERE ativo = true`) é elegante:
permite reordenação livre entre arquivados sem violar unicidade. Combinado com o truque de
ordem temporária negativa em `/api/admin/videoaulas/reorder`, a reordenação fica robusta.

---

## 2. RLS Policies

| AC | Status | Evidência |
|---|---|---|
| `videoaulas` RLS habilitada | PASS | `20260430000003_rls_videoaulas.sql:20` `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| `videoaulas_equipe_all` cobre os 3 perfis | PASS | `20260430000003:23-34` joao_admin OR pablo OR joao_estagiario, tanto em USING quanto WITH CHECK |
| `videoaulas_aluno_select` filtra `ativo = true` | PASS | `20260430000003:37-42` aluno só lê ativos (videos arquivados invisíveis) |
| `progresso_videoaulas` RLS habilitada | PASS | `20260430000003:47` |
| `progresso_equipe_all` cobre os 3 perfis | PASS | `20260430000003:50-61` |
| `progresso_aluno_self_select` (`aluno_id = auth.uid()`) | PASS | `20260430000003:64-69` aluno A NÃO consegue ler progresso de aluno B |
| `progresso_aluno_self_insert` (`aluno_id = auth.uid()`) | PASS | `20260430000003:72-77` aluno só insere para si mesmo |
| Aluno NÃO tem UPDATE/DELETE em progresso | PASS | Sem policy = bloqueado (`20260430000003:79-80` comentário explicita o append-only) |
| Storage `videoaulas_storage_equipe_all` (`bucket_id = 'videoaulas'`) | PASS | `20260430000004:24-41` USING e WITH CHECK ambos ancoram em `bucket_id` |
| Aluno NÃO tem policy direta em storage.objects do bucket | PASS | `20260430000004:43-46` comentário confirma — sem policy = bloqueado por padrão. Aluno só recebe video via signed URL gerada pelo backend |
| `formularios_aluno_self` aplicada | PASS | `20260430000005:7-14` aluno lê formulários de pacientes onde `usuario_id = auth.uid()` (subquery em pacientes) |

**Análise de risco RLS:**
- O subquery em `formularios_aluno_self` (`paciente_id IN (SELECT id FROM public.pacientes WHERE usuario_id = auth.uid())`) é correto e seguro.
  Aluno A não verá formulários de aluno B porque a subquery limita a pacientes onde `usuario_id = auth.uid()`.
- As policies `..._equipe_all` em videoaulas/progresso usam `OR` entre 3 perfis em USING e WITH CHECK — pattern já aprovado em migrations anteriores.

---

## 3. Gating Server-Side

| AC | Status | Evidência |
|---|---|---|
| `<AreaPersonalizada>` aparece UMA vez no JSX | PASS | `apps/web/src/app/(protected)/portal/portal-content.tsx:52` — única ocorrência |
| Componente está dentro do branch `acessoLiberado === true` | PASS | `portal-content.tsx:48` `acessoLiberado && paciente ?` ternário garante render condicional. Ramo `else` (linha 67) renderiza apenas trilha |
| HTML não vaza componente quando bloqueado | PASS | Como o ternário decide o que vai pro `return`, o React não emite o JSX da AreaPersonalizada quando `acessoLiberado=false`. Não é CSS-hide. |
| `<VideoaulasList>` aparece em ambos os ramos (intencional) | PASS | Ramo liberado (linha 63) renderiza com header "Videoaulas concluídas"; ramo bloqueado (linha 81) é a trilha principal |
| Deep-link `/portal/videoaula/{id-bloqueado}` redireciona | PASS | `apps/web/src/app/(protected)/portal/videoaula/[id]/page.tsx:93-95` `if (!podeAcessarVideoaula(...)) redirect('/portal')` |
| API `/api/portal/progresso` revalida `podeAcessarVideoaula` (defesa em profundidade) | PASS | `apps/web/src/app/api/portal/progresso/route.ts:86-91` retorna 403 se bloqueado |
| Sem CSS-based hiding (`display:none`/`hidden`/`invisible`) | PASS | `grep -rn "display: *none\|invisible" apps/web/src/app/(protected)/portal/` — nenhum match no código de gating |
| Card "Meu Treino" só para `tipo_plano = 'completo'` | PASS | `area-personalizada.tsx:57` `mostraTreino = tipoPlano === 'completo'`; linha 86-94 renderiza condicionalmente |

**Análise crítica:** o gating é puramente lógico/server-side. O `PortalContent` é um Server
Component que decide via if/else qual árvore JSX devolver — o HTML chega ao browser sem o
componente da Área Personalizada quando `acessoLiberado=false`. Isto é defensivo correto.

---

## 4. Upload Admin & APIs

| AC | Status | Evidência |
|---|---|---|
| Upload chunked direto browser → bucket via supabase-js | PASS | `upload-modal.tsx:141-147` `supabase.storage.from('videoaulas').upload(storagePath, arquivo, { ... })` — supabase-js faz chunked internamente para arquivos grandes |
| Validação client (MIME + extensão + tamanho) antes do upload | PASS | `upload-modal.tsx:86-104` — valida ext+mime e `size > TAMANHO_MAXIMO_BYTES` antes de aceitar o arquivo |
| Rollback do storage em caso de POST de metadados falhar | PASS | `upload-modal.tsx:168-174` — try/catch em volta de `supabase.storage.from('videoaulas').remove([storagePath])` quando o `respostaCreate.ok` é false |
| `autorizarEquipe()` valida os 3 perfis | PASS | `lib/auth.ts:51-53` `if (!PERFIS_EQUIPE.includes(perfil))` — rejeita qualquer perfil fora de joao_admin/pablo/joao_estagiario |
| POST /api/admin/videoaulas usa `autorizarEquipe()` | PASS | `route.ts:15-18` |
| PATCH /api/admin/videoaulas/[id] usa `autorizarEquipe()` | PASS | `[id]/route.ts:17-20` |
| DELETE /api/admin/videoaulas/[id] = soft-delete (`ativo=false`) | PASS | `[id]/route.ts:108-136` apenas faz `update({ ativo: false })`, preserva FK em progresso_videoaulas |
| POST /api/admin/videoaulas/reorder usa `autorizarEquipe()` | PASS | `reorder/route.ts:24-27` |
| Reorder usa truque de ordem temp negativa | PASS | `reorder/route.ts:108` `ordemTemp = -1 - Math.floor(Math.random() * 2_000_000_000)` — random no espaço de inteiros negativos para evitar colisão entre reorders concorrentes |
| Reorder tem rollback best-effort em falhas dos passos 2 e 3 | PASS | `reorder/route.ts:127-130` (rollback step 2), `144-151` (rollback step 3) |
| `revalidatePath('/portal')` em todas as mutações admin | PASS | `route.ts:81`, `[id]/route.ts:97-98, 132-133`, `reorder/route.ts:158-159` |

**CONCERN-1 (LOW — observacional):** O upload-modal não captura `duracao_seg` antes do upload.
O backend aceita `duracao_seg` mas o cliente sempre envia `null` (ver `upload-modal.tsx:159-164`,
o `body` JSON não inclui `duracao_seg`). Resultado: a coluna fica sempre `null`, e o card no
portal não exibe duração ("0:00"). Não bloqueia funcionalmente — `formatarDuracao` em
`videoaula-card.tsx:11` retorna `null` quando `seg <= 0`, então o badge de duração simplesmente
não aparece. **Mitigação sugerida:** próxima iteração pode usar `<video>.duration` no client
após o upload e patch o registro com a duração detectada.

---

## 5. Player & Signed URL

| AC | Status | Evidência |
|---|---|---|
| Signed URL TTL 1h via service role | PASS | `videoaula/[id]/page.tsx:20` `SIGNED_URL_TTL_SEG = 3600`; `lib/videoaulas.ts:104-122` `gerarSignedUrl` usa `createServiceClient` |
| `gerarSignedUrl` documenta requisito de validar autorização ANTES de chamar | PASS | `videoaulas.ts:97-102` JSDoc é explícito: "Quem chama deve validar ANTES que o aluno tem direito" |
| Página do player chama `podeAcessarVideoaula` antes de gerar URL | PASS | `videoaula/[id]/page.tsx:93-95` (aluno) e `49-59` (equipe — bypass do gating com `ativo=true`) |
| Player Client Component com `<video controls controlsList="nodownload">` | PASS | `player.tsx:87-94` |
| Botão "marcar assistida" idempotente via 23505 catch | PASS | `lib/videoaulas.ts:90` `if (error.code === '23505') return` — UNIQUE violation = no-op |
| `revalidatePath('/portal')` após marcar | PASS | `api/portal/progresso/route.ts:106` |
| Equipe em preview: pode assistir, botão desabilitado | PASS | `player.tsx:121-129` `modoPreview ? <button disabled />` com tooltip explicando |
| Service role client NÃO importado em arquivos com `'use client'` | PASS | `lib/videoaulas.ts` e `lib/auth.ts` não têm `'use client'` no topo. Nenhum componente client (player.tsx, upload-modal.tsx, lista-admin.tsx) importa `createServiceClient` |
| `SUPABASE_SERVICE_ROLE_KEY` não tem prefixo `NEXT_PUBLIC_` | PASS | `lib/supabase/service.ts:10` — Next.js NÃO inclui essa env var no bundle client |

**CONCERN-2 (LOW — arquitetural):** A função `gerarSignedUrl` usa service-role e retorna a URL
para o Server Component. A URL assinada chega ao HTML (`<video src={signedUrl}>`) — isso é
seguro pois o aluno é o destinatário legítimo e a TTL de 1h limita o blast radius. Para
hardening adicional no futuro, considerar:
1. Encurtar TTL para 5-15min (aluno reabre página → nova URL).
2. Adicionar verificação no GET para regenerar URL se houver claim de expiração.
Não-bloqueante; o trade-off atual (1h) é razoável para vídeos de 10-30min.

---

## 6. Edge Cases

| AC | Status | Evidência |
|---|---|---|
| Aluno sem paciente vinculado → `<ContaSendoConfigurada>` | PASS | `portal/page.tsx:67-70` `if (!paciente) return <ContaSendoConfigurada />`; idem no player `videoaula/[id]/page.tsx:83-85` |
| Plano vencido → cor cinza + texto "Vencido há N dias" | PASS | `area-personalizada.tsx:33` (cor) `text-white/50` para `dias < 0`; linha 40 (label) `Vencido há ${Math.abs(dias)} dia${...}` |
| Sem protocolo → fallback para URLs genéricas | PASS | `area-personalizada.tsx:51-54` `(protocolo?.link_webdiet?.trim() || '') || URL_WEBDIET_GENERICA` (e idem para mfit). Constantes em linhas 12-13 |
| Sem formulários respondidos → mensagem amigável | PASS | `area-personalizada.tsx:128-143` ramo `formularios.length === 0` mostra "Você ainda não respondeu nenhum formulário" |
| Equipe em preview: banner amarelo "Modo preview" | PASS | `portal-content.tsx:33-38` (portal) e `player.tsx:59-67` (player). Cores `#1A1500 + #C9A84C` consistentes |
| Card "Meu Treino" só para `tipo_plano = 'completo'` | PASS | `area-personalizada.tsx:57, 86-94` |
| Equipe em preview: pega o primeiro paciente | PASS | `portal/page.tsx:51-58` `order('created_at', { ascending: false }).limit(1).maybeSingle()` |

**Análise:** todos os fallbacks são graciosos — nenhum lança erro 500. O `area-personalizada`
mostra corretamente os 4 estados de plano (vencido, vencendo em <7d, vencendo em <30d, ok)
com cores consistentes com a paleta da plataforma.

---

## 7. Código & Segurança

| AC | Status | Evidência |
|---|---|---|
| `npx tsc --noEmit` 0 erros | PASS | Executado em `apps/web/`: sem output (= sucesso) |
| `next lint` 0 warnings | PASS | "✔ No ESLint warnings or errors" |
| Sem `any` em types/lib/components novos | PASS | `grep "any" types/videoaulas.ts lib/portal-gating.ts lib/videoaulas.ts lib/protocolos.ts area-personalizada.tsx portal-content.tsx upload-modal.tsx` — nenhum `: any` |
| Absolute imports `@/...` em todo o código novo | PASS | `grep "from ['\"]\\.\\./` em portal/, videoaulas/, lib/portal-gating.ts, types/videoaulas.ts — nenhum match |
| Service-role NÃO em bundle client | PASS | `service.ts` não tem `'use client'`; importadores são Route Handlers ou libs sem `'use client'`. `process.env.SUPABASE_SERVICE_ROLE_KEY` (sem `NEXT_PUBLIC_`) não é inlined pelo Next.js |
| Links externos com `rel="noopener noreferrer"` e `target="_blank"` | PASS | `area-personalizada.tsx:174-177` ambos os atributos presentes no `<a>` |
| PT-BR em UI; EN em código | PASS | UI: "Sua Área Personalizada", "Marcar como assistida", "Modo preview" etc.; identificadores: `acessoLiberado`, `podeAcessarVideoaula`, `gerarSignedUrl` |
| Identidade preto/dourado preservada | PASS | Cores hex consistentes: `#C9A84C` (dourado), `#0A0A0A`/`#111111`/`#1A1500` (pretos), `#F5F0E8` (off-white). Match com `app/globals.css` |
| Sidebar tem item "Videoaulas" para os 3 perfis equipe | PASS | `components/layout/sidebar.tsx:37-42` |
| Sidebar tem item "Portal" só para `aluno` | PASS | `components/layout/sidebar.tsx:49-54` |
| API /api/portal/progresso valida perfil = 'aluno' | PASS | `route.ts:55-60` retorna 403 para qualquer perfil ≠ aluno |

**CONCERN-3 (MEDIUM — operacional):** `apps/web/src/app/api/portal/progresso/route.ts` faz **três
queries no fluxo feliz** antes do INSERT: (1) `auth.getUser`, (2) `usuarios.select` para perfil,
(3) `listarVideoaulasAtivas` + `listarProgressoAluno` em paralelo. Em condição de uso intenso
(ex: aluno percorrendo 10 videoaulas em sequência), são 4 round-trips por POST. Aceitável
para o volume atual, mas pode virar gargalo se a base crescer. **Mitigação sugerida:** cachear
videoaulas ativas por `revalidate: 60` no fetcher já que mudam raramente.

---

## Riscos Identificados (consolidado)

1. **[LOW]** `duracao_seg` nunca é populado — vídeos sempre exibem sem duração no card. Não afeta funcionalidade. Mitigação: detectar via `<video>.duration` após upload.
2. **[LOW]** Signed URL TTL de 1h é generoso. Trade-off documentado. Aceitável para protótipo. Mitigação: reduzir para 15min se houver vetor de abuso identificado.
3. **[MEDIUM]** API `/api/portal/progresso` faz 4 round-trips no DB por POST. OK para volume atual; cachear `listarVideoaulasAtivas` se crescer.
4. **[LOW]** Migrations `_rls_videoaulas` e `_rls_aluno_formularios` usam `CREATE POLICY` (não `IF NOT EXISTS`). Re-aplicar manualmente falharia. Mitigação: o tracker do Supabase gerencia isso, mas vale anotar para futura migration de "drop+recreate".
5. **[LOW]** O reorder usa rollback best-effort sem transação real (limitação PostgREST conhecida). Em corner cases de falha de rede entre os 3 steps, pode deixar um vídeo com `ordem` negativa. Mitigação possível: criar RPC `reorder_videoaulas_ativas` no Postgres como função SECURITY DEFINER atômica.

---

## Não Cobertos (Out of Scope)

- Smoke test E2E manual no browser — fica para `@dev` ou `@po` executar usando `docs/portal-aluno-smoke-test.md` após o deploy.
- Verificação de RLS em runtime (queries SQL como aluno A tentando ler progresso de aluno B) — a checklist da Aria valida no design; quem fizer o smoke deve confirmar via DevTools.
- Testes automatizados — projeto não tem suite Jest/Vitest configurada; o smoke checklist serve como teste manual.
- Migração de dados — alunos atuais ainda não foram cadastrados no banco; isso é responsabilidade do go-live.
- Cron job para limpar signed URLs antigas no log (se houver).

---

## Recomendação

**PASS** — pode seguir para `@devops *push`.

Ações pós-push recomendadas:
1. Subir 2+ videoaulas reais em produção via `/pacientes/videoaulas`.
2. Executar `scripts/seed-portal-teste.ts` no banco de produção.
3. Rodar o smoke test manual em `docs/portal-aluno-smoke-test.md` cenários A-G como mínimo.
4. Após validar, rodar `scripts/cleanup-portal-teste.ts`.
5. Anotar os 3 CONCERNS como tickets de melhoria no backlog (não-urgentes).

---

## Apêndice: Comandos Executados

```bash
# Migrations aplicadas em produção
npx supabase migration list --linked
# → 5 novas migrations (000001..000005) confirmadas em remote

# TypeScript
cd apps/web && npx tsc --noEmit
# → sem output (sucesso)

# ESLint
cd apps/web && npx next lint
# → "✔ No ESLint warnings or errors"

# Verificações estruturais (grep)
grep -rn "service_role|createServiceClient" apps/web/src
# → apenas em route handlers (api/) e libs server-side (lib/), nenhum em arquivos 'use client'

grep -rn "from ['\"]\\.\\./" apps/web/src/app/(protected)/portal apps/web/src/app/(protected)/pacientes/videoaulas apps/web/src/app/api/portal apps/web/src/app/api/admin apps/web/src/lib/videoaulas.ts apps/web/src/lib/portal-gating.ts
# → nenhum match (todos imports são absolute)

grep -rn "display: *none|invisible|hidden" apps/web/src/app/(protected)/portal/
# → apenas overflow-hidden (utilitário de layout, não gating)

grep -n "AreaPersonalizada" apps/web/src/app/(protected)/portal/portal-content.tsx
# → 1 import + 1 render (linha 52, dentro do branch acessoLiberado)
```

---

*QA Gate concluído por Quinn (QA Test Architect) em 2026-04-30.*
*Foundation in CLI First | Gating Server-Side | Defense in Depth.*
