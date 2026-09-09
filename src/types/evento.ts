import type { EstadoEvento, EstadoOportunidad } from './enums'

export interface Evento {
  id: number
  id_catalogo_evento?: number | null
  nombre: string
  es_personalizado: boolean
  descripcion: string | null
  estado: EstadoEvento
  fecha_estimada: string | null
  fecha_seguimiento: string | null
  fecha_ocurrencia: string | null
  dispara_cambio_estado: boolean
  estado_destino: EstadoOportunidad | null
  es_recomendado?: boolean
  /** Pendiente en backend — ver docs/solicitud-backend-eventos-empresa.md */
  es_hito_prospeccion?: boolean
  etapa_asociada?: EstadoOportunidad | null
  /**
   * Añadidos por el backend en el PR #16 (informe §12). Son ADITIVOS: los
   * endpoints existentes que devuelven EventoDto ahora los incluyen.
   *
   * Opcionales a propósito (D12): el repo construye objetos `Evento` en tests y
   * en código que no los traen. Declararlos obligatorios rompería el type-check
   * en archivos que esta tarea no toca.
   */
  created_by?: number
  created_at?: string
}

export interface EventosDeOportunidad {
  pendientes: Evento[]
  ocurridos: Evento[]
  descartados: Evento[]
}

/** Mismo shape que EventosDeOportunidad; se reutiliza para eventos a nivel empresa (sin oportunidad). */
export type EventosAgrupados = EventosDeOportunidad

export interface CrearEventoCatalogoInput {
  id_catalogo_evento: number
  fecha_estimada?: string | null
  fecha_seguimiento?: string | null
  descripcion?: string | null
}

export interface CrearEventoPersonalizadoInput {
  es_personalizado: true
  nombre_personalizado: string
  fecha_estimada?: string | null
  fecha_seguimiento?: string | null
  descripcion?: string | null
}

export type CrearEventoInput = CrearEventoCatalogoInput | CrearEventoPersonalizadoInput

/** PUT /eventos/:id — solo eventos con estado 'pendiente'. Todos los campos opcionales. */
export interface ActualizarEventoInput {
  fecha_estimada?: string | null
  fecha_seguimiento?: string | null
  descripcion?: string | null
}

export interface SugerenciaCambioEstado {
  dispara: boolean
  estado_destino: EstadoOportunidad
  mensaje: string
}

export interface MarcarOcurridoResponse {
  id: number
  estado: EstadoEvento
  fecha_ocurrencia: string
  sugerencia: SugerenciaCambioEstado | null
}
