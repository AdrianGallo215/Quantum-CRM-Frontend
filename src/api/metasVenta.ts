import { get, post, patch } from './client'
import type {
  ApiResponse,
  CrearMetaVentaInput,
  EditarMetaVentaInput,
  MetaVenta,
  MetaVentaFiltros,
} from '@/types'

export const metasVentaApi = {
  listar: async (filtros?: MetaVentaFiltros): Promise<ApiResponse<MetaVenta[]>> => {
    return get<MetaVenta[]>('/metas-venta', filtros as Record<string, unknown>)
  },

  /** Propone (rol jdv, queda 'propuesta') o crea ya aprobada (rol gerencia/admin). Body: 12 meses + id_empleado + anio. */
  crear: async (input: CrearMetaVentaInput): Promise<MetaVenta> => {
    const res = await post<MetaVenta>('/metas-venta', input)
    return res.data
  },

  /** Edita un subconjunto de meses; la meta queda siempre 'aprobada' tras esta llamada. */
  editar: async (id: number, input: EditarMetaVentaInput): Promise<MetaVenta> => {
    const res = await patch<MetaVenta>(`/metas-venta/${id}`, input)
    return res.data
  },

  /** Aprueba tal cual fue propuesta. Body vacío. */
  aprobar: async (id: number): Promise<MetaVenta> => {
    const res = await patch<MetaVenta>(`/metas-venta/${id}/aprobar`, {})
    return res.data
  },

  /** Rechaza; el motivo es obligatorio. */
  rechazar: async (id: number, motivo: string): Promise<MetaVenta> => {
    const res = await patch<MetaVenta>(`/metas-venta/${id}/rechazar`, { motivo })
    return res.data
  },
}
