/**
 * Utilitarios de data para webhooks e logica de negocio.
 * Todas as funcoes trabalham com formato YYYY-MM-DD.
 */

export function hoje(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

export function addDias(data: string, dias: number): string {
  const date = new Date(data + 'T00:00:00')
  date.setDate(date.getDate() + dias)
  return date.toISOString().split('T')[0]
}

export function addMeses(data: string, meses: number): string {
  const date = new Date(data + 'T00:00:00')
  date.setMonth(date.getMonth() + meses)
  return date.toISOString().split('T')[0]
}
