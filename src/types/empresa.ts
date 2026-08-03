import type { EstadoCartera } from './enums'
import type { EmpleadoResumen } from './empleado'

export interface ContactoEnEmpresa {
  id: number
  nombres: string
  apellidos: string
  cargo: string | null
  toma_decision: boolean
  es_principal: boolean
  email_1: string | null
  tlf_1: string | null
}

export interface EmpresaListItem {
  id: number
  ruc: string
  razon_social: string
  estado_sunat: string | null
  condicion_sunat: string | null
  estado_cartera: EstadoCartera
  distrito: string | null
  id_vendedor: number | null
  vendedor: EmpleadoResumen | null
  segmentos: string[]
  contactos_count: number
  en_cartera_maestra: boolean
}

export interface Empresa {
  id: number
  ruc: string
  razon_social: string
  actividad_econ: string | null
  ciiu: string | null
  sector_industrial: string | null
  estado_sunat: string | null
  condicion_sunat: string | null
  direccion_fiscal: string | null
  ubicacion_real: string | null
  distrito: string | null
  provincia: string | null
  departamento: string | null
  aval_fiador: string | null
  origen_lead: string | null
  estado_cartera: EstadoCartera
  file_drive: string | null
  /** ID de la carpeta de Drive de la empresa. null en registros previos a la migración Headless Storage. */
  drive_folder_id: string | null
  sitio_web: string | null
  notas: string | null
  id_vendedor: number | null
  vendedor: EmpleadoResumen | null
  segmentos: string[]
  contactos: ContactoEnEmpresa[]
  created_at: string
  created_by: number
  en_cartera_maestra: boolean
}

export interface EmpresasFiltros {
  q?: string
  estado_cartera?: EstadoCartera
  id_vendedor?: number
  segmento?: string
  distrito?: string
  page?: number
  per_page?: number
  cartera_maestra?: boolean
}

/** Input de PATCH /empresas/:id/cartera-maestra (contrato §4.6) */
export interface CarteraMaestraInput {
  en_cartera_maestra: boolean
  /** Obligatorio al liberar (en_cartera_maestra: false) */
  id_vendedor?: number
}

export interface CrearEmpresaInput {
  ruc: string
  razon_social: string
  actividad_econ?: string | null
  ciiu?: string | null
  sector_industrial?: string | null
  estado_sunat?: string | null
  condicion_sunat?: string | null
  direccion_fiscal?: string | null
  ubicacion_real?: string | null
  distrito?: string | null
  provincia?: string | null
  departamento?: string | null
  aval_fiador?: string | null
  origen_lead?: string | null
  file_drive?: string | null
  sitio_web?: string | null
  notas?: string | null
  segmentos: string[]
  id_vendedor?: number | null
}

export type ActualizarEmpresaInput = Partial<CrearEmpresaInput>

export interface CheckRucResponse {
  existe: boolean
  mensaje?: string
}
