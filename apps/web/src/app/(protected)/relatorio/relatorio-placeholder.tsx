'use client'

import { Construction, TrendingDown, Target, PieChart } from 'lucide-react'

const SECOES = [
  {
    titulo: 'Cancelados / Churn',
    descricao: 'Taxa de cancelamento e clientes perdidos',
    icone: TrendingDown,
  },
  {
    titulo: 'Leads / Fechamento',
    descricao: 'Taxa de conversao de leads para clientes',
    icone: Target,
  },
  {
    titulo: 'Origem dos Clientes',
    descricao: 'Grafico de pizza: Instagram, TikTok, YouTube, Indicacao',
    icone: PieChart,
  },
]

export function RelatorioPlaceholder() {
  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-[#8A7A5A] text-xs uppercase tracking-wider font-semibold">
        Proximas secoes
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SECOES.map((s) => {
          const Icone = s.icone
          return (
            <div
              key={s.titulo}
              className="bg-[#0A0A0A] border-2 border-dashed border-[#2A2209] rounded-xl px-5 py-6"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#1A1500] shrink-0">
                  <Icone size={20} className="text-[#C9A84C]/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#F5F0E8]/80 text-sm font-semibold mb-1">
                    {s.titulo}
                  </h3>
                  <p className="text-[#8A7A5A] text-xs leading-relaxed mb-3">
                    {s.descricao}
                  </p>
                  <div className="flex items-center gap-2 text-[#8A7A5A]/70">
                    <Construction size={12} />
                    <span className="text-[10px] uppercase tracking-wider">
                      Em construcao — disponivel em breve
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
