import { useQuery } from '@tanstack/react-query'
import { inicioApi } from '@/api/inicio'
import { prospeccionApi } from '@/api/prospeccion'
import { reportesApi } from '@/api/reportes'
import type { ReporteFiltros } from '@/types'
import { qk } from './queryKeys'

export function useInicio() {
  return useQuery({ queryKey: qk.inicio, queryFn: inicioApi.obtener })
}

/** `page` forma parte de la queryKey: sin eso, cambiar de página servía el cache de la anterior. */
export function useProspeccion(page = 1) {
  return useQuery({
    queryKey: [...qk.prospeccion, { page }],
    queryFn: () => prospeccionApi.listar({ page }),
  })
}

export function useReporteVentas(f: ReporteFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.reportes, 'ventas', f],
    queryFn: () => reportesApi.ventas(f),
    enabled,
  })
}

export function useReportePipeline(enabled = true) {
  return useQuery({
    queryKey: [...qk.reportes, 'pipeline'],
    queryFn: () => reportesApi.pipeline(),
    enabled,
  })
}

export function useReporteEquipo(f: ReporteFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.reportes, 'equipo', f],
    queryFn: () => reportesApi.equipo(f),
    enabled,
  })
}

export function useReporteVelocidad(enabled = true) {
  return useQuery({
    queryKey: [...qk.reportes, 'velocidad-etapas'],
    queryFn: () => reportesApi.velocidadEtapas(),
    enabled,
  })
}

export function useReporteProspeccion(f: ReporteFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.reportes, 'prospeccion', f],
    queryFn: () => reportesApi.prospeccion(f),
    enabled,
  })
}

export function useReporteDescuentos(f: ReporteFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.reportes, 'descuentos', f],
    queryFn: () => reportesApi.descuentos(f),
    enabled,
  })
}
