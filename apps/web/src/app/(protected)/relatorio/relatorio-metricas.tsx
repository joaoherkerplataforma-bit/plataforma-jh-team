'use client'

import { Users, Activity, XCircle, Ban, UserPlus, Clock } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface RelatorioMetricasProps {
  totalPacientes: number
  totalAtivos: number
  totalVencidos: number
  totalCancelados: number
  novos7dias: number
  novos30dias: number
  tempoMedioDias: number | null
  distribuicaoPorPlano: Array<{ label: string; total: number }>
}

interface TooltipPayload {
  value: number
  payload: { label: string; total: number }
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayload[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  return (
    <div className="bg-[#111111] border border-[#2A2209] rounded-md px-3 py-2 shadow-lg">
      <p className="text-[#F5F0E8] text-xs">{item.payload.label}</p>
      <p className="text-[#C9A84C] text-sm font-semibold">{item.value} pacientes</p>
    </div>
  )
}

export function RelatorioMetricas({
  totalPacientes,
  totalAtivos,
  totalVencidos,
  totalCancelados,
  novos7dias,
  novos30dias,
  tempoMedioDias,
  distribuicaoPorPlano,
}: RelatorioMetricasProps) {
  const cards = [
    {
      label: 'Total de Clientes',
      valor: totalPacientes,
      icone: Users,
      bgIcone: 'bg-[#1A1500]',
      corValor: 'text-[#F5F0E8]',
    },
    {
      label: 'Ativos',
      valor: totalAtivos,
      icone: Activity,
      bgIcone: 'bg-green-900/30',
      corValor: 'text-[#F5F0E8]',
    },
    {
      label: 'Vencidos',
      valor: totalVencidos,
      icone: XCircle,
      bgIcone: 'bg-red-900/30',
      corValor: 'text-red-400',
    },
    {
      label: 'Cancelados',
      valor: totalCancelados,
      icone: Ban,
      bgIcone: 'bg-zinc-800',
      corValor: 'text-[#8A7A5A]',
    },
    {
      label: 'Novos (7 dias)',
      valor: novos7dias,
      icone: UserPlus,
      bgIcone: 'bg-[#1A1500]',
      corValor: 'text-[#C9A84C]',
    },
    {
      label: 'Novos (30 dias)',
      valor: novos30dias,
      icone: UserPlus,
      bgIcone: 'bg-[#1A1500]',
      corValor: 'text-[#C9A84C]',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Cards de metricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icone = c.icone
          return (
            <div
              key={c.label}
              className="bg-[#111111] border border-[#2A2209] rounded-xl px-5 py-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${c.bgIcone}`}>
                  <Icone size={18} className="text-[#C9A84C]" />
                </div>
                <p className="text-[#8A7A5A] text-xs uppercase tracking-wider">
                  {c.label}
                </p>
              </div>
              <p className={`text-3xl font-bold ${c.corValor}`}>{c.valor}</p>
            </div>
          )
        })}

        {/* Tempo medio */}
        <div className="bg-[#111111] border border-[#2A2209] rounded-xl px-5 py-4 col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#1A1500]">
              <Clock size={18} className="text-[#C9A84C]" />
            </div>
            <p className="text-[#8A7A5A] text-xs uppercase tracking-wider">
              Tempo Medio de Permanencia
            </p>
          </div>
          <p className="text-3xl font-bold text-[#F5F0E8]">
            {tempoMedioDias !== null ? `${tempoMedioDias} dias` : '—'}
          </p>
        </div>
      </div>

      {/* Grafico distribuicao por plano */}
      <div className="bg-[#111111] border border-[#2A2209] rounded-xl px-5 py-5">
        <h2 className="text-[#F5F0E8] text-sm font-semibold uppercase tracking-wider mb-4">
          Distribuicao por Plano
        </h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart
              data={distribuicaoPorPlano}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2209" horizontal={false} />
              <XAxis
                type="number"
                stroke="#8A7A5A"
                tick={{ fill: '#8A7A5A', fontSize: 12 }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#8A7A5A"
                tick={{ fill: '#8A7A5A', fontSize: 12 }}
                width={160}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: '#1A1500' }}
              />
              <Bar dataKey="total" fill="#C9A84C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
