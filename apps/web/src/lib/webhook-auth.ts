import { NextRequest } from 'next/server'

export function verificarWebhookToken(request: NextRequest): boolean {
  const auth = request.headers.get('authorization')
  const token = process.env.WEBHOOK_SECRET
  if (!token) return false
  return auth === `Bearer ${token}`
}
