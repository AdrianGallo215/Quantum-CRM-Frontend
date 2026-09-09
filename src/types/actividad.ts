import type { EmpleadoResumen } from './empleado'

/**
 * Resumen de empresa que devuelve el módulo de actividades (informe §8).
 *
 * Es un tipo NUEVO: `types/empresa.ts` no exporta ningún `EmpresaResumen` —
 * tiene `EmpresaListItem` y `Empresa`, ambos mucho más anchos. No los reutilices
 * aquí: el backend solo manda estos tres campos y declarar de más haría que el
 * compilador acepte accesos a propiedades que llegan `undefined` en runtime.
 */
export interface EmpresaResumen {
  id: number
  razon_social: string
  distrito: string | null
}

/**
 * Discriminante de todo el módulo. Va en la URL de 3 de los 4 endpoints, en
 * minúscula y singular; cualquier otro valor devuelve 400 (informe §2).
 *
 * OJO: `types/contacto.ts` exporta `TipoActividadContacto`, que ADEMÁS incluye
 * `'nota'`. Son tipos distintos y no intercambiables — no importes ese aquí.
 */
export type TipoActividad = 'tarea' | 'evento'

/** Una fila del historial unificado (informe §3). */
export interface Actividad {
  tipo: TipoActividad
  id: number
  /** `tipo_accion` si es tarea; nombre del evento si es evento. Ya viene legible. */
  titulo: string
  descripcion: string | null
  /**
   * `estado_accion` de la tarea o `estado` del evento. Es `string` a propósito:
   * son DOS enums distintos del backend y unificarlos en un union type mentiría
   * sobre los valores posibles.
   */
  estado: string
  /**
   * Instant ISO 8601 (columna TIMESTAMP: `fecha_ejecucion` de tarea /
   * `fecha_ocurrencia` de evento). Puede ser null en eventos que aún no ocurrieron.
   */
  fecha_hora: string | null
  /**
   * Fecha calendario "YYYY-MM-DD" (columna DATE: `fecha_estimada`, solo eventos).
   * Para tareas es SIEMPRE null.
   *
   * ⚠ Campo separado de `fecha_hora` POR DISEÑO (informe §3, WARNING). No los
   * unifiques ni lo pases por `new Date()`: usa `formatoFechaDia` de
   * `utils/actividades.ts`.
   */
  fecha_dia: string | null
  id_empresa: number | null
  /** null si el backend no pudo resolverla. */
  empresa: EmpresaResumen | null
  /** null en tareas de prospección. */
  id_oportunidad: number | null
  /** `id_asignado` de la tarea o `created_by` del evento. */
  id_empleado: number | null
  /** null si el backend no pudo resolverlo. */
  empleado: EmpleadoResumen | null
  /** CONTEO de comentarios de seguimiento, no la lista. La lista se pide aparte. */
  comentarios: number
  created_at: string
}

/**
 * Query params de `GET /actividades` (informe §3).
 *
 * `id_empleado` es OBLIGATORIO — no lo hagas opcional "por comodidad": sin él el
 * backend responde 400 y la pantalla no tiene forma de recuperarse.
 *
 * `desde`/`hasta` filtran por `created_at` (cuándo se CREÓ la actividad), NO por
 * la fecha planificada. La etiqueta en la UI tiene que decirlo.
 */
export interface ActividadesFiltros {
  id_empleado: number
  /** Instant ISO 8601. */
  desde?: string
  /** Instant ISO 8601. */
  hasta?: string
  tipo?: TipoActividad
  id_empresa?: number
  id_oportunidad?: number
  /** 1-based. Default del backend: 1. */
  page?: number
  /** Default del backend: 20. Máximo: 100. */
  per_page?: number
}

/** Un comentario de seguimiento (informe §4). Append-only: no hay editar ni borrar. */
export interface ComentarioActividad {
  id: number
  tipo: TipoActividad
  /** id de la tarea o evento al que pertenece. */
  id_actividad: number
  texto: string
  created_at: string
  created_by: number
  autor: EmpleadoResumen | null
}

/**
 * Body de `POST /actividades/{tipo}/{id}/comentarios` (informe §5).
 * `created_by` NO va aquí: lo toma el backend del token.
 */
export interface CrearComentarioInput {
  /** 1–5000 caracteres. El backend aplica trim(). */
  texto: string
}

/** Una entrada de auditoría: el cambio de UN campo (informe §6). */
export interface CambioAuditoria {
  id: number
  /** Nombre del campo en snake_case, tal como lo expone el contrato de API. */
  campo: string
  /**
   * SIEMPRE String o null, incluso para fechas y para IDs. No lo tipes como
   * number ni intentes parsearlo a Date sin saber de qué campo viene.
   */
  valor_anterior: string | null
  valor_nuevo: string | null
  changed_at: string
  changed_by: number
  autor: EmpleadoResumen | null
}
