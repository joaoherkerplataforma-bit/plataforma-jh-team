# PROJETO.md — Plataforma João Herker Personal

## Visão geral
Plataforma de gestão operacional para consultoria de personal trainer online.
Cliente: João Herker Personal (marca: JH TEAM)
Nome da plataforma: JH TEAM
Domínio desejado: jhteam.com (1ª opção), consultoriajhteam.com (2ª), joaoherkerteam.com (3ª)

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
_(2026-04-10 — Sessão de arquitetura)_

- Arquitetura fullstack completa documentada (estrutura de pastas, schema, RLS, rotas, webhooks)
- Schema SQL completo: tabelas `usuarios`, `pacientes`, `formularios_recebidos`, `delegacao_controle`, `tarefas`, `protocolos_base`, `historico_entregas`
- Políticas RLS definidas para todos os perfis (joao_admin, pablo, joao_estagiario, aluno)
- Mapa de rotas com controle de acesso por perfil
- Fluxo de integração Make → Webhooks → Supabase documentado
- Fluxo de relatório diário Railway → WhatsApp documentado
- 8 riscos identificados com mitigações

## Problemas resolvidos
[atualizar quando bugs importantes forem resolvidos]
