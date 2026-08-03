import { get } from './client'
import type { ApiResponse, ProspeccionItem } from '@/types'

export const prospeccionApi = {
  listar: async (params?: { page?: number; per_page?: number }): Promise<ApiResponse<ProspeccionItem[]>> => {
    return get<ProspeccionItem[]>('/prospeccion', params)
  },
}
