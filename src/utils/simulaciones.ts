import { formatoMonto } from './formato'

/**
 * Parámetros por defecto del simulador (`reglas_simulaciones.md` §6.1, encargo §7.7).
 * Constantes de código, no configurables en BD.
 *
 * Se usan para PRELLENAR el formulario, no para completar el request: el backend
 * rellena exactamente estos mismos valores si los campos se omiten. Enviarlos es
 * redundante pero inofensivo; lo que sería un bug es que estas dos tablas divergieran.
 * Si cambian en el backend, cambian acá en el mismo commit.
 *
 * `precio_venta` y `descuento` NO están acá: se toman del ítem.
 */
export const DEFAULTS_SIMULACION = {
  plazo_meses: 48,
  tea: '14',
  cuota_inicial: '45000',
  valor_residual: '25000',
  dias_trabajados: 22,
  comision_estructuracion: '1180',
} as const

/**
 * Cuota para mostrar. `null` NO es cero ni un guion: es "no se puede calcular
 * todavía". Un guion suelto se lee como un monto vacío y el encargo §4.1 lo prohíbe
 * explícitamente.
 */
export function formatoCuota(valor: string | null): string {
  if (valor === null) return 'Sin calcular'
  return formatoMonto(valor)
}

/**
 * Formatea `tea` de Simulaciones/Calculadora, **NO** la de `Financiadora`.
 *
 * Encargo §7.6: acá `tea` va en escala **1-100** (ej. `"14.00"` → `14.00%`). En
 * `financiadoras` la misma clave es **fraccionaria** (contrato §13: `"0.0000"`). Son
 * escalas distintas para el mismo nombre de campo — usar este helper para la `tea` de
 * `financiadoras` la mostraría mal por un factor de 100.
 *
 * No unificar con el formateo de `Financiadora.tea` "por DRY": son datos distintos.
 */
export function formatoTea(valor: string): string {
  const n = Number(valor)
  if (Number.isNaN(n)) return '—'
  return `${n.toFixed(2)}%`
}

/**
 * Formatea `tasa_nominal_mensual`. No es un monto (K19): el contrato la envía como
 * `string` **sin redondear** a propósito (`reglas_simulaciones.md` §3.1: "La Tasa
 * Nominal Mensual no se redondea nunca"). Se muestra con 6 decimales — precisión
 * suficiente para que se vea que no está redondeada, sin volcar los ~18 dígitos que
 * llegan del backend.
 *
 * Helper propio, separado de `formatoMonto`: nunca usar `formatoMonto` para este campo.
 */
export function formatoTasa(valor: string): string {
  const n = Number(valor)*100
  if (Number.isNaN(n)) return '—'
  return `${n.toFixed(6)}%`
}

/**
 * Validaciones que el backend impone (§13 de `reglas_simulaciones.md`). Replicarlas
 * acá evita el round-trip, pero la validación AUTORITATIVA es siempre la del backend:
 * hay que manejar el `400 VALIDACION` igual (`CLAUDE.md` regla 7). UX, no seguridad
 * (`CLAUDE.md` regla 8).
 */
export function validarCuotaInicial(
  cuotaInicial: number,
  precioVenta: number,
  descuento: number,
): string | null {
  const pvEfectivo = precioVenta * (1 - descuento / 100)
  return cuotaInicial < pvEfectivo
    ? null
    : 'La cuota inicial debe ser menor que el precio con descuento'
}

/**
 * `valor_residual < Principal`. El Principal depende del modo (leasing/crédito
 * directo), así que se recibe ya calculado por quien lo tenga — no se recalcula acá,
 * el motor de cálculo es del backend (`reglas_simulaciones.md` §3).
 */
export function validarValorResidual(valorResidual: number, principal: number): string | null {
  return valorResidual < principal
    ? null
    : 'El valor residual debe ser menor que el principal'
}
