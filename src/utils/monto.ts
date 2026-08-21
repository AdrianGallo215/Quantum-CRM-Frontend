/**
 * Cálculo en vivo de monto_total para mostrar en la UI.
 * SOLO presentación: el valor autoritativo lo calcula y persiste el backend.
 * monto_total NUNCA se envía en ningún body.
 */
export function calcularMontoTotal(
  cantidad: number | null | undefined,
  precioUnitario: string | number | null | undefined,
  dcto: string | number | null | undefined,
): number {
  const qty = Number(cantidad ?? 0)
  const precio = Number(precioUnitario ?? 0)
  const descuento = Number(dcto ?? 0)
  if (Number.isNaN(qty) || Number.isNaN(precio) || Number.isNaN(descuento)) return 0
  const bruto = qty * precio
  const total = bruto * (1 - descuento / 100)
  return Math.round(total * 100) / 100
}

/**
 * Importe (no porcentaje) que se descuenta del bruto. Vive aquí y no en el
 * componente para que use exactamente el mismo redondeo que `calcularMontoTotal`:
 * si divergen, el desglose no cuadra con el total que muestra al lado.
 */
export function calcularDescuento(
  cantidad: number | null | undefined,
  precioUnitario: string | number | null | undefined,
  dcto: string | number | null | undefined,
): number {
  const qty = Number(cantidad ?? 0)
  const precio = Number(precioUnitario ?? 0)
  const descuento = Number(dcto ?? 0)
  if (Number.isNaN(qty) || Number.isNaN(precio) || Number.isNaN(descuento)) return 0
  return Math.round(qty * precio * (descuento / 100) * 100) / 100
}
