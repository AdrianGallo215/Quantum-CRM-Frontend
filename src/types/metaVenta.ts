import type { EmpleadoResumen } from './empleado'
import type { PaginationParams } from './common'

export type EstadoMeta = 'propuesta' | 'aprobada' | 'rechazada'

export type MesMeta =
  | 'meta_enero'
  | 'meta_febrero'
  | 'meta_marzo'
  | 'meta_abril'
  | 'meta_mayo'
  | 'meta_junio'
  | 'meta_julio'
  | 'meta_agosto'
  | 'meta_septiembre'
  | 'meta_octubre'
  | 'meta_noviembre'
  | 'meta_diciembre'

/** Los 12 meses en orden — base de iteración para formularios y diffs de PATCH. */
export const MESES_META: MesMeta[] = [
  'meta_enero',
  'meta_febrero',
  'meta_marzo',
  'meta_abril',
  'meta_mayo',
  'meta_junio',
  'meta_julio',
  'meta_agosto',
  'meta_septiembre',
  'meta_octubre',
  'meta_noviembre',
  'meta_diciembre',
]

export type MetaVenta = {
  id: number
  id_empleado: number
  empleado: EmpleadoResumen
  anio: number
  meta_anual: number
  estado: EstadoMeta
  propuesto_por: EmpleadoResumen
  resolutor: EmpleadoResumen | null
  motivo_rechazo: string | null
  resolved_at: string | null
  created_at: string
} & Record<MesMeta, number>

/** POST siempre manda los 12 meses juntos + id_empleado + anio. meta_anual NUNCA se envía. */
export type CrearMetaVentaInput = {
  id_empleado: number
  anio: number
} & Record<MesMeta, number>

/** PATCH manda solo el subconjunto de meses que cambian. */
export type EditarMetaVentaInput = Partial<Record<MesMeta, number>>

export interface MetaVentaFiltros extends PaginationParams {
  id_empleado?: number
  anio?: number
  estado?: EstadoMeta
}
