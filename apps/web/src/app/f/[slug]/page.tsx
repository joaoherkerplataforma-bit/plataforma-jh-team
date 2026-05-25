import { createServiceClient } from '@/lib/supabase/service'
import type { CampoFormulario, Formulario } from '@/types/formulario-builder'
import { FormularioPublico } from '@/app/f/[slug]/formulario-publico'

export const dynamic = 'force-dynamic'

export default async function FormularioPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { slug } = await params
  const { t } = await searchParams

  const supabase = createServiceClient()
  const { data: formRow } = await supabase
    .from('formularios')
    .select('id, slug, titulo, descricao, acao, campos, ativo, share_token, created_at, updated_at')
    .eq('slug', slug)
    .single()

  const form = formRow as Formulario | null

  if (!form || !form.ativo) {
    return <Aviso titulo="Formulário indisponível" texto="Este formulário não está disponível no momento." />
  }

  if (!t || t !== form.share_token) {
    return (
      <Aviso
        titulo="Link inválido"
        texto="Confira se você abriu o link completo que recebeu. Se o problema continuar, peça um novo link."
      />
    )
  }

  const campos = (form.campos ?? []) as CampoFormulario[]

  return (
    <FormularioPublico
      slug={form.slug}
      titulo={form.titulo}
      descricao={form.descricao}
      campos={campos}
      token={t}
    />
  )
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center">
        <p className="font-serif text-[#F5F0E8] tracking-[0.25em] text-lg mb-6">JH TEAM</p>
        <h1 className="text-[#F5F0E8] text-xl font-semibold mb-2">{titulo}</h1>
        <p className="text-[#8A7A5A] text-sm leading-relaxed">{texto}</p>
      </div>
    </main>
  )
}
