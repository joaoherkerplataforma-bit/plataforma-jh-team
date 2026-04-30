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
import { buscarProtocoloAtivo } from '@/lib/protocolos'
import type { PerfilAcesso } from '@/types/auth'
import type { Paciente } from '@/types/pacientes'
import type { FormularioRecebido } from '@/types/formularios'
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

  // Resolve o paciente alvo:
  // - aluno: busca pelo usuario_id (RLS protege)
  // - equipe em preview: pega o primeiro paciente disponivel apenas para
  //   permitir visualizar a tela; nao expoe nada novo (equipe ja le tudo).
  let paciente: Paciente | null = null

  if (equipeEmPreview) {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    paciente = (data as Paciente | null) ?? null
  } else {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('usuario_id', user.id)
      .maybeSingle()
    paciente = (data as Paciente | null) ?? null

    // Edge case: usuário aluno sem `pacientes.usuario_id` apontando para ele.
    if (!paciente) {
      return <ContaSendoConfigurada />
    }
  }

  // Busca em paralelo: videoaulas, progresso, protocolo ativo, formularios.
  // Quando equipeEmPreview e nao houver paciente cadastrado, pular a parte
  // dependente de paciente.
  const [videoaulasAtivas, progresso, protocolo, formulariosData] =
    await Promise.all([
      listarVideoaulasAtivas(),
      listarProgressoAluno(user.id),
      paciente
        ? buscarProtocoloAtivo(supabase, paciente.id)
        : Promise.resolve(null),
      paciente
        ? supabase
            .from('formularios_recebidos')
            .select('id, paciente_id, tipo_formulario, dados_raw, criado_em')
            .eq('paciente_id', paciente.id)
            .order('criado_em', { ascending: true })
            .then((res) => res.data ?? [])
        : Promise.resolve([]),
    ])

  const formularios = (formulariosData ?? []) as FormularioRecebido[]

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
      paciente={paciente}
      protocolo={protocolo}
      formularios={formularios}
    />
  )
}
