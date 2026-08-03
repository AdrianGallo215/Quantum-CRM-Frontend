import { get, post, put, patch, del } from './client'
import type {
  ActualizarEmpresaInput,
  ApiResponse,
  CarteraMaestraInput,
  CheckRucResponse,
  CrearEmpresaInput,
  Empresa,
  EmpresaListItem,
  EmpresasFiltros,
  EstadoCartera,
  VincularContactoInput,
} from '@/types'

export const empresasApi = {
  listar: async (filtros?: EmpresasFiltros): Promise<ApiResponse<EmpresaListItem[]>> => {
    return get<EmpresaListItem[]>('/empresas', filtros as Record<string, unknown>)
  },

  obtener: async (id: number): Promise<Empresa> => {
    const res = await get<Empresa>(`/empresas/${id}`)
    return res.data
  },

  checkRuc: async (ruc: string): Promise<CheckRucResponse> => {
    const res = await get<CheckRucResponse>(`/empresas/ruc/${ruc}`)
    return res.data
  },

  crear: async (input: CrearEmpresaInput): Promise<Empresa> => {
    const res = await post<Empresa>('/empresas', input)
    return res.data
  },

  actualizar: async (id: number, input: ActualizarEmpresaInput): Promise<Empresa> => {
    const res = await put<Empresa>(`/empresas/${id}`, input)
    return res.data
  },

  cambiarEstadoCartera: async (id: number, estado_cartera: EstadoCartera): Promise<void> => {
    await patch(`/empresas/${id}/estado-cartera`, { estado_cartera })
  },

  reasignarVendedor: async (id: number, id_vendedor: number): Promise<void> => {
    await patch(`/empresas/${id}/vendedor`, { id_vendedor })
  },

  cambiarCarteraMaestra: async (id: number, input: CarteraMaestraInput): Promise<void> => {
    await patch(`/empresas/${id}/cartera-maestra`, input)
  },

  vincularContacto: async (idEmpresa: number, input: VincularContactoInput): Promise<void> => {
    await post(`/empresas/${idEmpresa}/contactos`, input)
  },

  actualizarVinculacion: async (
    idEmpresa: number,
    idContacto: number,
    input: Omit<VincularContactoInput, 'id_contacto'>,
  ): Promise<void> => {
    await put(`/empresas/${idEmpresa}/contactos/${idContacto}`, input)
  },

  desvincularContacto: async (idEmpresa: number, idContacto: number): Promise<void> => {
    await del(`/empresas/${idEmpresa}/contactos/${idContacto}`)
  },

  eliminar: async (id: number): Promise<void> => {
    await del(`/empresas/${id}`)
  },
}
