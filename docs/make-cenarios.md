# Cenários do Make

Documentação de como configurar cada cenário no Make para que os Google Forms cheguem aos webhooks da plataforma.

Todos os webhooks exigem o header:

```
Authorization: Bearer ${WEBHOOK_SECRET}
```

URL base de produção: `https://plataforma-jh-team-web-joaoherkerplataforma-bits-projects.vercel.app`

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
