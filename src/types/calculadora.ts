import type { ModoSimulacion } from './enums'
import type { Modelo } from './catalogos'
import type { Cronograma } from './simulacion'

/** `POST /calculadora`. Cero persistencia (reglas §9). `id_empresa`/`id_modelo` son
 *  opcionales y PURAMENTE de presentación: no participan del cálculo. */
export interface CalculadoraInput {
  modo: ModoSimulacion
  precio_venta: string
  cuota_inicial: string
  plazo_meses: number
  tea: string
  id_empresa?: number | null
  id_modelo?: number | null
  descuento?: string
  valor_residual?: string
  dias_trabajados?: number
  comision_estructuracion?: string
}

/**
 * No devuelve `cuota_total`: esa suma solo existe dentro de una oportunidad, donde
 * hay un ítem del cual leer `cuota_financiadora`. Antes de enlazar no hay ítem (§24).
 */
export interface CalculadoraResultado {
  empresa: { id: number; razon_social: string } | null
  modelo: Pick<Modelo, 'id' | 'codigo'> | null
  cronograma: Cronograma
}
