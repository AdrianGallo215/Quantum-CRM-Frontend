import type { EmpleadoResumen } from './empleado'
import type { PaginationParams } from './common'

export type TipoSolicitud = 'descuento' | 'reasignacion_cliente'
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'denegada'
/**
 * Contrato §26. `oportunidad_item` es el valor que usa `tipo: 'descuento'` desde
 * V42 — el descuento vive en el ítem, no en la oportunidad. `oportunidad` queda
 * como valor legado del enum: el backend lo sigue devolviendo en solicitudes
 * viejas, pero ya no lo acepta al crear un descuento.
 */
export type EntidadSolicitud = 'oportunidad' | 'empresa' | 'oportunidad_item'
export type RolAprobador = 'jdv' | 'gerencia'

export interface Solicitud {
  id: number
  tipo: TipoSolicitud
  estado: EstadoSolicitud
  rol_aprobador: RolAprobador
  entidad_tipo: EntidadSolicitud
  entidad_id: number
  entidad_descripcion: string
  dcto_solicitado: string | null
  id_vendedor_nuevo: number | null
  vendedor_nuevo: EmpleadoResumen | null
  motivo: string
  solicitante: EmpleadoResumen
  resolutor: EmpleadoResumen | null
  motivo_resolucion: string | null
  resolved_at: string | null
  created_at: string
}

export interface CrearSolicitudDescuentoInput {
  tipo: 'descuento'
  /**
   * Debe ser `oportunidad_item` (contrato §20, nota V42): cualquier otro valor
   * en una solicitud de descuento responde `400 VALIDACION`.
   */
  entidad_tipo: 'oportunidad_item'
  /** `id` del **ítem**, no el de la oportunidad (contrato §20). */
  entidad_id: number
  /** String con 2 decimales, igual que el resto de montos del contrato: "5.00" */
  dcto_solicitado: string
  motivo: string
}

export interface CrearSolicitudReasignacionInput {
  tipo: 'reasignacion_cliente'
  entidad_tipo: 'empresa'
  entidad_id: number
  id_vendedor_nuevo: number
  motivo: string
}

export type CrearSolicitudInput =
  | CrearSolicitudDescuentoInput
  | CrearSolicitudReasignacionInput

export interface SolicitudesFiltros extends PaginationParams {
  estado?: EstadoSolicitud
  tipo?: TipoSolicitud
  /** true fuerza "solo las que yo creé" (útil para jdv) */
  mias?: boolean
}
