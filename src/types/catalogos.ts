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

/**
 * Modelo embebido dentro de `OportunidadItem` (contrato §10): el backend solo
 * manda `id`, `codigo` y `precio_base` ahí, no el `Modelo` completo. Antes de
 * B8 (auditoría T7.1) `OportunidadItem.modelo` tipaba como `Modelo` completo,
 * así que `it.modelo.ficha_tecnica` compilaba y devolvía `undefined` en
 * runtime — el tipo no impedía leer campos que el DTO nunca manda. Para la
 * ficha del bus, resolver el registro completo por `id_modelo` en el catálogo.
 */
export interface ModeloRef {
  id: number
  codigo: string
  precio_base: string
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
