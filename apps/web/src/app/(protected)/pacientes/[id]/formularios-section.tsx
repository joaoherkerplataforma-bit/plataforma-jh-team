import type { FormularioRecebido } from '@/types/formularios'
import { montarCardsDoCiclo } from '@/lib/formularios'
import { FormularioCard } from '@/app/(protected)/pacientes/[id]/formulario-card'

interface FormulariosSectionProps {
  formularios: FormularioRecebido[]
  tipoPlano: 'dieta' | 'completo'
}

export function FormulariosSection({
  formularios,
  tipoPlano,
}: FormulariosSectionProps) {
  const cards = montarCardsDoCiclo(formularios, tipoPlano)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[#F5F0E8] tracking-wide">
        Formulários
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <FormularioCard
            key={`${card.tipo}-${card.cicloNumero ?? 0}-${idx}`}
            card={card}
          />
        ))}
      </div>
    </section>
  )
}
