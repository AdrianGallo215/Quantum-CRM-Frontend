import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { metasVentaApi } from '@/api/metasVenta'
import type { CrearMetaVentaInput, EditarMetaVentaInput, MetaVentaFiltros } from '@/types'
import { invalidar, qk } from './queryKeys'

export function useMetasVenta(filtros?: MetaVentaFiltros, enabled = true) {
  return useQuery({
    queryKey: [...qk.metasVenta, filtros ?? {}],
    queryFn: () => metasVentaApi.listar(filtros),
    enabled,
  })
}

/**
 * Sincronización 360: el medidor de Inicio (meta_ventas) depende de estas
 * mutaciones, así que toda escritura invalida también qk.inicio.
 */
function invalidarMetas(qc: ReturnType<typeof useQueryClient>) {
  invalidar(qc, qk.metasVenta, qk.inicio)
}

export function useCrearMetaVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearMetaVentaInput) => metasVentaApi.crear(input),
    onSuccess: () => invalidarMetas(qc),
  })
}

export function useEditarMetaVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: EditarMetaVentaInput }) =>
      metasVentaApi.editar(id, input),
    onSuccess: () => invalidarMetas(qc),
  })
}

export function useAprobarMetaVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => metasVentaApi.aprobar(id),
    onSuccess: () => invalidarMetas(qc),
    // 409 (ya resuelta) también deja la bandeja desactualizada → refrescar
    onError: () => invalidar(qc, qk.metasVenta),
  })
}

export function useRechazarMetaVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      metasVentaApi.rechazar(id, motivo),
    onSuccess: () => invalidarMetas(qc),
    onError: () => invalidar(qc, qk.metasVenta),
  })
}
