import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oportunidadesApi } from '@/api/oportunidades'
import type {
  ActualizarOportunidadInput,
  CambioEstadoInput,
  CrearOportunidadInput,
  OportunidadesFiltros,
} from '@/types'
import { invalidar, qk } from './queryKeys'

/**
 * `enabled` sigue el patrón de `useTareas`/`useEmpleados`: permite montar el
 * hook antes de saber por qué empresa se filtra, sin disparar mientras tanto una
 * consulta de todas las oportunidades del CRM.
 */
export function useOportunidades(filtros?: OportunidadesFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.oportunidades, filtros ?? {}],
    queryFn: () => oportunidadesApi.listar(filtros),
    enabled,
  })
}

export function useOportunidad(id: number) {
  return useQuery({
    queryKey: qk.oportunidad(id),
    queryFn: () => oportunidadesApi.obtener(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useOportunidadLog(id: number) {
  return useQuery({
    queryKey: qk.oportunidadLog(id),
    queryFn: () => oportunidadesApi.log(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/**
 * Sincronización 360: una oportunidad toca pipeline, inicio, cartera
 * (estado_cartera derivado), prospección y reportes.
 */
function invalidarOportunidad(qc: ReturnType<typeof useQueryClient>, id?: number) {
  invalidar(qc, qk.oportunidades, qk.inicio, qk.empresas, qk.prospeccion, qk.reportes, qk.tareas)
  if (id) {
    invalidar(qc, qk.oportunidad(id), qk.oportunidadLog(id), qk.oportunidadEventos(id))
  }
}

export function useCrearOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearOportunidadInput) => oportunidadesApi.crear(input),
    onSuccess: (data) => {
      invalidarOportunidad(qc, data.id)
      invalidar(qc, qk.empresa(data.id_empresa))
    },
  })
}

export function useActualizarOportunidad(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ActualizarOportunidadInput) => oportunidadesApi.actualizar(id, input),
    onSuccess: (data) => {
      invalidarOportunidad(qc, id)
      invalidar(qc, qk.empresa(data.id_empresa))
    },
  })
}

export function useCambiarEstadoOportunidad(id: number, idEmpresa?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CambioEstadoInput) => oportunidadesApi.cambiarEstado(id, input),
    onSuccess: () => {
      invalidarOportunidad(qc, id)
      if (idEmpresa) invalidar(qc, qk.empresa(idEmpresa))
    },
  })
}

export function useTraspasarOportunidad(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idVendedor: number) => oportunidadesApi.traspasar(id, idVendedor),
    onSuccess: () => invalidarOportunidad(qc, id),
  })
}

/**
 * Vincular/desvincular toca las DOS puntas de la relación: la oportunidad
 * (`OportunidadDetalle.contactos`) y el contacto (`ContactoDetalle.oportunidades`).
 * Antes solo se invalidaba la oportunidad, así que la ficha del contacto seguía
 * listando una oportunidad de la que ya no formaba parte.
 */
export function useVincularContactoOportunidad(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id_contacto: number; rol_en_oportunidad: string }) =>
      oportunidadesApi.vincularContacto(id, input),
    onSuccess: () => invalidar(qc, qk.oportunidad(id), qk.contactos),
  })
}

export function useDesvincularContactoOportunidad(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idContacto: number) => oportunidadesApi.desvincularContacto(id, idContacto),
    onSuccess: () => invalidar(qc, qk.oportunidad(id), qk.contactos),
  })
}

/**
 * Elimina la oportunidad (solo admin, backend rechaza con 403 al resto).
 * Sin restricción por estado: el botón nunca se deshabilita por etapa, a diferencia
 * de otras acciones del pipeline (p.ej. confirmar Facturado).
 */
export function useEliminarOportunidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: number; idEmpresa?: number }) =>
      oportunidadesApi.eliminar(variables.id),
    onSuccess: (_data, variables) => {
      qc.removeQueries({ queryKey: qk.oportunidad(variables.id) })
      invalidarOportunidad(qc, variables.id)
      if (variables.idEmpresa) invalidar(qc, qk.empresa(variables.idEmpresa))
    },
  })
}
