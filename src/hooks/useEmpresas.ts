import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { empresasApi } from '@/api/empresas'
import { contactosApi } from '@/api/contactos'
import type {
  ActualizarEmpresaInput,
  CarteraMaestraInput,
  CrearContactoInput,
  CrearEmpresaInput,
  EmpresasFiltros,
  EstadoCartera,
  VincularContactoInput,
} from '@/types'
import { invalidar, qk } from './queryKeys'

export function useEmpresas(filtros?: EmpresasFiltros) {
  return useQuery({
    queryKey: [...qk.empresas, filtros ?? {}],
    queryFn: () => empresasApi.listar(filtros),
  })
}

export function useEmpresa(id: number) {
  return useQuery({
    queryKey: qk.empresa(id),
    queryFn: () => empresasApi.obtener(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

/** Invalidación 360 de todo lo que muestra datos de empresa */
function invalidarEmpresa(qc: ReturnType<typeof useQueryClient>, id?: number) {
  invalidar(qc, qk.empresas, qk.inicio, qk.prospeccion, qk.tareas, qk.oportunidades)
  if (id) invalidar(qc, qk.empresa(id))
}

export function useCrearEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearEmpresaInput) => empresasApi.crear(input),
    onSuccess: () => invalidarEmpresa(qc),
  })
}

export function useActualizarEmpresa(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ActualizarEmpresaInput) => empresasApi.actualizar(id, input),
    onSuccess: () => invalidarEmpresa(qc, id),
  })
}

export function useCambiarEstadoCartera(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (estado: EstadoCartera) => empresasApi.cambiarEstadoCartera(id, estado),
    onSuccess: () => invalidarEmpresa(qc, id),
  })
}

export function useReasignarVendedor(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idVendedor: number) => empresasApi.reasignarVendedor(id, idVendedor),
    onSuccess: () => invalidarEmpresa(qc, id),
  })
}

export function useCambiarCarteraMaestra(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CarteraMaestraInput) => empresasApi.cambiarCarteraMaestra(id, input),
    // Mover/liberar cambia visibilidad y asignación → invalidación amplia
    onSuccess: () => invalidarEmpresa(qc, id),
  })
}

/**
 * Único uso hoy: el buscador de `AgregarContactoModal` (vincular contacto
 * existente a una empresa). Usa `buscarParaVincular` —no `buscar`— porque
 * necesita alcanzar todo el CRM para el chequeo anti-duplicados; el backend
 * redacta la respuesta a solo nombre para roles de apoyo (PR #11).
 */
export function useBuscarContactos(q: string, enabled = true) {
  return useQuery({
    queryKey: [...qk.contactos, 'vincular', { q }],
    queryFn: () => contactosApi.buscarParaVincular({ q }),
    enabled: enabled && q.trim().length >= 2,
  })
}

export function useCrearContacto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearContactoInput) => contactosApi.crear(input),
    onSuccess: (_data, variables) => {
      invalidar(qc, qk.contactos, qk.prospeccion, qk.inicio)
      invalidarEmpresa(qc, variables.id_empresa)
    },
  })
}

export function useActualizarContacto(idEmpresa: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CrearContactoInput> }) =>
      contactosApi.actualizar(id, input),
    onSuccess: () => {
      invalidar(qc, qk.contactos)
      invalidarEmpresa(qc, idEmpresa)
    },
  })
}

// `qk.contactos` alcanza también a los detalles de contacto (ver la invariante
// de prefijos en queryKeys.ts), que listan las empresas a las que pertenecen.
export function useVincularContacto(idEmpresa: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: VincularContactoInput) => empresasApi.vincularContacto(idEmpresa, input),
    onSuccess: () => {
      invalidar(qc, qk.contactos)
      invalidarEmpresa(qc, idEmpresa)
    },
  })
}

export function useDesvincularContacto(idEmpresa: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (idContacto: number) => empresasApi.desvincularContacto(idEmpresa, idContacto),
    onSuccess: () => {
      invalidar(qc, qk.contactos)
      invalidarEmpresa(qc, idEmpresa)
    },
  })
}

/**
 * Elimina la empresa (solo admin, backend rechaza con 403 al resto).
 * Cascada del backend: se borran también sus oportunidades, tareas y eventos.
 * Los contactos NO se borran, solo se desvinculan — por eso invalidamos su lista también.
 */
export function useEliminarEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => empresasApi.eliminar(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: qk.empresa(id) })
      invalidar(qc, qk.empresas, qk.inicio, qk.prospeccion, qk.tareas, qk.oportunidades, qk.contactos, qk.reportes)
    },
  })
}
