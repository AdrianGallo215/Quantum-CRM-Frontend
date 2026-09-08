import { post } from './client'
import type { CalculadoraInput, CalculadoraResultado } from '@/types'

/**
 * Cálculo efímero. CERO persistencia: no escribe en `simulaciones` ni en la
 * bitácora, ni siquiera auditoría (reglas §9). Por eso es un POST que no invalida
 * ninguna query — no hay nada que sincronizar.
 *
 * "Enlazar a Oportunidad" NO es un endpoint de acá: es literalmente
 * `POST /simulaciones` con los mismos parámetros más el `id_oportunidad_item` (§24).
 */
export const calculadoraApi = {
  calcular: async (input: CalculadoraInput): Promise<CalculadoraResultado> => {
    const res = await post<CalculadoraResultado>('/calculadora', input)
    return res.data
  },
}
