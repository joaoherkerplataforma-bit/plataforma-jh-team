import { Sparkles, Apple, Dumbbell, ExternalLink } from 'lucide-react'
import type { Paciente } from '@/types/pacientes'
import type { FormularioRecebido } from '@/types/formularios'
import type { ProtocoloAtivo } from '@/lib/protocolos'
import {
  TIPO_PLANO_LABELS,
  TEMPO_PLANO_LABELS,
} from '@/types/pacientes'
import { formatarData } from '@/lib/pacientes'
import { FormulariosSection } from '@/app/(protected)/pacientes/[id]/formularios-section'

const URL_WEBDIET_GENERICA = 'https://webdiet.com.br'
const URL_MFIT_GENERICA = 'https://mfitpersonal.com.br'

interface AreaPersonalizadaProps {
  paciente: Paciente
  protocolo: ProtocoloAtivo | null
  formularios: FormularioRecebido[]
}

function diasRestantesPlano(dataVencimento: string): number {
  const hoje = new Date()
  const hojeZerado = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  )
  const venc = new Date(dataVencimento + 'T00:00:00')
  return Math.ceil((venc.getTime() - hojeZerado.getTime()) / 86_400_000)
}

function corDiasRestantes(dias: number): string {
  if (dias < 0) return 'text-white/50'
  if (dias < 7) return 'text-red-400'
  if (dias <= 30) return 'text-yellow-400'
  return 'text-[#C9A84C]'
}

function rotuloDiasRestantes(dias: number): string {
  if (dias < 0) return `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`
  if (dias === 0) return 'Vence hoje'
  if (dias === 1) return 'Resta 1 dia'
  return `Restam ${dias} dias`
}

export function AreaPersonalizada({
  paciente,
  protocolo,
  formularios,
}: AreaPersonalizadaProps) {
  const linkDieta =
    (protocolo?.link_webdiet?.trim() || '') || URL_WEBDIET_GENERICA
  const linkTreino =
    (protocolo?.link_mfit?.trim() || '') || URL_MFIT_GENERICA

  const tipoPlano = paciente.tipo_plano
  const mostraTreino = tipoPlano === 'completo'

  const dias = diasRestantesPlano(paciente.data_vencimento_plano)
  const corDias = corDiasRestantes(dias)
  const rotuloDias = rotuloDiasRestantes(dias)

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1A1500] border border-[#C9A84C]/40">
          <Sparkles size={18} className="text-[#C9A84C]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-serif text-[#C9A84C] tracking-wide">
          Sua Área Personalizada
        </h2>
      </header>

      {/* Cards principais: Dieta e Treino */}
      <div
        className={`grid grid-cols-1 ${mostraTreino ? 'sm:grid-cols-2' : ''} gap-4`}
      >
        <CardAcesso
          icone={<Apple size={22} className="text-[#C9A84C]" />}
          titulo="Minha Dieta"
          descricao="Acesse seu plano alimentar atualizado no WebDiet."
          url={linkDieta}
          rotuloBotao="Acessar dieta"
        />
        {mostraTreino && (
          <CardAcesso
            icone={<Dumbbell size={22} className="text-[#C9A84C]" />}
            titulo="Meu Treino"
            descricao="Acesse seu programa de treino no MFit Personal."
            url={linkTreino}
            rotuloBotao="Acessar treino"
          />
        )}
      </div>

      {/* Card do plano */}
      <section className="bg-[#111111] border border-[#2A2209] rounded-xl p-5 sm:p-6">
        <h3 className="text-xs uppercase tracking-wider text-[#C9A84C] font-medium mb-4">
          Seu plano
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoLinha rotulo="Nome" valor={paciente.nome} />
          <InfoLinha
            rotulo="Plano"
            valor={`${TIPO_PLANO_LABELS[paciente.tipo_plano]} · ${TEMPO_PLANO_LABELS[paciente.duracao_plano]}`}
          />
          <InfoLinha
            rotulo="Início"
            valor={formatarData(paciente.data_inicio)}
          />
          <InfoLinha
            rotulo="Vencimento"
            valor={formatarData(paciente.data_vencimento_plano)}
          />
          <div className="sm:col-span-2">
            <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
              Dias restantes
            </p>
            <p className={`text-base font-medium ${corDias}`}>
              {rotuloDias}
            </p>
          </div>
        </div>
      </section>

      {/* Historico de formularios */}
      {formularios.length > 0 ? (
        <FormulariosSection
          formularios={formularios}
          tipoPlano={paciente.tipo_plano}
        />
      ) : (
        <section className="bg-[#111111] border border-[#2A2209] rounded-xl p-5 sm:p-6">
          <h3 className="text-xs uppercase tracking-wider text-[#C9A84C] font-medium mb-2">
            Histórico de formulários
          </h3>
          <p className="text-sm text-[#8A7A5A]">
            Você ainda não respondeu nenhum formulário. Quando responder, eles
            aparecerão aqui.
          </p>
        </section>
      )}
    </div>
  )
}

interface CardAcessoProps {
  icone: React.ReactNode
  titulo: string
  descricao: string
  url: string
  rotuloBotao: string
}

function CardAcesso({
  icone,
  titulo,
  descricao,
  url,
  rotuloBotao,
}: CardAcessoProps) {
  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-xl p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1A1500] border border-[#C9A84C]/40">
          {icone}
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-[#F5F0E8] tracking-wide">
          {titulo}
        </h3>
      </div>
      <p className="text-sm text-[#8A7A5A] leading-relaxed">{descricao}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30 hover:bg-[#C9A84C]/25 transition-colors"
      >
        {rotuloBotao}
        <ExternalLink size={14} />
      </a>
    </div>
  )
}

interface InfoLinhaProps {
  rotulo: string
  valor: string
}

function InfoLinha({ rotulo, valor }: InfoLinhaProps) {
  return (
    <div>
      <p className="text-[#8A7A5A] text-xs uppercase tracking-wider mb-1">
        {rotulo}
      </p>
      <p className="text-[#F5F0E8] text-sm">{valor}</p>
    </div>
  )
}
