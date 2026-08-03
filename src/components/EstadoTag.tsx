import { Tag } from 'antd'
import type { EstadoAccion, EstadoCartera, EstadoOportunidad } from '@/types'
import {
  ETIQUETA_CARTERA,
  ETIQUETA_ESTADO_ACCION,
  ETIQUETA_ETAPA,
} from '@/utils/etiquetas'

const estiloBase: React.CSSProperties = {
  borderRadius: 9999,
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  border: 'none',
  paddingInline: 10,
}

// Paleta semántica de DESIGN.md §9.5
const POSITIVO = { background: '#8ff0e8', color: '#006f69' }
const PENDIENTE = { background: '#3e5c9a', color: '#c8d7ff' }
const URGENTE = { background: '#ffdad6', color: '#93000a' }
const NEUTRAL = { background: '#e4e7ff', color: '#444750' }

export function EtapaTag({ etapa }: { etapa: EstadoOportunidad }) {
  const estilo =
    etapa === 'facturado' ? POSITIVO : etapa === 'cerrado' ? URGENTE : PENDIENTE
  return <Tag style={{ ...estiloBase, ...estilo }}>{ETIQUETA_ETAPA[etapa]}</Tag>
}

export function CarteraTag({ estado }: { estado: EstadoCartera }) {
  const estilo =
    estado === 'cliente'
      ? POSITIVO
      : estado === 'oportunidad_activa'
        ? PENDIENTE
        : estado === 'no_interesado' || estado === 'no_aplica'
          ? URGENTE
          : NEUTRAL
  return <Tag style={{ ...estiloBase, ...estilo }}>{ETIQUETA_CARTERA[estado]}</Tag>
}

export function AccionTag({ estado }: { estado: EstadoAccion }) {
  const estilo =
    estado === 'completada' ? POSITIVO : estado === 'cancelada' ? NEUTRAL : PENDIENTE
  return <Tag style={{ ...estiloBase, ...estilo }}>{ETIQUETA_ESTADO_ACCION[estado]}</Tag>
}

export function UrgenteTag({ children }: { children: React.ReactNode }) {
  return <Tag style={{ ...estiloBase, ...URGENTE }}>{children}</Tag>
}

export function PositivoTag({ children }: { children: React.ReactNode }) {
  return <Tag style={{ ...estiloBase, ...POSITIVO }}>{children}</Tag>
}

export function NeutralTag({ children }: { children: React.ReactNode }) {
  return <Tag style={{ ...estiloBase, ...NEUTRAL }}>{children}</Tag>
}
