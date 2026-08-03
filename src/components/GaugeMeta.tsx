import type { MetaPeriodo } from '@/types'

interface GaugeMetaProps {
  titulo: string
  periodo: MetaPeriodo
}

const CX = 90
const CY = 90
const RADIO = 70
const GROSOR = 14

/** Punto sobre el semicírculo superior: 0° = izquierda, 90° = arriba, 180° = derecha. */
function puntoEnArco(anguloGrados: number) {
  const rad = ((anguloGrados - 180) * Math.PI) / 180
  return { x: CX + RADIO * Math.cos(rad), y: CY + RADIO * Math.sin(rad) }
}

function arcoPath(anguloInicio: number, anguloFin: number) {
  const inicio = puntoEnArco(anguloInicio)
  const fin = puntoEnArco(anguloFin)
  const granArco = anguloFin - anguloInicio > 180 ? 1 : 0
  return `M ${inicio.x} ${inicio.y} A ${RADIO} ${RADIO} 0 ${granArco} 1 ${fin.x} ${fin.y}`
}

const TRACK_PATH = arcoPath(0, 180)

/**
 * Gauge tipo velocímetro (semicírculo). El arco se llena hasta 100% como
 * tope visual — sobre esa marca el color pasa a éxito (teal) y se agrega un
 * badge con el excedente, en vez de reescalar el arco (decisión D1).
 */
export function GaugeMeta({ titulo, periodo }: GaugeMetaProps) {
  const { tiene_meta, unidades_meta, unidades_logradas, porcentaje } = periodo
  const pct = tiene_meta ? (porcentaje ?? 0) : 0
  const pctVisible = Math.max(0, Math.min(pct, 100))
  const excedente = tiene_meta ? Math.max(0, pct - 100) : 0
  const enMeta = tiene_meta && pct >= 100
  const colorRelleno = !tiene_meta ? '#c4c6d1' : enMeta ? '#006a64' : '#244481'
  const anguloFin = 180 * (pctVisible / 100)
  const fillPath = pctVisible > 0 ? arcoPath(0, anguloFin) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 160 }}>
      <svg viewBox="0 0 180 100" width="100%" style={{ maxWidth: 180 }}>
        <path d={TRACK_PATH} fill="none" stroke="#e4e7ff" strokeWidth={GROSOR} strokeLinecap="round" />
        {fillPath && (
          <path d={fillPath} fill="none" stroke={colorRelleno} strokeWidth={GROSOR} strokeLinecap="round" />
        )}
        <text x={CX} y={CY - 12} textAnchor="middle" fontSize={22} fontWeight={700} fill={colorRelleno}>
          {tiene_meta ? `${porcentaje}%` : '—'}
        </text>
      </svg>
      {excedente > 0 && (
        <span style={{ fontSize: 11, fontWeight: 600, color: '#006a64', marginTop: -8 }}>
          +{excedente}% sobre la meta
        </span>
      )}
      <span className="eyebrow" style={{ marginTop: 4 }}>
        {titulo}
      </span>
      <span style={{ fontSize: 12, color: '#747781' }}>
        {tiene_meta
          ? `${unidades_logradas} / ${unidades_meta} unidades`
          : `${unidades_logradas} unidades · sin meta asignada`}
      </span>
    </div>
  )
}
