import type { QueryClient } from '@tanstack/react-query'
import type { TipoEntidadArchivo } from '@/types'

/**
 * Query keys jerárquicas — la invalidación por prefijo cubre todas las variantes
 * con filtros. Base de la sincronización 360.
 */
export const qk = {
  inicio: ['inicio'] as const,
  prospeccion: ['prospeccion'] as const,
  empresas: ['empresas'] as const,
  empresa: (id: number) => ['empresa', id] as const,
  empresaEventos: (id: number) => ['empresa', id, 'eventos'] as const,
  contactos: ['contactos'] as const,
  contacto: (id: number) => ['contacto', id] as const,
  oportunidades: ['oportunidades'] as const,
  oportunidad: (id: number) => ['oportunidad', id] as const,
  oportunidadLog: (id: number) => ['oportunidad', id, 'log'] as const,
  oportunidadEventos: (id: number) => ['oportunidad', id, 'eventos'] as const,
  tareas: ['tareas'] as const,
  empleados: ['empleados'] as const,
  financiadoras: ['financiadoras'] as const,
  modelos: ['modelos'] as const,
  catalogoEventos: ['catalogo-eventos'] as const,
  reportes: ['reportes'] as const,
  notificaciones: ['notificaciones'] as const,
  notificacionesNoLeidasCount: ['notificaciones', 'no-leidas', 'count'] as const,
  solicitudes: ['solicitudes'] as const,
  solicitud: (id: number) => ['solicitud', id] as const,
  metasVenta: ['metas-venta'] as const,
  archivos: (tipo: TipoEntidadArchivo, id: number) => ['archivos', tipo, id] as const,
}

export function invalidar(qc: QueryClient, ...keys: readonly (readonly unknown[])[]): void {
  for (const key of keys) {
    void qc.invalidateQueries({ queryKey: [...key] })
  }
}
