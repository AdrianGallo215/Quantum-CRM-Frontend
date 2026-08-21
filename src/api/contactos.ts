import { get, post, put, del } from './client'
import type {
  ApiResponse,
  Contacto,
  ContactoDetalle,
  ContactoListItem,
  ContactosFiltros,
  CrearContactoInput,
} from '@/types'

export const contactosApi = {
  buscar: async (params?: { q?: string; id_empresa?: number }): Promise<Contacto[]> => {
    const res = await get<Contacto[]>('/contactos', params)
    return res.data
  },

  /**
   * Variante de `buscar` para el flujo de "vincular contacto existente" a una
   * empresa (`AgregarContactoModal`). `contexto=vincular` le pide al backend
   * buscar en TODO el CRM —no solo en la cartera visible del usuario— para no
   * bloquear el chequeo anti-duplicados (PRD §9.7); a cambio, para roles de
   * apoyo la respuesta llega redactada a solo `id`/`nombres`/`apellidos`.
   * NO usar en el listado general de /contactos, que no necesita (ni debe
   * recibir) este parámetro — ver respuesta de backend, PR #11.
   */
  buscarParaVincular: async (params: { q: string }): Promise<Contacto[]> => {
    const res = await get<Contacto[]>('/contactos', { ...params, contexto: 'vincular' })
    return res.data
  },

  listar: async (filtros?: ContactosFiltros): Promise<ApiResponse<ContactoListItem[]>> => {
    return get<ContactoListItem[]>('/contactos', filtros as Record<string, unknown>)
  },

  obtener: async (id: number): Promise<ContactoDetalle> => {
    const res = await get<ContactoDetalle>(`/contactos/${id}`)
    return res.data
  },

  crear: async (input: CrearContactoInput): Promise<Contacto> => {
    const res = await post<Contacto>('/contactos', input)
    return res.data
  },

  actualizar: async (id: number, input: Partial<CrearContactoInput>): Promise<Contacto> => {
    const res = await put<Contacto>(`/contactos/${id}`, input)
    return res.data
  },

  eliminar: async (id: number): Promise<void> => {
    await del(`/contactos/${id}`)
  },
}
