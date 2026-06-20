import { redirect } from 'next/navigation'

// A raiz "/" não tem conteúdo próprio: manda direto para o login.
// Quem já estiver autenticado é redirecionado pelo middleware do /login
// para o painel do seu perfil (/relatorio ou /portal).
export default function Home() {
  redirect('/login')
}
