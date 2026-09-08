import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { simulacionesApi } from '@/api/simulaciones'
import type {
  ActualizarSimulacionInput,
  BifurcarSimulacionInput,
  CrearSimulacionInput,
  SimulacionesFiltros,
} from '@/types'
import { invalidar, qk } from './queryKeys'

/** Un id de router todavía sin resolver no debe disparar `/simulaciones/NaN`. */
function idValido(id: number): boolean {
  return Number.isFinite(id) && id > 0
}

export function useSimulacionesListado(filtros?: SimulacionesFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.simulaciones, filtros ?? {}],
    queryFn: () => simulacionesApi.listar(filtros),
    enabled,
  })
}

export function useSimulacion(id: number) {
  return useQuery({
    queryKey: qk.simulacion(id),
    queryFn: () => simulacionesApi.obtener(id),
    enabled: idValido(id),
  })
}

/**
 * El cronograma es una QUERY propia, no un derivado del detalle (K26): el
 * backend lo recalcula server-side en cada lectura (`reglas_simulaciones.md`
 * §4) y nunca se persiste. Por eso no se cachea agresivamente y toda escritura
 * sobre la simulación lo invalida.
 */
export function useCronograma(id: number) {
  return useQuery({
    queryKey: qk.simulacionCronograma(id),
    queryFn: () => simulacionesApi.cronograma(id),
    enabled: idValido(id),
  })
}

/**
 * Ventana de 7 días / 15 versiones, no la bitácora completa (§23). Es server
 * state: TanStack Query, nunca Zustand (`CLAUDE.md` regla 3).
 */
export function useHistorialSimulacion(id: number) {
  return useQuery({
    queryKey: qk.simulacionHistorial(id),
    queryFn: () => simulacionesApi.historial(id),
    enabled: idValido(id),
  })
}

/**
 * Invalidación compartida por TODAS las mutaciones de simulación (D18).
 *
 * Cualquier escritura sobre una simulación cambia `cuota_quantum` del ítem, y
 * con ella `cuota_quantum_total`, `cuota_total` y `cuota_diaria_total` de la
 * oportunidad. Dejar cualquiera de estas fuera deja un monto viejo en pantalla
 * (`CLAUDE.md` regla 4, `TESTING-frontend.md` §4.4). Es exactamente la
 * regresión B1 que `useActualizarItem` tuvo que corregir: invalidar solo las
 * keys del propio módulo compila, pasa los tipos y miente en pantalla.
 *
 * `qk.simulaciones` es prefijo de todos los detalles (K25), así que arrastra
 * también a las OTRAS simulaciones del mismo ítem — necesario porque marcar una
 * como principal les quita `es_principal` a las demás sin que el backend las
 * devuelva en la respuesta.
 *
 * `idOportunidad` es `null` para una simulación sin ítem (§23): en ese caso no
 * hay detalle de oportunidad que invalidar, y construir una key con `null`
 * sería basura en la cache. La LISTA sí se invalida igual, porque enlazar o
 * desenlazar cambia lo que el Pipeline agrega.
 */
function invalidarTrasEscritura(qc: QueryClient, id: number, idOportunidad: number | null): void {
  invalidar(
    qc,
    qk.simulaciones,
    qk.simulacion(id),
    qk.simulacionCronograma(id),
    qk.simulacionHistorial(id),
    qk.oportunidades,
  )
  if (idOportunidad !== null) invalidar(qc, qk.oportunidad(idOportunidad))
}

export function useCrearSimulacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearSimulacionInput) => simulacionesApi.crear(input),
    onSuccess: (data) => invalidarTrasEscritura(qc, data.id, data.id_oportunidad),
  })
}

export function useActualizarSimulacion(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ActualizarSimulacionInput) => simulacionesApi.actualizar(id, input),
    // `id_oportunidad` se lee de la RESPUESTA, no de un parámetro del hook: el
    // PATCH puede enlazar la simulación a un ítem, y entonces la oportunidad a
    // invalidar es una que el llamante no conocía al montar el hook.
    onSuccess: (data) => invalidarTrasEscritura(qc, id, data.id_oportunidad),
  })
}

/**
 * `DELETE` responde 204 sin body: no hay de dónde sacar `id_oportunidad`, así
 * que lo aporta quien llama (lo tiene, porque estaba viendo la simulación).
 * Se quita el detalle de la cache además de invalidarlo: la fila ya no existe
 * y un refetch respondería 404.
 */
export function useEliminarSimulacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: number; idOportunidad: number | null }) =>
      simulacionesApi.eliminar(variables.id),
    onSuccess: (_data, variables) => {
      qc.removeQueries({ queryKey: qk.simulacion(variables.id) })
      invalidarTrasEscritura(qc, variables.id, variables.idOportunidad)
    },
  })
}

/**
 * Restaura un snapshot de la ventana de 7 días / 15 versiones. Recalcula
 * `cuota_final` server-side, así que la oportunidad también cambia.
 *
 * El 404 de este endpoint cubre cuatro motivos distintos y el backend no
 * distingue cuál falló a propósito: el mensaje al usuario debe ser genérico
 * ("esa versión ya no se puede restaurar", encargo §9), nunca "no tenés
 * permiso" — decir eso filtraría la existencia del recurso (K18).
 */
export function useRestaurarSimulacion(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idEventoLog: number) => simulacionesApi.restaurar(id, idEventoLog),
    onSuccess: (data) => invalidarTrasEscritura(qc, id, data.id_oportunidad),
  })
}

/**
 * "Guardar como Nueva Simulación": crea una fila NUEVA y deja el origen intacto
 * (§23). Se invalida con el id de la nueva, no con el del origen — el origen no
 * recibe evento propio, y `qk.simulaciones` ya lo alcanza por prefijo.
 */
export function useBifurcarSimulacion(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: BifurcarSimulacionInput) => simulacionesApi.bifurcar(id, input),
    onSuccess: (data) => invalidarTrasEscritura(qc, data.id, data.id_oportunidad),
  })
}

/**
 * Marca la simulación como principal de su ítem. Es la que fija qué cuota usa
 * la oportunidad, así que invalidarla es lo que evita que el Pipeline siga
 * mostrando la cuota de la simulación anterior.
 *
 * Que ya fuera principal es un NO-OP EXITOSO, no un error (§23).
 */
export function useMarcarPrincipal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => simulacionesApi.marcarPrincipal(id),
    onSuccess: (data) => invalidarTrasEscritura(qc, data.id, data.id_oportunidad),
  })
}
