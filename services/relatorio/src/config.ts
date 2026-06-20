// =============================================================
// Configuração do serviço de relatório diário
// Lê variáveis de ambiente (Railway injeta em produção; dotenv local)
// =============================================================

export interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  recipient: string
  apiVersion: string
}

export interface Config {
  supabaseUrl: string
  supabaseServiceKey: string
  timezone: string
  cronSchedule: string
  // WhatsApp é opcional: sem ele, o relatório é apenas logado (útil para teste)
  whatsapp: WhatsAppConfig | null
}

function env(nome: string): string | undefined {
  const v = process.env[nome]
  return v && v.trim() !== '' ? v.trim() : undefined
}

/**
 * Monta a configuração a partir do ambiente.
 * Lança erro se as credenciais do Supabase (obrigatórias) estiverem ausentes.
 * As credenciais do WhatsApp são opcionais — sem elas, o serviço entra em
 * modo "somente log" (não falha), o que permite validar o relatório sem o canal.
 */
export function carregarConfig(): Config {
  const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL') ?? env('SUPABASE_URL')
  const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Variáveis obrigatórias ausentes: NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) ' +
        'e SUPABASE_SERVICE_ROLE_KEY precisam estar definidas.'
    )
  }

  // WhatsApp Business API (Meta Cloud API). Todas as 3 chaves precisam estar
  // presentes para ativar o envio; caso contrário, fica null (modo log).
  const phoneNumberId = env('WHATSAPP_PHONE_NUMBER_ID')
  const accessToken = env('WHATSAPP_ACCESS_TOKEN')
  const recipient = env('WHATSAPP_RECIPIENT')
  const apiVersion = env('WHATSAPP_API_VERSION') ?? 'v21.0'

  const whatsapp: WhatsAppConfig | null =
    phoneNumberId && accessToken && recipient
      ? { phoneNumberId, accessToken, recipient, apiVersion }
      : null

  return {
    supabaseUrl,
    supabaseServiceKey,
    timezone: env('REPORT_TIMEZONE') ?? 'America/Sao_Paulo',
    // 08:00 todos os dias no fuso configurado (relatório diário do João)
    cronSchedule: env('REPORT_CRON') ?? '0 8 * * *',
    whatsapp,
  }
}
