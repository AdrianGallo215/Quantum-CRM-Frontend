import type { QueryClient } from '@tanstack/react-query'
import type { TipoEntidadArchivo } from '@/types'

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
}

export function invalidar(qc: QueryClient, ...keys: readonly (readonly unknown[])[]): void {
  for (const key of keys) {
    void qc.invalidateQueries({ queryKey: [...key] })
  }
}
