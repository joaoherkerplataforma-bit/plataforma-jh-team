export default function Home() {
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-3">
        <h1 className="text-7xl font-bold tracking-[0.3em] text-[#C9A84C]">
          JH TEAM
        </h1>
        <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
        <p className="text-white/40 text-xs tracking-[0.2em] uppercase">
          João Herker Personal
        </p>
      </div>

      <div className="mt-8 text-white/20 text-xs">
        Plataforma em construção — ambiente de desenvolvimento ativo
      </div>
    </main>
  )
}
