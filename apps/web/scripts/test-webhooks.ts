/**
 * Script de teste para os 5 webhooks de integracao com Make.
 * Usage: npx tsx scripts/test-webhooks.ts
 */

const BASE_URL = 'http://localhost:3000'
const SECRET = process.env.WEBHOOK_SECRET || 'test-secret'

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SECRET}`,
}

async function testEndpoint(name: string, url: string, payload: unknown, customHeaders?: Record<string, string>) {
  console.log(`\n--- ${name} ---`)
  try {
    const res = await fetch(`${BASE_URL}${url}`, {
      method: 'POST',
      headers: customHeaders || headers,
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    console.log(`Status: ${res.status}`)
    console.log(`Response:`, JSON.stringify(body, null, 2))
  } catch (error) {
    console.error(`Erro:`, error instanceof Error ? error.message : error)
  }
}

async function main() {
  console.log('=== Teste de Webhooks Make ===')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Secret: ${SECRET.slice(0, 4)}...`)

  // Test 0: 401 Unauthorized (wrong token)
  await testEndpoint(
    'AUTH - Token invalido (deve retornar 401)',
    '/api/webhooks/anamnese',
    { nome_completo: 'Teste', email: 'teste@email.com', qual_plano: 'Dieta', tempo_plano: 'Trimestral' },
    { 'Content-Type': 'application/json', Authorization: 'Bearer token-errado' }
  )

  // Test 1: Anamnese (cria paciente + tarefa B)
  await testEndpoint('1. Anamnese - Paciente novo', '/api/webhooks/anamnese', {
    nome_completo: 'Maria Silva Teste',
    email: 'maria.teste@email.com',
    telefone: '11999998888',
    qual_plano: 'Completo',
    tempo_plano: 'Semestral',
  })

  // Test 2: Fotos iniciais
  await testEndpoint('2. Fotos Iniciais', '/api/webhooks/fotos-iniciais', {
    nome_completo: 'Maria Silva Teste',
    email: 'maria.teste@email.com',
  })

  // Test 3: Treino
  await testEndpoint('3. Treino', '/api/webhooks/treino', {
    nome_completo: 'Maria Silva Teste',
    email: 'maria.teste@email.com',
  })

  // Test 4: Fotos 30 dias (cria tarefa C)
  await testEndpoint('4. Fotos 30 Dias', '/api/webhooks/fotos-30-dias', {
    nome_completo: 'Maria Silva Teste',
  })

  // Test 5: Retorno dieta (cria tarefa D bloqueada)
  await testEndpoint('5. Retorno Dieta', '/api/webhooks/retorno-dieta', {
    nome_completo: 'Maria Silva Teste',
  })

  // Test 6: Anamnese duplicado (deve reusar paciente existente)
  await testEndpoint('6. Anamnese - Paciente existente (reutiliza)', '/api/webhooks/anamnese', {
    nome_completo: 'Maria Silva Teste',
    email: 'maria.teste@email.com',
    qual_plano: 'Dieta',
    tempo_plano: 'Trimestral',
  })

  // Test 7: Paciente nao encontrado
  await testEndpoint('7. Fotos Iniciais - Paciente inexistente (deve retornar 404)', '/api/webhooks/fotos-iniciais', {
    nome_completo: 'Ninguem Existe',
    email: 'ninguem@naoexiste.com',
  })

  // Test 8: Payload invalido
  await testEndpoint('8. Anamnese - Campos faltando (deve retornar 400)', '/api/webhooks/anamnese', {
    nome_completo: 'Teste Incompleto',
  })

  console.log('\n=== Testes concluidos ===')
}

main()
