import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventosApi } from '@/api/eventos'
import { tareasApi } from '@/api/tareas'
import type {
  ActualizarEventoInput,
  ActualizarTareaInput,
  CrearEventoInput,
  CrearTareaInput,
  TareasFiltros,
} from '@/types'
import { invalidar, qk } from './queryKeys'

// ── Eventos ────────────────────────────────────────────────

export function useEventosDeOportunidad(idOportunidad: number) {
  return useQuery({
    queryKey: qk.oportunidadEventos(idOportunidad),
    queryFn: () => eventosApi.deOportunidad(idOportunidad),
    enabled: Number.isFinite(idOportunidad) && idOportunidad > 0,
  })
}

function invalidarEventos(qc: ReturnType<typeof useQueryClient>, idOportunidad: number) {
  invalidar(
    qc,
    qk.oportunidadEventos(idOportunidad),
    qk.oportunidad(idOportunidad),
    qk.oportunidades,
    qk.inicio,
    qk.prospeccion,
  )
}

export function useCrearEvento(idOportunidad: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearEventoInput) => eventosApi.crear(idOportunidad, input),
    onSuccess: () => invalidarEventos(qc, idOportunidad),
  })
}

export function useMarcarEventoOcurrido(idOportunidad: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idEvento, descripcion }: { idEvento: number; descripcion?: string | null }) =>
      eventosApi.marcarOcurrido(idEvento, { descripcion }),
    onSuccess: () => invalidarEventos(qc, idOportunidad),
  })
}

export function useMarcarEventoDescartado(idOportunidad: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idEvento, descripcion }: { idEvento: number; descripcion?: string }) =>
      eventosApi.marcarDescartado(idEvento, descripcion),
    onSuccess: () => invalidarEventos(qc, idOportunidad),
  })
}

export function useActualizarEvento(idOportunidad: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idEvento, input }: { idEvento: number; input: ActualizarEventoInput }) =>
      eventosApi.actualizar(idEvento, input),
    onSuccess: () => invalidarEventos(qc, idOportunidad),
  })
}

// ── Eventos de empresa (sin oportunidad) ────────────────────
// Pendiente en backend — ver docs/solicitud-backend-eventos-empresa.md

export function useEventosDeEmpresa(idEmpresa: number) {
  return useQuery({
    queryKey: qk.empresaEventos(idEmpresa),
    queryFn: () => eventosApi.deEmpresa(idEmpresa),
    enabled: Number.isFinite(idEmpresa) && idEmpresa > 0,
  })
}

function invalidarEventosEmpresa(qc: ReturnType<typeof useQueryClient>, idEmpresa: number) {
  invalidar(qc, qk.empresaEventos(idEmpresa), qk.empresa(idEmpresa), qk.prospeccion, qk.inicio)
}

export function useCrearEventoEmpresa(idEmpresa: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearEventoInput) => eventosApi.crearEnEmpresa(idEmpresa, input),
    onSuccess: () => invalidarEventosEmpresa(qc, idEmpresa),
  })
}

export function useMarcarEventoEmpresaOcurrido(idEmpresa: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idEvento, descripcion }: { idEvento: number; descripcion?: string | null }) =>
      eventosApi.marcarOcurrido(idEvento, { descripcion }),
    onSuccess: () => invalidarEventosEmpresa(qc, idEmpresa),
  })
}

export function useMarcarEventoEmpresaDescartado(idEmpresa: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idEvento, descripcion }: { idEvento: number; descripcion?: string }) =>
      eventosApi.marcarDescartado(idEvento, descripcion),
    onSuccess: () => invalidarEventosEmpresa(qc, idEmpresa),
  })
}

export function useActualizarEventoEmpresa(idEmpresa: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ idEvento, input }: { idEvento: number; input: ActualizarEventoInput }) =>
      eventosApi.actualizar(idEvento, input),
    onSuccess: () => invalidarEventosEmpresa(qc, idEmpresa),
  })
}

// ── Tareas ─────────────────────────────────────────────────

export function useTareas(filtros?: TareasFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.tareas, filtros ?? {}],
    queryFn: () => tareasApi.listar(filtros),
    enabled,
  })
}

function invalidarTareas(qc: ReturnType<typeof useQueryClient>, idOportunidad?: number | null) {
  invalidar(qc, qk.tareas, qk.inicio, qk.prospeccion, qk.oportunidades)
  if (idOportunidad) invalidar(qc, qk.oportunidad(idOportunidad))
}

export function useCrearTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearTareaInput) => tareasApi.crear(input),
    onSuccess: (_d, variables) => invalidarTareas(qc, variables.id_oportunidad),
  })
}

export function useCompletarTarea(idOportunidad?: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, descripcion }: { id: number; descripcion?: string | null }) =>
      tareasApi.completar(id, descripcion),
    onSuccess: () => invalidarTareas(qc, idOportunidad),
  })
}

export function useCancelarTarea(idOportunidad?: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tareasApi.cancelar(id),
    onSuccess: () => invalidarTareas(qc, idOportunidad),
  })
}

export function useActualizarTarea(idOportunidad?: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ActualizarTareaInput }) =>
      tareasApi.actualizar(id, input),
    onSuccess: () => invalidarTareas(qc, idOportunidad),
  })
}
