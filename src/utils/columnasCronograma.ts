import type { ModoSimulacion } from '@/types/enums'
import type { FilaCronograma } from '@/types/simulacion'

/**
 * Único punto de verdad de "qué columnas tiene el cronograma, en qué orden, según
 * el modo" (encargo §5.4, D23 en `plan-04-mapa-vistas-simulaciones.md`).
 *
 * Lo usan DOS consumidores que no pueden divergir entre sí:
 *  - `CronogramaTabla` (cómo se ve en pantalla);
 *  - `exportarCronograma` (T7.2 — cómo se exporta a Excel).
 *
 * Ninguno de los dos define un tercer array de columnas: ambos derivan de
 * `COLUMNAS_LEASING`/`COLUMNAS_CREDITO` de este módulo. Si alguien agrega una
 * columna a la tabla y no acá, `exportarCronograma` la exporta igual (o al revés,
 * la tabla la muestra igual) — es la garantía que evita que el Excel deje de
 * reflejar lo que el usuario vio en pantalla.
 *
 * ⚠ Las columnas DEPENDEN DEL MODO. No es la misma tabla con celdas vacías: leasing
 * no desglosa IGV y su tabla/Excel NO LLEVAN esa columna. Por eso son dos arrays y
 * no uno con `oculta` condicional — con `oculta` la columna seguiría existiendo y
 * se colaría tanto en el DOM como en la exportación.
 */
export type ClaveColumnaCronograma =
  | 'mes'
  | 'saldo_inicial'
  | 'amortizacion'
  | 'interes'
  | 'igv'
  | 'saldo_final'
  | 'cuota'
  | 'cuota_con_igv'

export interface DefinicionColumnaCronograma {
  clave: ClaveColumnaCronograma
  titulo: string
  /** El `#` va a la izquierda; los montos, a la derecha (mockup H0 aprobado). */
  numerica: boolean
}

const COL_MES: DefinicionColumnaCronograma = { clave: 'mes', titulo: '#', numerica: false }
const COL_SALDO_INICIAL: DefinicionColumnaCronograma = {
  clave: 'saldo_inicial',
  titulo: 'Saldo Inicial',
  numerica: true,
}
const COL_AMORTIZACION: DefinicionColumnaCronograma = {
  clave: 'amortizacion',
  titulo: 'Amortización',
  numerica: true,
}
const COL_INTERES: DefinicionColumnaCronograma = {
  clave: 'interes',
  titulo: 'Interés',
  numerica: true,
}
const COL_IGV: DefinicionColumnaCronograma = { clave: 'igv', titulo: 'IGV', numerica: true }
const COL_SALDO_FINAL: DefinicionColumnaCronograma = {
  clave: 'saldo_final',
  titulo: 'Saldo Final',
  numerica: true,
}
const COL_CUOTA: DefinicionColumnaCronograma = { clave: 'cuota', titulo: 'Cuota', numerica: true }

/**
 * La última columna también se rotula distinto en cada modo: no unificarlas
 * — por eso cada array tiene su propia definición de `cuota_con_igv`.
 */
export const COLUMNAS_LEASING: readonly DefinicionColumnaCronograma[] = [
  COL_MES,
  COL_SALDO_INICIAL,
  COL_AMORTIZACION,
  COL_INTERES,
  COL_SALDO_FINAL,
  COL_CUOTA,
  { clave: 'cuota_con_igv', titulo: 'Cuota con IGV', numerica: true },
]

export const COLUMNAS_CREDITO: readonly DefinicionColumnaCronograma[] = [
  COL_MES,
  COL_SALDO_INICIAL,
  COL_AMORTIZACION,
  COL_INTERES,
  COL_IGV,
  COL_SALDO_FINAL,
  COL_CUOTA,
  { clave: 'cuota_con_igv', titulo: 'Cuota con IGV de Intereses', numerica: true },
]

/** Las columnas vigentes para el `modo` dado (§5.4, D23). */
export function columnasCronogramaPorModo(
  modo: ModoSimulacion,
): readonly DefinicionColumnaCronograma[] {
  return modo === 'leasing' ? COLUMNAS_LEASING : COLUMNAS_CREDITO
}

/**
 * Valor CRUDO de una celda, tal cual llega del backend: `string` para los montos
 * (o `null` en las celdas que no aplican, p. ej. el mes 0 — §5.4), `number` para
 * `mes`. Sin formatear: cada consumidor decide cómo mostrarlo (texto en pantalla
 * con `formatoMonto`, celda numérica con `numFmt` en Excel).
 */
export function valorCrudoCronograma(
  fila: FilaCronograma,
  clave: ClaveColumnaCronograma,
): string | number | null {
  switch (clave) {
    case 'mes':
      return fila.mes
    case 'saldo_inicial':
      return fila.saldo_inicial
    case 'amortizacion':
      return fila.amortizacion
    case 'interes':
      return fila.interes
    case 'igv':
      return fila.igv
    case 'saldo_final':
      return fila.saldo_final
    case 'cuota':
      return fila.cuota
    case 'cuota_con_igv':
      return fila.cuota_con_igv
    default: {
      // Exhaustividad: si se agrega una clave nueva sin actualizar este switch,
      // `tsc` falla acá en vez de devolver `undefined` en silencio.
      const _exhaustivo: never = clave
      return _exhaustivo
    }
  }
}
