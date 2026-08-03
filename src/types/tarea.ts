import type { EstadoAccion, TipoAccion } from './enums'
import type { EmpleadoResumen } from './empleado'

export interface Tarea {
  id: number
  id_empresa: number
  empresa: { id: number; razon_social: string }
  id_oportunidad: number | null
  id_contacto: number | null
  contacto: { id: number; nombres: string; apellidos: string } | null
  id_asignado: number
  asignado: EmpleadoResumen | null
  ids_colaboradores: number[]
  colaboradores: EmpleadoResumen[]
  tipo_accion: TipoAccion
  estado_accion: EstadoAccion
  descripcion: string
  fecha_ejecucion: string
  created_at: string
}

export interface TareasFiltros {
  id_empresa?: number
  id_oportunidad?: number
  estado_accion?: EstadoAccion
  id_asignado?: number
  solo_prospeccion?: boolean
  vencidas?: boolean
}

export interface CrearTareaInput {
  id_empresa: number
  id_oportunidad?: number | null
  id_contacto?: number | null
  id_asignado?: number | null
  ids_colaboradores?: number[]
  tipo_accion: TipoAccion
  descripcion: string
  fecha_ejecucion: string
}

export interface ActualizarTareaInput {
  tipo_accion?: TipoAccion
  descripcion?: string
  fecha_ejecucion?: string
  id_contacto?: number | null
  id_asignado?: number | null
  ids_colaboradores?: number[]
}
