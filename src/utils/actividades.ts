import type { Actividad, TipoActividad } from '@/types'
import { formatoFechaHora } from './formato'

export const ETIQUETA_TIPO_ACTIVIDAD: Record<TipoActividad, string> = {
  tarea: 'Tarea',
  evento: 'Evento',
}

/** Ícono Material Symbols por tipo (informe §13.3). Única librería de íconos permitida. */
export const ICONO_TIPO_ACTIVIDAD: Record<TipoActividad, string> = {
  tarea: 'task_alt',
  evento: 'event',
}

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/**
 * Formatea una fecha CALENDARIO ("YYYY-MM-DD") sin pasar nunca por `Date`.
 *
 * ⚠ `new Date('2026-09-15')` se interpreta como medianoche UTC: en Lima (UTC-5)
 * eso muestra el 14 (informe §13.2, CAUTION). Por eso se parte el string a mano
 * en vez de usar dayjs o Date. No "simplifiques" esto.
 */
export function formatoFechaDia(fechaDia: string | null | undefined): string {
  if (!fechaDia) return '—'
  const partes = fechaDia.split('-')
  if (partes.length !== 3) return fechaDia
  const anio = partes[0] ?? ''
  const mes = Number(partes[1])
  const dia = partes[2] ?? ''
  const nombreMes = MESES_CORTOS[mes - 1]
  if (!nombreMes || anio === '' || dia === '') return fechaDia
  return `${dia} ${nombreMes} ${anio}`
}

/**
 * Fecha visible de una actividad (informe §13.2).
 *
 * `fecha_hora` es un Instant (TIMESTAMP) y `fecha_dia` una fecha calendario
 * (DATE). Son campos SEPARADOS por diseño y cada uno se formatea con su propia
 * función. Este helper elige cuál mostrar; NO los mezcla.
 */
export function fechaDisplayActividad(
  actividad: Pick<Actividad, 'fecha_hora' | 'fecha_dia'>,
): string {
  if (actividad.fecha_hora) return formatoFechaHora(actividad.fecha_hora)
  if (actividad.fecha_dia) return formatoFechaDia(actividad.fecha_dia)
  return 'Sin fecha'
}

const ETIQUETA_CAMPO_AUDITADO: Record<string, string> = {
  tipo_accion: 'Tipo de acción',
  descripcion: 'Descripción',
  fecha_ejecucion: 'Fecha de ejecución',
  id_contacto: 'Contacto',
  id_asignado: 'Responsable',
  fecha_estimada: 'Fecha estimada',
  fecha_seguimiento: 'Fecha de seguimiento',
}

/**
 * Nombre legible del campo auditado.
 *
 * `Record<string, string>` y NO un Record cerrado sobre un union: el backend
 * puede empezar a auditar un campo nuevo sin que este repo se entere, y una
 * pantalla de auditoría que revienta ante un campo desconocido es peor que una
 * que muestra el nombre crudo.
 */
export function etiquetaCampoAuditado(campo: string): string {
  // `replaceAll` no existe con `lib: ES2020` (ver tsconfig.json).
  return ETIQUETA_CAMPO_AUDITADO[campo] ?? campo.split('_').join(' ')
}

/**
 * Valor de auditoría listo para mostrar.
 *
 * `valor_anterior`/`valor_nuevo` SIEMPRE llegan como String o null (informe §6),
 * también para fechas y para IDs. El backend no manda el nombre del empleado ni
 * del contacto detrás de un id: por eso se muestra "ID 12" y no se inventa una
 * petición extra para resolverlo.
 */
export function valorAuditadoDisplay(campo: string, valor: string | null): string {
  if (valor === null || valor === '') return '(vacío)'
  if (campo === 'id_asignado' || campo === 'id_contacto') return `ID ${valor}`
  if (campo === 'fecha_ejecucion') return formatoFechaHora(valor)
  if (campo === 'fecha_estimada' || campo === 'fecha_seguimiento') return formatoFechaDia(valor)
  return valor
}
