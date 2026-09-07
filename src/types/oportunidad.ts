import type { EstadoOportunidad } from './enums'
import type { EmpleadoResumen } from './empleado'
import type { Financiadora, ModeloRef } from './catalogos'

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

/**
 * Un modelo vendido dentro de una oportunidad (V42 — `oportunidad_items`).
 * Antes estos campos vivían en la raíz de la oportunidad; el backend los movió acá
 * el 2026-09-03 porque una oportunidad puede vender varios modelos a la vez.
 * Contrato §10.
 */
export interface OportunidadItem {
  id: number
  id_modelo: number
  modelo: ModeloRef
  cantidad: number
  precio_venta: string
  descuento: string
  /**
   * Lo que el cliente paga a terceros (Calidda, cajas) por unidad y por mes.
   * Editable por el vendedor, default 937.50. El CRM detalla la operación de
   * Quantum, no la de terceros (`reglas_simulaciones.md` §1.2).
   */
  cuota_financiadora: string
  /**
   * Cuota mensual del financiamiento de Quantum para UNA unidad de este modelo.
   * `null` es degradación esperada (ítem incompleto o precio incompatible con los
   * parámetros por defecto), NUNCA un error — no dispares un toast por esto.
   * Siempre `null` en las respuestas de POST/PUT de ítem: esos endpoints no la
   * resuelven. Si la necesitas, repide la oportunidad (contrato §10).
   */
  cuota_quantum: string | null
  /**
   * `cuota_quantum + cuota_financiadora`, para UNA unidad de este modelo.
   * OJO: no confundir con `Oportunidad.cuota_total`, que es el total mensual de
   * toda la operación ya multiplicado por cantidades.
   */
  cuota_total: string | null
  monto_item: string
  advertencias: string[]
}

export interface Oportunidad {
  id: number
  id_empresa: number
  empresa: EmpresaRef
  id_vendedor: number
  vendedor: EmpleadoResumen
  id_financiadora: number | null
  financiadora: Financiadora | null
  estado: EstadoOportunidad
  items: OportunidadItem[]
  monto_total: string
  /**
   * Σ (cuota_quantum × cantidad) de todos los ítems.
   * Los TRES campos de cuota de este nivel son `null` CONJUNTAMENTE si cualquier
   * ítem no tiene cuota calculable. Se muestra como "todavía no se puede calcular",
   * jamás como cero ni como un guion que parezca un monto (contrato §10).
   */
  cuota_quantum_total: string | null
  /** Σ (cuota_total_item × cantidad). Total mensual de TODA la operación. */
  cuota_total: string | null
  /** `cuota_total / 22`. */
  cuota_diaria_total: string | null
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
  descuento?: number
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

/** Body de `PUT /oportunidades/:id/items/:item_id`. Todos opcionales (contrato §10). */
export interface ActualizarItemInput {
  id_modelo?: number
  cantidad?: number
  precio_venta?: string
  descuento?: string
  cuota_financiadora?: string
}
