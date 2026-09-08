import { useQuery } from '@tanstack/react-query'
import { tipoCambioApi } from '@/api/tipoCambio'
import { qk } from './queryKeys'

/**
 * Tipo de cambio PEN/USD de SUNAT (D16). Dato global que cambia una vez al día
 * (job de las 09:30 Lima), sin restricción de rol: lo ven todos los roles
 * autenticados, incluidos los que no tienen acceso a Simulaciones (K21).
 *
 * `data: null` con status 200 es una respuesta VÁLIDA y esperada mientras el
 * job diario no haya poblado la primera fila (§22): no es un 404 ni un error, y
 * el consumidor debe tratarla como "no hay indicador", no como fallo.
 *
 * No se reintenta agresivamente ni se refetchea al enfocar la ventana: sería
 * tráfico por un dato que no se movió desde esta mañana.
 */
export function useTipoCambio() {
  return useQuery({
    queryKey: qk.tipoCambio,
    queryFn: tipoCambioApi.obtener,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
