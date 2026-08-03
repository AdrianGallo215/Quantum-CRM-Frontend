import { get } from './client'
import type {
  ApiResponse,
  ReporteDescuentos,
  ReporteEquipoItem,
  ReporteFiltros,
  ReportePipeline,
  ReporteProspeccion,
  ReporteVelocidadEtapa,
  ReporteVentas,
} from '@/types'

const p = (f?: ReporteFiltros) => f as Record<string, unknown> | undefined

export const reportesApi = {
  ventas: async (f?: ReporteFiltros): Promise<ReporteVentas> => {
    const res = await get<ReporteVentas>('/reportes/ventas', p(f))
    return res.data
  },
  pipeline: async (): Promise<ReportePipeline> => {
    const res = await get<ReportePipeline>('/reportes/pipeline')
    return res.data
  },
  equipo: async (f?: ReporteFiltros): Promise<ReporteEquipoItem[]> => {
    const res = await get<ReporteEquipoItem[]>('/reportes/equipo', p(f))
    return res.data
  },
  velocidadEtapas: async (): Promise<ApiResponse<ReporteVelocidadEtapa[]>> => {
    return get<ReporteVelocidadEtapa[]>('/reportes/velocidad-etapas')
  },
  prospeccion: async (f?: ReporteFiltros): Promise<ReporteProspeccion> => {
    const res = await get<ReporteProspeccion>('/reportes/prospeccion', p(f))
    return res.data
  },
  descuentos: async (f?: ReporteFiltros): Promise<ReporteDescuentos> => {
    const res = await get<ReporteDescuentos>('/reportes/descuentos', p(f))
    return res.data
  },
}
