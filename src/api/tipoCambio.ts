import { get } from './client'
import type { TipoCambio } from '@/types'

export const tipoCambioApi = {
  /**
   * `data: null` con 200 es una respuesta VÁLIDA y esperada: el job diario todavía
   * no pobló ninguna fila. No es un 404 ni un error (§22). El tipo de retorno lo
   * refleja para que el consumidor esté obligado a tratarlo.
   */
  obtener: async (): Promise<TipoCambio | null> => {
    const res = await get<TipoCambio | null>('/tipo-cambio')
    return res.data
  },
}
