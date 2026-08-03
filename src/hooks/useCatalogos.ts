import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogoEventosApi, financiadorasApi, modelosApi } from '@/api/catalogos'
import { empleadosApi } from '@/api/empleados'
import { tieneRol, useAuthStore } from '@/store/authStore'
import type {
  ActualizarEmpleadoInput,
  CatalogoEventoInput,
  CrearEmpleadoInput,
  EmpleadoResumen,
  FinanciadoraInput,
  ModeloInput,
  Rol,
} from '@/types'
import { invalidar, qk } from './queryKeys'

// ── Empleados ──────────────────────────────────────────────

export function useEmpleados(params?: { activo?: boolean; rol?: Rol }, enabled = true) {
  return useQuery({
    queryKey: [...qk.empleados, params ?? {}],
    queryFn: () => empleadosApi.listar(params),
    enabled,
  })
}

/**
 * Empleados que pueden figurar como "vendedor asignado" (contrato §3.2 y §7.4):
 * activos con rol vendedor o jdv. NUNCA gerencia/admin/analista.
 */
const ROLES_ASIGNABLES: Rol[] = ['vendedor', 'jdv']

export function useVendedoresAsignables(enabled = true) {
  const empleados = useEmpleados({ activo: true }, enabled)
  return {
    ...empleados,
    data: empleados.data?.filter((e) => ROLES_ASIGNABLES.includes(e.rol)),
  }
}

/**
 * Empleados que el usuario logueado puede elegir como responsable/colaborador
 * de una tarea (contrato §12: vendedor/analista solo pueden elegirse a sí
 * mismos; admin/gerencia/jdv pueden elegir a cualquier empleado activo).
 */
export function useEmpleadosSeleccionables(): EmpleadoResumen[] {
  const empleadoActual = useAuthStore((s) => s.empleado)
  const soloSelf = tieneRol(empleadoActual, ['vendedor', 'analista'])
  const empleados = useEmpleados({ activo: true }, !soloSelf)
  if (soloSelf) return empleadoActual ? [empleadoActual] : []
  return empleados.data ?? []
}

export function useCrearEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearEmpleadoInput) => empleadosApi.crear(input),
    onSuccess: () => invalidar(qc, qk.empleados),
  })
}

export function useActualizarEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ActualizarEmpleadoInput }) =>
      empleadosApi.actualizar(id, input),
    onSuccess: () => invalidar(qc, qk.empleados),
  })
}

export function useCambiarActivoEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      empleadosApi.cambiarActivo(id, activo),
    onSuccess: () => invalidar(qc, qk.empleados),
  })
}

// ── Financiadoras ──────────────────────────────────────────

export function useFinanciadoras() {
  return useQuery({ queryKey: qk.financiadoras, queryFn: financiadorasApi.listar })
}

export function useCrearFinanciadora() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: FinanciadoraInput) => financiadorasApi.crear(input),
    onSuccess: () => invalidar(qc, qk.financiadoras, qk.oportunidades),
  })
}

export function useActualizarFinanciadora() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<FinanciadoraInput> }) =>
      financiadorasApi.actualizar(id, input),
    onSuccess: () => invalidar(qc, qk.financiadoras, qk.oportunidades, qk.inicio),
  })
}

// ── Modelos ────────────────────────────────────────────────

export function useModelos() {
  return useQuery({ queryKey: qk.modelos, queryFn: modelosApi.listar })
}

export function useCrearModelo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ModeloInput) => modelosApi.crear(input),
    onSuccess: () => invalidar(qc, qk.modelos),
  })
}

export function useActualizarModelo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<ModeloInput> }) =>
      modelosApi.actualizar(id, input),
    onSuccess: () => invalidar(qc, qk.modelos, qk.oportunidades, qk.inicio),
  })
}

// ── Catálogo de eventos ────────────────────────────────────

export function useCatalogoEventos() {
  return useQuery({ queryKey: qk.catalogoEventos, queryFn: () => catalogoEventosApi.listar() })
}

export function useCrearCatalogoEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CatalogoEventoInput) => catalogoEventosApi.crear(input),
    onSuccess: () => invalidar(qc, qk.catalogoEventos),
  })
}

export function useActualizarCatalogoEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CatalogoEventoInput> }) =>
      catalogoEventosApi.actualizar(id, input),
    onSuccess: () => invalidar(qc, qk.catalogoEventos),
  })
}
