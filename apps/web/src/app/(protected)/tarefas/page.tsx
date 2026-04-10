export default function TarefasPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-[0.2em] text-[#C9A84C]">
          Tarefas
        </h1>
        <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
      </div>
      <p className="text-gray-400 dark:text-white/20 text-xs mt-4">
        Modulos B, C e D em desenvolvimento
      </p>
    </div>
  )
}
