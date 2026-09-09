import type { QueryClient } from '@tanstack/react-query'
import type { TipoActividad, TipoEntidadArchivo } from '@/types'

/**
 * Query keys jerárquicas — la invalidación por prefijo cubre todas las variantes
 * con filtros. Base de la sincronización 360.
 *
 * INVARIANTE: la key de un detalle SIEMPRE empieza por la key de su lista
 * (`['empresas','detalle',id]`, no `['empresa',id]`). Solo así `invalidar(qc,
 * qk.empresas)` alcanza también a las fichas abiertas. Romper esta forma
 * reintroduce datos viejos en pantalla sin que falle ningún tipo ni ningún build;
 * `queryKeys.test.ts` la verifica.
 */
export const qk = {
  inicio: ['inicio'] as const,
  prospeccion: ['prospeccion'] as const,
  empresas: ['empresas'] as const,
  empresa: (id: number) => ['empresas', 'detalle', id] as const,
  empresaEventos: (id: number) => ['empresas', 'detalle', id, 'eventos'] as const,
  contactos: ['contactos'] as const,
  contacto: (id: number) => ['contactos', 'detalle', id] as const,
  oportunidades: ['oportunidades'] as const,
  oportunidad: (id: number) => ['oportunidades', 'detalle', id] as const,
  oportunidadLog: (id: number) => ['oportunidades', 'detalle', id, 'log'] as const,
  oportunidadEventos: (id: number) => ['oportunidades', 'detalle', id, 'eventos'] as const,
  tareas: ['tareas'] as const,
  /**
   * Módulo de actividades (historial unificado + comentarios + auditoría).
   * Sigue el invariante de arriba: comentarios y auditoría cuelgan del árbol
   * `actividades`, así que `invalidar(qc, qk.actividades)` los arrastra a los dos.
   *
   * El `tipo` va DENTRO de la key, antes del id: los IDs de tareas y de eventos
   * son secuencias independientes y sin el discriminante la tarea 42 y el evento
   * 42 compartirían entrada de cache.
   */
  actividades: ['actividades'] as const,
  actividadComentarios: (tipo: TipoActividad, id: number) =>
    ['actividades', 'detalle', tipo, id, 'comentarios'] as const,
  actividadAuditoria: (tipo: TipoActividad, id: number) =>
    ['actividades', 'detalle', tipo, id, 'auditoria'] as const,
  empleados: ['empleados'] as const,
  financiadoras: ['financiadoras'] as const,
  modelos: ['modelos'] as const,
  catalogoEventos: ['catalogo-eventos'] as const,
  reportes: ['reportes'] as const,
  notificaciones: ['notificaciones'] as const,
  notificacionesNoLeidasCount: ['notificaciones', 'no-leidas', 'count'] as const,
  solicitudes: ['solicitudes'] as const,
  solicitud: (id: number) => ['solicitudes', 'detalle', id] as const,
  metasVenta: ['metas-venta'] as const,
  archivos: (tipo: TipoEntidadArchivo, id: number) => ['archivos', tipo, id] as const,
  /**
   * Simulaciones (D17). Siguen el invariante de arriba: cronograma e historial
   * cuelgan del detalle, y el detalle de la lista. Por eso `invalidar(qc,
   * qk.simulaciones)` alcanza a TODAS las simulaciones abiertas y a sus
   * cronogramas — necesario porque marcar una como principal cambia el
   * `es_principal` de las demás del mismo item (K25, K26).
   */
  simulaciones: ['simulaciones'] as const,
  simulacion: (id: number) => ['simulaciones', 'detalle', id] as const,
  simulacionCronograma: (id: number) => ['simulaciones', 'detalle', id, 'cronograma'] as const,
  simulacionHistorial: (id: number) => ['simulaciones', 'detalle', id, 'historial'] as const,
  /**
   * Dato global sin recurso propio ni detalle: una sola fila diaria (§22).
   * No lo invalida ninguna mutacion del CRM — lo repuebla un job del backend.
   */
  tipoCambio: ['tipo-cambio'] as const,
}

export function invalidar(qc: QueryClient, ...keys: readonly (readonly unknown[])[]): void {
  for (const key of keys) {
    void qc.invalidateQueries({ queryKey: [...key] })
  }
}
