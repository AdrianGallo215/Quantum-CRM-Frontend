import { DEFAULTS_SIMULACION } from './simulaciones'
import type { ModoSimulacion } from '@/types/enums'
import type { Cronograma, Simulacion } from '@/types/simulacion'
import type { CalculadoraInput, CalculadoraResultado } from '@/types/calculadora'

/**
 * Modelo de vista de la propuesta financiera (Plan 04, D26 — resuelve K28).
 *
 * NO es una `Simulacion`: la Calculadora produce un resultado efímero que no tiene
 * `id`, `nombre` ni `es_principal` — no existe fila que los tenga (encargo §24). Un
 * solo componente con dos adaptadores es la única forma honesta de cumplir "la misma
 * `<PropuestaFinanciera/>` para ambos" (§5.6) sin que el resultado efímero finja ser
 * una fila persistida.
 *
 * Es un tipo de PRESENTACIÓN: acá no entra nada calculado. El motor de cálculo es del
 * backend (`reglas_simulaciones.md` §3) y el `cronograma` se propaga tal cual llega.
 */
export interface DatosPropuesta {
  /** Título del documento. De la simulación es su `nombre`; del cálculo efímero es
   *  un rótulo genérico, porque no hay nombre que mostrar (§24). */
  titulo: string
  /** Razón social del cliente, o `null` si no se conoce: entonces la propuesta omite
   *  el bloque de empresa en vez de dejarlo vacío. */
  empresa: string | null
  modelo: string | null
  /**
   * `null` en una huérfana y en la Calculadora: no hay ítem del cual sacarla (§8.2).
   * En ese caso la propuesta OMITE el total por N unidades y dice "Cotización por
   * unidad" — inventar `1` mostraría un total falso en cuanto se enlace a un ítem de
   * 8 unidades. Omitir es honesto; asumir, no (D26, resolución de K29).
   */
  cantidad: number | null
  parametros: {
    modo: ModoSimulacion
    precio_venta: string
    /** Escala 1-100 (`"14.00"` = 14%), la de Simulaciones — NO la fraccionaria de
     *  `financiadoras` (§7.6). Se formatea con `formatoTea`. */
    tea: string
    plazo_meses: number
    valor_residual: string
  }
  cronograma: Cronograma
  modo: ModoSimulacion
}

/** Rótulos del modo para el documento. Local a la propuesta: `ETIQUETA_*` de
 *  `utils/etiquetas.ts` no cubre `ModoSimulacion` y ese archivo no es de esta tarea. */
export const ETIQUETA_MODO_SIMULACION: Record<ModoSimulacion, string> = {
  leasing: 'Leasing',
  credito_directo: 'Crédito Directo',
}

/**
 * Origen 1: una simulación PERSISTIDA (`GET /simulaciones/:id` + su cronograma).
 *
 * `cantidad` llega por parámetro y no del DTO: la simulación es de una unidad y su
 * DTO **no trae `cantidad`** — sale del ítem vía la oportunidad (§8.2, K29). Quien
 * llama ya tiene la oportunidad cargada en el flujo real del módulo, así que no hace
 * falta un request extra. En una **huérfana** se pasa `null` y la propuesta omite el
 * total por N unidades.
 *
 * `empresa` llega por parámetro, igual que `cantidad`: el DTO `Simulacion` no trae
 * razón social (solo el ítem y la oportunidad la tienen), pero quien llama ya tiene
 * la oportunidad cargada en el flujo real del módulo (la misma que resuelve
 * `cantidad`) y puede pasar `oportunidad.empresa.razon_social` sin un request extra.
 * Es opcional y por default `null` para no romper llamadores existentes que todavía
 * no la pasan; en ese caso la propuesta omite el bloque de cliente antes que
 * inventarlo.
 */
export function propuestaDesdeSimulacion(
  s: Simulacion,
  c: Cronograma,
  cantidad: number | null,
  empresa: string | null = null,
): DatosPropuesta {
  return {
    titulo: s.nombre,
    empresa,
    modelo: s.modelo?.codigo ?? null,
    cantidad,
    parametros: {
      modo: s.modo,
      precio_venta: s.precio_venta,
      tea: s.tea,
      plazo_meses: s.plazo_meses,
      valor_residual: s.valor_residual,
    },
    cronograma: c,
    modo: s.modo,
  }
}

/**
 * Origen 2: el resultado EFÍMERO de la Calculadora (`POST /calculadora`, reglas §9).
 *
 * `empresa` y `modelo` salen del RESULTADO, no del input: el input solo tiene ids, y
 * el backend los devuelve ya resueltos precisamente para mostrarlos acá (§5.3 — no
 * participan del cálculo). Los parámetros, en cambio, solo existen en el input: el
 * resultado no los repite.
 *
 * `cantidad` es SIEMPRE `null`: en este origen no hay ítem, ni siquiera cuando se
 * eligió una empresa y un modelo — esos dos son de presentación y no llevan cantidad.
 */
export function propuestaDesdeCalculadora(
  r: CalculadoraResultado,
  input: CalculadoraInput,
): DatosPropuesta {
  return {
    titulo: 'Cotización financiera',
    empresa: r.empresa?.razon_social ?? null,
    modelo: r.modelo?.codigo ?? null,
    cantidad: null,
    parametros: {
      modo: input.modo,
      precio_venta: input.precio_venta,
      tea: input.tea,
      plazo_meses: input.plazo_meses,
      // `valor_residual` es opcional en el input: si se omite, el backend aplica el
      // default de reglas §6.1 — el mismo de `DEFAULTS_SIMULACION`. Se muestra ese,
      // que es el que de verdad se usó, no un hueco.
      valor_residual: input.valor_residual ?? DEFAULTS_SIMULACION.valor_residual,
    },
    cronograma: r.cronograma,
    modo: input.modo,
  }
}
