import type { Aplicacion, EstadoOportunidad } from './enums'

export interface Financiadora {
  id: number
  nombre: string
  monto_por_unidad: string | null
  plazo_meses: number | null
  tea: string | null
  cuota_por_unidad: string | null
  es_default: boolean
  notas: string | null
}

export interface FinanciadoraInput {
  nombre: string
  monto_por_unidad?: string | null
  plazo_meses?: number | null
  tea?: string | null
  cuota_por_unidad?: string | null
  es_default?: boolean
  notas?: string | null
}

export interface Modelo {
  id: number
  codigo: string
  longitud: string | null
  capacidad_tanques: string | null
  max_asientos: number | null
  precio_base: string
  ficha_tecnica: string | null
  aplicaciones: Aplicacion[]
}

export interface ModeloInput {
  codigo: string
  longitud?: string | null
  capacidad_tanques?: string | null
  max_asientos?: number | null
  precio_base: string
  ficha_tecnica?: string | null
  aplicaciones: Aplicacion[]
}

export interface CatalogoEvento {
  id: number
  nombre: string
  etapa_asociada: EstadoOportunidad | null
  dispara_cambio_estado: boolean
  estado_destino: EstadoOportunidad | null
  es_recomendado: boolean
  es_hito_prospeccion: boolean
}

export interface CatalogoEventoInput {
  nombre: string
  etapa_asociada?: EstadoOportunidad | null
  dispara_cambio_estado?: boolean
  estado_destino?: EstadoOportunidad | null
  es_recomendado?: boolean
  es_hito_prospeccion?: boolean
}
