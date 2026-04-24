'use client'

import { Lock } from 'lucide-react'

interface BlocoProps {
  titulo: string
  descricao: string
}

function Bloco({ titulo, descricao }: BlocoProps) {
  return (
    <div className="bg-[#0D0D0D] border border-dashed border-[#2A2209] rounded-xl p-5">
      <h4 className="text-sm font-medium text-[#F5F0E8] mb-2">{titulo}</h4>
      <div className="flex items-start gap-2 text-[#8A7A5A] text-sm">
        <Lock size={14} className="mt-0.5 flex-shrink-0" />
        <p>{descricao}</p>
      </div>
    </div>
  )
}

export function AnaliseIaPlaceholder() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-[#F5F0E8] tracking-wide">
          Análise IA
        </h2>
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30">
          Em breve
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Bloco
          titulo="Como chegou"
          descricao="Em construção — dados da anamnese alimentados pelo formulário de anamnese via Make."
        />
        <Bloco
          titulo="Como está evoluindo"
          descricao="Em construção — feedbacks de 30 dias do paciente."
        />
        <Bloco
          titulo="Resumo executivo"
          descricao="Em construção — síntese IA para o João."
        />
      </div>
    </section>
  )
}
