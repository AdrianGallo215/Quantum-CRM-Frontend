import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  valor: ReactNode
  sublabel?: ReactNode
  acento?: 'primario' | 'positivo' | 'negativo' | 'neutro'
}

const COLOR_ACENTO: Record<NonNullable<MetricCardProps['acento']>, string> = {
  primario: '#244481',
  positivo: '#006a64',
  negativo: '#ba1a1a',
  neutro: '#0e193e',
}

/** Metric Card según DESIGN.md §9.3 */
export function MetricCard({ label, valor, sublabel, acento = 'neutro' }: MetricCardProps) {
  return (
    <div
      className="bento-card"
      style={{
        height: 128,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <span className="eyebrow">{label}</span>
      <span
        className="metric-value"
        style={{ fontSize: 30, fontWeight: 700, color: COLOR_ACENTO[acento], lineHeight: 1.1 }}
      >
        {valor}
      </span>
      <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{sublabel ?? ' '}</span>
    </div>
  )
}
