import { Mail } from 'lucide-react'

export function ContaSendoConfigurada() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-center space-y-4 max-w-lg">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1A1500] border border-[#C9A84C]/40">
          <Mail size={24} className="text-[#F5F0E8]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif text-[#F5F0E8] tracking-wide">
          Sua conta está sendo configurada
        </h1>
        <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
        <p className="text-[#8A7A5A] text-sm sm:text-base leading-relaxed">
          Estamos finalizando o seu cadastro no portal. Aguarde o contato do
          João para iniciar o seu acompanhamento.
        </p>
      </div>
    </div>
  )
}
