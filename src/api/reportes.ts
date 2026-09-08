import { apiClient, get } from './client'
import { nombreArchivoDesde } from '@/utils/descargaArchivos'
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

const NOMBRE_EXPORT_COMERCIAL_POR_DEFECTO = 'gestion-comercial.xlsx'

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
  /**
   * Único endpoint del contrato cuyo 200 no trae el envelope `{data, meta,
   * error}` (contrato §18, encargo `export-comercial_contrato_frontend.md`
   * §2) — el cuerpo es el `.xlsx` binario, así que se pide como blob en vez de
   * pasar por el helper `get<T>`.
   */
  exportarComercial: async (f?: ReporteFiltros): Promise<{ blob: Blob; nombreArchivo: string }> => {
    const res = await apiClient.get<Blob>('/reportes/exportar-comercial', {
      params: p(f),
      responseType: 'blob',
    })
    const headers = res.headers as Record<string, string | undefined>
    return {
      blob: res.data,
      nombreArchivo: nombreArchivoDesde(
        headers['content-disposition'],
        NOMBRE_EXPORT_COMERCIAL_POR_DEFECTO,
      ),
    }
  },
}
