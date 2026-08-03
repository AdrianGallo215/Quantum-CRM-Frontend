import { get, post, put, patch } from './client'
import type {
  ActualizarEventoInput,
  CrearEventoInput,
  Evento,
  EventosAgrupados,
  EventosDeOportunidad,
  MarcarOcurridoResponse,
} from '@/types'

export const eventosApi = {
  deOportunidad: async (idOportunidad: number): Promise<EventosDeOportunidad> => {
    const res = await get<EventosDeOportunidad>(`/oportunidades/${idOportunidad}/eventos`)
    return res.data
  },

  crear: async (idOportunidad: number, input: CrearEventoInput): Promise<Evento> => {
    const res = await post<Evento>(`/oportunidades/${idOportunidad}/eventos`, input)
    return res.data
  },

  // Pendiente en backend — ver docs/solicitud-backend-eventos-empresa.md
  deEmpresa: async (idEmpresa: number): Promise<EventosAgrupados> => {
    const res = await get<EventosAgrupados>(`/empresas/${idEmpresa}/eventos`)
    return res.data
  },

  // Pendiente en backend — ver docs/solicitud-backend-eventos-empresa.md
  crearEnEmpresa: async (idEmpresa: number, input: CrearEventoInput): Promise<Evento> => {
    const res = await post<Evento>(`/empresas/${idEmpresa}/eventos`, input)
    return res.data
  },

  marcarOcurrido: async (
    idEvento: number,
    input?: { fecha_ocurrencia?: string; descripcion?: string | null },
  ): Promise<MarcarOcurridoResponse> => {
    const res = await patch<MarcarOcurridoResponse>(`/eventos/${idEvento}/ocurrido`, input ?? {})
    return res.data
  },

  marcarDescartado: async (idEvento: number, descripcion?: string): Promise<void> => {
    await patch(`/eventos/${idEvento}/descartado`, descripcion ? { descripcion } : {})
  },

  actualizar: async (idEvento: number, input: ActualizarEventoInput): Promise<Evento> => {
    const res = await put<Evento>(`/eventos/${idEvento}`, input)
    return res.data
  },
}
