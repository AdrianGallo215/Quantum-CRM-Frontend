import { useMutation } from '@tanstack/react-query'
import { calculadoraApi } from '@/api/calculadora'

/**
 * La Calculadora es un POST efímero sin persistencia (`reglas_simulaciones.md`
 * §9). Se modela como MUTACIÓN, no como query (D17): no hay recurso que cachear
 * ni invalidar, y una query daría a entender que hay algo guardado del otro
 * lado — además de lanzarse sola al montar y al reenfocar la ventana.
 *
 * NO invalida nada, a propósito: el backend no escribe ni en `simulaciones` ni
 * en la bitácora, así que no hay ninguna vista del CRM que pueda haber quedado
 * desactualizada por un cálculo.
 *
 * "Enlazar a Oportunidad" NO se hace desde acá: es `POST /simulaciones` con los
 * mismos parámetros más el `id_oportunidad_item` (§24) — o sea,
 * `useCrearSimulacion`, que sí invalida la oportunidad (D18).
 */
export function useCalculadora() {
  return useMutation({ mutationFn: calculadoraApi.calcular })
}
