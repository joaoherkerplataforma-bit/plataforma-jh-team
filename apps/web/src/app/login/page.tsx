'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { PerfilAcesso } from '@/types/auth'
import { PERFIL_ROUTES } from '@/types/auth'

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      setError('Email ou senha incorretos')
      setIsLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Erro ao obter dados do usuario')
      setIsLoading(false)
      return
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('perfil')
      .eq('id', user.id)
      .single()

    const perfil = usuario?.perfil as PerfilAcesso | undefined
    const redirectTo = perfil ? PERFIL_ROUTES[perfil] : '/dashboard'

    window.location.href = redirectTo
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo acima do card */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="font-serif text-5xl tracking-[0.35em] text-[#C9A84C]">
            JH TEAM
          </h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
        </div>

        {/* Card do formulario */}
        <div className="bg-[#111111] border border-[#2A2209] rounded-2xl p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm text-[#8A7A5A] tracking-wide"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2209] rounded-lg text-[#F5F0E8] placeholder-[#8A7A5A]/50 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm text-[#8A7A5A] tracking-wide"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2209] rounded-lg text-[#F5F0E8] placeholder-[#8A7A5A]/50 focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-colors"
                placeholder="••••••"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#C9A84C] hover:bg-[#E2BC6A] text-[#0A0A0A] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#8A7A5A]/40 text-xs mt-6">
          Joao Herker Personal
        </p>
      </div>
    </main>
  )
}
