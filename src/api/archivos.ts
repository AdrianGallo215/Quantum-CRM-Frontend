import { apiClient, get, post } from './client'
import type { ApiResponse, ArchivoDrive, CarpetaDriveCreada, TipoEntidadArchivo } from '@/types'

/**
 * El backend expone el recurso bajo el segmento plural de cada entidad.
 * Los tres endpoints son idénticos en forma para empresa y oportunidad, por eso
 * un solo módulo genérico en vez de funciones duplicadas.
 */
const SEGMENTO: Record<TipoEntidadArchivo, string> = {
  empresa: 'empresas',
  oportunidad: 'oportunidades',
}

export const archivosApi = {
  /** GET /{empresas|oportunidades}/:id/archivos — el backend devuelve orden alfabético por nombre. */
  listar: async (tipo: TipoEntidadArchivo, id: number): Promise<ArchivoDrive[]> => {
    const res = await get<ArchivoDrive[]>(`/${SEGMENTO[tipo]}/${id}/archivos`)
    return res.data
  },

  /** POST /{empresas|oportunidades}/:id/archivos — multipart/form-data, campo `file`. */
  subir: async (tipo: TipoEntidadArchivo, id: number, file: File): Promise<ArchivoDrive> => {
    const formData = new FormData()
    // El nombre del campo es exacto y case-sensitive. No mandar otros campos.
    formData.append('file', file)
    const res = await apiClient.post<ApiResponse<ArchivoDrive>>(
      `/${SEGMENTO[tipo]}/${id}/archivos`,
      formData,
      {
        // Content-Type: undefined anula el default JSON de la instancia para que
        // el browser genere el boundary del multipart. Fijarlo a mano rompe el
        // parseo en el backend. (Mismo patrón que src/api/importCsvTemp.ts)
        headers: { 'Content-Type': undefined },
        // Sin límite de tiempo: los archivos pueden pesar hasta 100 MB.
        timeout: 0,
      },
    )
    return res.data.data
  },

  /**
   * POST /{empresas|oportunidades}/:id/carpeta-drive — crea la carpeta sin subir
   * nada. Sin body. Idempotente: si ya existe, devuelve la que hay sin tocar Drive.
   * La concurrencia (doble clic, dos pestañas) la resuelve un lock del servidor.
   */
  crearCarpeta: async (tipo: TipoEntidadArchivo, id: number): Promise<CarpetaDriveCreada> => {
    const res = await post<CarpetaDriveCreada>(`/${SEGMENTO[tipo]}/${id}/carpeta-drive`)
    return res.data
  },
}
