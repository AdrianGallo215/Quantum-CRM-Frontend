import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { solicitudesApi } from '@/api/solicitudes'
import type { CrearSolicitudInput, Solicitud, SolicitudesFiltros } from '@/types'
import { invalidar, qk } from './queryKeys'

export function useSolicitudes(filtros?: SolicitudesFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.solicitudes, filtros ?? {}],
    queryFn: () => solicitudesApi.listar(filtros),
    enabled,
  })
}

export function useSolicitud(id: number | null) {
  return useQuery({
    queryKey: qk.solicitud(id ?? 0),
    queryFn: () => solicitudesApi.obtener(id as number),
    enabled: id !== null,
  })
}

export function useCrearSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearSolicitudInput) => solicitudesApi.crear(input),
    onSuccess: () => invalidar(qc, qk.solicitudes),
  })
}

/**
 * Sincronización 360: aprobar APLICA el cambio (dcto nuevo + monto_total
 * recalculado, o reasignación de empresa) en la misma transacción — hay que
 * invalidar la entidad afectada y todas las vistas que la muestran.
 */
function invalidarResolucion(qc: ReturnType<typeof useQueryClient>, s: Solicitud) {
  invalidar(qc, qk.solicitudes, qk.oportunidades, qk.empresas, qk.inicio, qk.prospeccion, qk.reportes)
  if (s.entidad_tipo === 'oportunidad') {
    invalidar(qc, qk.oportunidad(s.entidad_id), qk.oportunidadLog(s.entidad_id))
  } else {
    invalidar(qc, qk.empresa(s.entidad_id))
  }
}

export function useAprobarSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => solicitudesApi.aprobar(id),
    onSuccess: (s) => invalidarResolucion(qc, s),
    // 409 (ya resuelta) también deja la bandeja desactualizada → refrescar
    onError: () => invalidar(qc, qk.solicitudes),
  })
}

export function useDenegarSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      solicitudesApi.denegar(id, motivo),
    onSuccess: (s) => invalidarResolucion(qc, s),
    onError: () => invalidar(qc, qk.solicitudes),
  })
}
