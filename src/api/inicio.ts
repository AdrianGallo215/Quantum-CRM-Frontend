import { get } from './client'
import type { InicioData } from '@/types'

export const inicioApi = {
  obtener: async (): Promise<InicioData> => {
    const res = await get<InicioData>('/inicio')
    return res.data
  },
}
