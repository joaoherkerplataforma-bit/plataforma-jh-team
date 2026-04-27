# Cenários do Make

Documentação de como configurar cada cenário no Make para que os Google Forms cheguem aos webhooks da plataforma.

Todos os webhooks exigem o header:

```
Authorization: Bearer ${WEBHOOK_SECRET}
```

URL base de produção: `https://plataforma-jh-team-web-joaoherkerplataforma-bits-projects.vercel.app`

---

## Cenário 1: Anamnese (anamnese)

**Webhook:** `POST /api/webhooks/anamnese`
**Trigger Make:** nova resposta no Google Form "JH - Dieta"

### Payload esperado

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

### Ordem das perguntas (mapear no Make)

1. E-mail
2. Qual é o seu nome COMPLETO?
3. Número do celular
4. Qual é o seu plano atual?
5. Por onde você me conheceu ou soube da consultoria? (Instagram, TikTok, YouTube, Indicação)
6. (demais perguntas da anamnese — adicionar conforme João for documentando)

### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://plataforma-jh-team-web-joaoherkerplataforma-bits-projects.vercel.app/api/webhooks/anamnese`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com os campos estruturados (`nome_completo`, `email`, `telefone`, `qual_plano`, `origem`) **e** `respostas` como array com a ordem das perguntas acima.

### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição. Isso evita quebrar o fluxo se o Make mandar algo errado durante a configuração.

---

## Cenário 2: Fotos Iniciais (fotos-iniciais)

**Webhook:** `POST /api/webhooks/fotos-iniciais`
**Trigger Make:** nova resposta no Google Form "2026 JH - Fotos"

### Payload esperado

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

### Ordem das perguntas (mapear no Make)

1. Nome completo
2. E-mail
3. (campos de upload de foto — Make deve enviar como URLs públicas do Drive em `respostas[].resposta`)

**Importante:** As URLs de fotos devem ser **públicas** (Drive: "Qualquer pessoa com o link") para o `<img>` carregar no modal da plataforma.

### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://plataforma-jh-team-web-joaoherkerplataforma-bits-projects.vercel.app/api/webhooks/fotos-iniciais`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com `nome_completo`, `email` e `respostas` como array. Para os campos de upload, garanta que o link do Drive já esteja com permissão pública antes de enviar.

### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição.

---

## Cenário 3: Treino (treino)

**Webhook:** `POST /api/webhooks/treino`
**Trigger Make:** nova resposta no Google Form "JH - Treino"

### Payload esperado

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

### Ordem das perguntas (mapear no Make)

1. Nome completo
2. E-mail
3. (demais perguntas do formulário de treino — documentar conforme João for confirmando)

### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://plataforma-jh-team-web-joaoherkerplataforma-bits-projects.vercel.app/api/webhooks/treino`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com `nome_completo`, `email` e `respostas` como array seguindo a ordem das perguntas acima.

### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição.

---

## Cenário 4: Fotos 30 Dias (fotos-30-dias)

**Webhook:** `POST /api/webhooks/fotos-30-dias`
**Trigger Make:** nova resposta no Google Form "Fotos - RETORNO JH"

### Payload esperado

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

### Ordem das perguntas (mapear no Make)

1. Nome completo
2. (campos de upload de foto — análogo ao Cenário 2; URLs do Drive precisam estar públicas)

### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://plataforma-jh-team-web-joaoherkerplataforma-bits-projects.vercel.app/api/webhooks/fotos-30-dias`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com `nome_completo` e `respostas` como array. Para os campos de upload, garanta que o link do Drive já esteja com permissão pública antes de enviar.

### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição.

---

## Cenário 5: Feedback & Retorno (retorno-dieta)

**Webhook:** `POST /api/webhooks/retorno-dieta`
**Trigger Make:** nova resposta no Google Form "JH - Feedback & Retorno"

### Payload esperado

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

### Ordem das perguntas (mapear no Make)

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

### Como configurar no Make

Em "Make an HTTP request":

- **URL:** `https://plataforma-jh-team-web-joaoherkerplataforma-bits-projects.vercel.app/api/webhooks/retorno-dieta`
- **Method:** POST
- **Headers:** `Authorization: Bearer ${WEBHOOK_SECRET}`
- **Body type:** JSON
- **Body:** monte o JSON com `nome_completo` (campo 2 do Form) e `respostas` como array. Cada item tem `pergunta` (texto literal da pergunta acima) e `resposta` (valor capturado pelo Make do Google Forms).

Exemplo do array (no formato da expressão Make):

- Item 1: pergunta = "E-mail", resposta = `{{1.email}}`
- Item 2: pergunta = "Qual seu nome completo?", resposta = `{{1.nome_completo}}`
- Item 3: pergunta = "Você saberia me relatar seu peso em jejum?", resposta = `{{1.peso_jejum}}`
- ... (etc, seguindo a ordem das 19 perguntas acima)

### Validação defensiva no webhook

Se o array `respostas` chegar malformado (não-array, ou itens sem `pergunta`/`resposta` como string), o webhook **loga um warning e ignora o campo** — não bloqueia a requisição. Isso evita quebrar o fluxo se o Make mandar algo errado durante a configuração.
