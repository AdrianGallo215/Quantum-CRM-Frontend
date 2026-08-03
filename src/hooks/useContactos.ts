import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contactosApi } from '@/api/contactos'
import type { ContactosFiltros, CrearContactoInput } from '@/types'
import { invalidar, qk } from './queryKeys'

export function useContactos(filtros?: ContactosFiltros) {
  return useQuery({
    queryKey: [...qk.contactos, filtros ?? {}],
    queryFn: () => contactosApi.listar(filtros),
  })
}

export function useContacto(id: number) {
  return useQuery({
    queryKey: qk.contacto(id),
    queryFn: () => contactosApi.obtener(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useActualizarContactoDetalle(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<CrearContactoInput>) => contactosApi.actualizar(id, input),
    onSuccess: () => {
      invalidar(qc, qk.contacto(id), qk.contactos, qk.empresas, qk.oportunidades, qk.prospeccion, qk.inicio)
    },
  })
}
