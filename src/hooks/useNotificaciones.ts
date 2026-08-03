import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificacionesApi } from '@/api/notificaciones'
import { useAuthStore } from '@/store/authStore'
import { invalidar, qk } from './queryKeys'

const INTERVALO_POLLING_MS = 45_000

export function useNotificacionesNoLeidasCount() {
  const empleado = useAuthStore((s) => s.empleado)
  return useQuery({
    queryKey: qk.notificacionesNoLeidasCount,
    queryFn: () => notificacionesApi.contarNoLeidas(),
    enabled: empleado !== null,
    refetchInterval: INTERVALO_POLLING_MS,
  })
}

export function useNotificaciones(enabled: boolean) {
  return useQuery({
    queryKey: qk.notificaciones,
    queryFn: () => notificacionesApi.listar(),
    enabled,
  })
}

function invalidarNotificaciones(qc: ReturnType<typeof useQueryClient>) {
  invalidar(qc, qk.notificaciones, qk.notificacionesNoLeidasCount)
}

export function useMarcarNotificacionLeida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificacionesApi.marcarLeida(id),
    onSuccess: () => invalidarNotificaciones(qc),
  })
}

export function useMarcarTodasNotificacionesLeidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificacionesApi.marcarTodasLeidas(),
    onSuccess: () => invalidarNotificaciones(qc),
  })
}
