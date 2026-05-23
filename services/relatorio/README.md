# @jh-team/relatorio — Relatório diário (Railway)

Serviço que monta o **relatório diário do João** a partir do Supabase e o envia
por **WhatsApp Business API** todos os dias às **8h (horário de Brasília)**.

Roda no Railway, fora do Vercel, justamente para não esbarrar no limite de 10s
das serverless functions e para hospedar o cron job (decisão técnica #7 do `PROJETO.md`).

## O que o relatório contém

Conforme `PROJETO.md` (seção "Relatório diário"):

1. 📨 Quem precisa **enviar formulários de 30 dias hoje** (retorno é hoje)
2. 🔁 **Retornos próximos** (faltam 1–3 dias) e retornos já atrasados
3. ⏳ **Planos vencendo em breve** (vence em 0–3 dias)
4. 🔴 **Planos vencidos** (para renovação)
5. 🚨 **Tarefas atrasadas** (sem conclusão há mais de 3 dias após o prazo)
6. 📊 **Resumo**: X ativos · Y vencidos · Z para vencer

As regras de cálculo (dias para retorno, dias ativos, classificação ativo/vencido)
espelham exatamente as do app web (`apps/web/src/lib/pacientes.ts`).

## Como rodar localmente

```bash
cd services/relatorio
cp .env.example .env        # preencha as chaves do Supabase
npm install

# Monta e imprime o relatório SEM enviar (recomendado p/ validar):
npm run report:dry

# Executa uma vez e envia (precisa das chaves do WhatsApp no .env):
npm run report:once

# Sobe como serviço com agendador interno (dispara às 8h BRT):
npm run build && npm run start:scheduler
```

Sem as chaves do WhatsApp, o serviço **não falha**: ele imprime o relatório no log.
Isso permite validar o conteúdo antes de ligar o canal.

## Modos de execução

| Comando | Comportamento |
|---|---|
| `npm start` (`--once`) | Monta, envia e **sai**. Ideal para o cron nativo do Railway. |
| `npm run start:scheduler` (`--scheduler`) | Fica de pé e dispara no horário do `REPORT_CRON`. |
| `npm run report:dry` (`--dry`) | Monta e imprime, **sem enviar**. |

## Variáveis de ambiente

Veja `.env.example`. Resumo:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role (bypassa RLS, só backend) |
| `WHATSAPP_PHONE_NUMBER_ID` | ⬜ | Phone Number ID da Cloud API |
| `WHATSAPP_ACCESS_TOKEN` | ⬜ | Token de acesso da Cloud API |
| `WHATSAPP_RECIPIENT` | ⬜ | Número do João (só dígitos, ex.: `5511999999999`) |
| `WHATSAPP_API_VERSION` | ⬜ | Versão da Graph API (padrão `v21.0`) |
| `REPORT_CRON` | ⬜ | Cron do modo scheduler (padrão `0 8 * * *`) |
| `REPORT_TIMEZONE` | ⬜ | Fuso do disparo (padrão `America/Sao_Paulo`) |

## Deploy no Railway

1. **New Project → Deploy from Repo** e selecione este monorepo.
2. **Root Directory** do serviço: `services/relatorio`.
3. Em **Variables**, defina as variáveis acima (Supabase obrigatórias; WhatsApp para enviar de verdade).
4. O `railway.json` deste diretório já configura:
   - `buildCommand`: `npm install && npm run build`
   - `startCommand`: `npm start` (modo one-shot)
   - `cronSchedule`: `0 11 * * *` → **11:00 UTC = 08:00 BRT**
   - `restartPolicyType`: `NEVER` (cron job não deve reiniciar após sair)

> **Por que `0 11 * * *` e não `0 8`?** O cron do Railway roda em **UTC**.
> 08:00 BRT (UTC−3) = 11:00 UTC. Se o serviço for migrado para um modo com
> agendador interno (`--scheduler`), aí sim use `REPORT_CRON=0 8 * * *` com
> `REPORT_TIMEZONE=America/Sao_Paulo` (o node-cron respeita o fuso).

### Alternativa sem cron nativo

Se preferir manter um serviço sempre ativo (sem usar o cron do Railway),
troque o `startCommand` para `npm run start:scheduler` e remova o `cronSchedule`.

## Nota sobre mensagens proativas no WhatsApp

A Cloud API só permite **texto livre** dentro da janela de 24h de atendimento
(o cliente precisa ter mandado mensagem nas últimas 24h). Para uma mensagem
proativa diária garantida, a Meta exige um **template aprovado**. Como o relatório
vai sempre para o próprio João, na prática a janela costuma estar aberta; se não
estiver, crie um template de relatório e adapte `whatsapp.ts` para o tipo
`template`. O envio de texto já está implementado e funciona dentro da janela.
