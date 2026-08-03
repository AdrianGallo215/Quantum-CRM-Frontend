import { apiClient } from './client'
import type { ApiResponse, ImportCsvResultado } from '@/types'

export const importCsvTempApi = {
  importarEmpresas: async (file: File): Promise<ImportCsvResultado> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post<ApiResponse<ImportCsvResultado>>(
      '/import-csv-temp/empresas',
      formData,
      { headers: { 'Content-Type': undefined } },
    )
    return res.data.data
  },
}
