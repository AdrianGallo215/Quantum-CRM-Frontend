import type { EstadoOportunidad } from './enums'

export interface ContactoEmpresaRef {
  id: number
  razon_social: string
  cargo: string | null
}

export interface Contacto {
  id: number
  nombres: string
  apellidos: string
  email_1: string | null
  email_2?: string | null
  tlf_1: string | null
  tlf_2?: string | null
  notas?: string | null
  empresas?: ContactoEmpresaRef[]
}

/** Item de la tabla /contactos: incluye conteo de oportunidades para la columna correspondiente */
export interface ContactoListItem extends Contacto {
  oportunidades_count: number
}

export interface ContactosFiltros {
  q?: string
  page?: number
  per_page?: number
}

/** Empresa relacionada en el detalle de contacto, con datos de la vinculación y sector */
export interface ContactoEmpresaDetalle extends ContactoEmpresaRef {
  toma_decision: boolean
  es_principal: boolean
  segmentos: string[]
}

export interface ContactoOportunidadRef {
  id: number
  empresa: { id: number; razon_social: string }
  modelo: { id: number; codigo: string }
  estado: EstadoOportunidad
  monto_total: string
  fecha_cierre_estimado: string | null
  rol_en_oportunidad: string | null
}

export type TipoActividadContacto = 'tarea' | 'evento' | 'nota'

export interface ContactoActividad {
  id: number
  tipo: TipoActividadContacto
  /** Para tipo 'tarea': valor crudo de TipoAccion (p. ej. "llamada"), no un título libre — mapear con ETIQUETA_TIPO_ACCION */
  titulo: string
  descripcion: string | null
  fecha: string
  estado: string | null
}

export interface ContactoDetalle extends Contacto {
  empresas: ContactoEmpresaDetalle[]
  oportunidades: ContactoOportunidadRef[]
  actividades: ContactoActividad[]
}

export interface CrearContactoInput {
  nombres: string
  apellidos: string
  email_1?: string | null
  email_2?: string | null
  tlf_1?: string | null
  tlf_2?: string | null
  notas?: string | null
  id_empresa: number
  cargo?: string | null
  toma_decision: boolean
  es_principal: boolean
}

export interface VincularContactoInput {
  id_contacto: number
  cargo?: string | null
  toma_decision: boolean
  es_principal: boolean
}
