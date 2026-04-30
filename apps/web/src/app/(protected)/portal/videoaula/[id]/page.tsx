import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  gerarSignedUrl,
  listarProgressoAluno,
  listarVideoaulasAtivas,
} from '@/lib/videoaulas'
import { podeAcessarVideoaula } from '@/lib/portal-gating'
import type { PerfilAcesso } from '@/types/auth'
import type { Videoaula } from '@/types/videoaulas'
import { Player } from '@/app/(protected)/portal/videoaula/[id]/player'
import { ContaSendoConfigurada } from '@/app/(protected)/portal/conta-sendo-configurada'

const PERFIS_EQUIPE: readonly PerfilAcesso[] = [
  'joao_admin',
  'pablo',
  'joao_estagiario',
] as const

const SIGNED_URL_TTL_SEG = 3600

export default async function VideoaulaPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Defesa em profundidade — middleware ja protege esta rota.
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('perfil')
    .eq('id', user.id)
    .single()

  const perfil = (usuario?.perfil ?? 'aluno') as PerfilAcesso
  const equipeEmPreview = PERFIS_EQUIPE.includes(perfil)

  // Modo preview (equipe): pula gating, busca videoaula direto, gera signed URL.
  if (equipeEmPreview) {
    const { data: videoaulaEquipe } = await supabase
      .from('videoaulas')
      .select('*')
      .eq('id', id)
      .eq('ativo', true)
      .maybeSingle()

    if (!videoaulaEquipe) {
      redirect('/portal')
    }

    const signedUrl = await gerarSignedUrl(
      videoaulaEquipe.storage_path,
      SIGNED_URL_TTL_SEG,
    )

    return (
      <Player
        videoaula={videoaulaEquipe as Videoaula}
        signedUrl={signedUrl}
        jaAssistida={false}
        modoPreview={true}
      />
    )
  }

  // Aluno: precisa de paciente vinculado.
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id')
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!paciente) {
    return <ContaSendoConfigurada />
  }

  // Gating server-side: deep-link em videoaula bloqueada redireciona.
  const [videoaulasAtivas, progresso] = await Promise.all([
    listarVideoaulasAtivas(),
    listarProgressoAluno(user.id),
  ])

  if (!podeAcessarVideoaula(id, videoaulasAtivas, progresso)) {
    redirect('/portal')
  }

  // Encontra a videoaula no array ja carregado (evita query extra).
  const videoaula = videoaulasAtivas.find((v) => v.id === id)
  if (!videoaula) {
    // Defensivo: podeAcessarVideoaula ja deveria ter pegado isso.
    redirect('/portal')
  }

  const jaAssistida = progresso.some((p) => p.videoaula_id === id)
  const signedUrl = await gerarSignedUrl(
    videoaula.storage_path,
    SIGNED_URL_TTL_SEG,
  )

  return (
    <Player
      videoaula={videoaula}
      signedUrl={signedUrl}
      jaAssistida={jaAssistida}
      modoPreview={false}
    />
  )
}
