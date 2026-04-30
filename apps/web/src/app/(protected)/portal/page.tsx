import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  listarProgressoAluno,
  listarVideoaulasAtivas,
} from '@/lib/videoaulas'
import {
  calcularDesbloqueio,
  podeAcessarAreaPersonalizada,
} from '@/lib/portal-gating'
import type { PerfilAcesso } from '@/types/auth'
import { PortalContent } from '@/app/(protected)/portal/portal-content'
import { ContaSendoConfigurada } from '@/app/(protected)/portal/conta-sendo-configurada'

const PERFIS_EQUIPE: readonly PerfilAcesso[] = [
  'joao_admin',
  'pablo',
  'joao_estagiario',
] as const

export default async function PortalPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Defesa em profundidade — middleware já protege esta rota.
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  const perfil = (usuario?.perfil ?? 'aluno') as PerfilAcesso
  const equipeEmPreview = PERFIS_EQUIPE.includes(perfil)

  // Edge case: usuário aluno sem `pacientes.usuario_id` apontando para ele.
  // Equipe em preview não precisa de paciente vinculado — apenas visualiza.
  if (!equipeEmPreview) {
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('usuario_id', user.id)
      .maybeSingle()

    if (!paciente) {
      return <ContaSendoConfigurada />
    }
  }

  const [videoaulasAtivas, progresso] = await Promise.all([
    listarVideoaulasAtivas(),
    listarProgressoAluno(user.id),
  ])

  const videoaulasComProgresso = calcularDesbloqueio(
    videoaulasAtivas,
    progresso,
  )
  const acessoLiberado = podeAcessarAreaPersonalizada(
    progresso,
    videoaulasAtivas,
  )

  return (
    <PortalContent
      videoaulasComProgresso={videoaulasComProgresso}
      acessoLiberado={acessoLiberado}
      modoPreview={equipeEmPreview}
    />
  )
}
