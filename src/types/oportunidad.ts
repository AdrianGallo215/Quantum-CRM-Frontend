import type { EstadoOportunidad } from './enums'
import type { EmpleadoResumen } from './empleado'
import type { Financiadora, Modelo } from './catalogos'

export interface EmpresaRef {
  id: number
  razon_social: string
  distrito?: string | null
}

export interface ContactoEnOportunidad {
  id: number
  nombres: string
  apellidos: string
  rol_en_oportunidad: string | null
}

export interface Oportunidad {
  id: number
  id_empresa: number
  empresa: EmpresaRef
  id_vendedor: number
  vendedor: EmpleadoResumen
  id_financiadora: number | null
  financiadora: Financiadora | null
  id_modelo: number
  modelo: Modelo
  estado: EstadoOportunidad
  cantidad: number
  precio_unitario: string
  dcto: string
  monto_total: string
  garantia: boolean
  finc_paralelo: boolean
  ficha_venta: string | null
  /** ID de la carpeta de Drive de la oportunidad. null en registros previos a la migración Headless Storage. */
  drive_folder_id: string | null
  notas: string | null
  motivo_cierre: string | null
  fecha_cierre_estimado: string | null
  tareas_pendientes_count: number
  eventos_pendientes_count: number
  created_at: string
}

export interface OportunidadDetalle extends Oportunidad {
  contactos: ContactoEnOportunidad[]
  entrada_etapa_actual: string | null
  advertencias?: string[]
}

export interface OportunidadesFiltros {
  estado?: EstadoOportunidad
  id_empresa?: number
  id_vendedor?: number
  id_financiadora?: number
  incluir_cerradas?: boolean
  page?: number
  per_page?: number
}

export interface CrearOportunidadInput {
  id_empresa: number
  id_modelo: number
  id_financiadora?: number | null
  cantidad: number
  dcto?: number
  garantia?: boolean
  finc_paralelo?: boolean
  ficha_venta?: string | null
  notas?: string | null
  fecha_cierre_estimado?: string | null
  contactos?: { id_contacto: number; rol_en_oportunidad: string }[]
  /** Solo cuando la empresa no tiene vendedor asignado (gerencia/admin/jdv). §3.3 */
  id_vendedor?: number
}

export interface ActualizarOportunidadInput {
  id_modelo?: number
  id_financiadora?: number
  cantidad?: number
  precio_unitario?: string
  dcto?: string
  garantia?: boolean
  finc_paralelo?: boolean
  ficha_venta?: string | null
  notas?: string | null
  fecha_cierre_estimado?: string | null
}

export interface CambioEstadoInput {
  estado: EstadoOportunidad
  motivo_cierre?: string | null
}

export interface CambioEstadoResponse {
  estado: EstadoOportunidad
  es_retroceso: boolean
  advertencias: string[]
}

export interface OportunidadLogEntry {
  estado_anterior: EstadoOportunidad | null
  estado_nuevo: EstadoOportunidad
  changed_at: string
  changed_by: EmpleadoResumen
}
