import { Sparkles } from 'lucide-react'

export function AreaPersonalizadaPlaceholder() {
  return (
    <section className="bg-[#111111] border border-[#2A2209] rounded-xl p-8 sm:p-12">
      <div className="flex flex-col items-center text-center gap-4 max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1500] border border-[#C9A84C]/40">
          <Sparkles size={20} className="text-[#C9A84C]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-serif text-[#C9A84C] tracking-wide">
          Sua Área Personalizada
        </h2>
        <p className="text-[#8A7A5A] text-sm leading-relaxed">
          Conteúdo personalizado disponível em breve. Aqui você terá acesso à
          sua dieta, treino e histórico de protocolos.
        </p>
      </div>
    </section>
  )
}
