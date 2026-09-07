/**
 * Monto de UN ítem (un modelo) para mostrar en la UI.
 * SOLO presentación: el valor autoritativo lo calcula y persiste el backend.
 * `monto_total` NUNCA se envía en ningún body (CLAUDE.md regla 10).
 */
export function calcularMontoItem(
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
 * Monto de toda la oportunidad: suma de los montos de sus ítems.
 * Redondea POR ÍTEM antes de sumar, igual que el backend, que suma `monto_item`
 * ya redondeados. Redondear solo al final daría céntimos de diferencia contra
 * `monto_total` — y el usuario vería dos totales distintos en la misma pantalla.
 */
export function calcularMontoOportunidad(
  items: readonly {
    cantidad: number | null | undefined
    precio_venta: string | number | null | undefined
    descuento: string | number | null | undefined
  }[],
): number {
  const total = items.reduce(
    (acc, it) => acc + calcularMontoItem(it.cantidad, it.precio_venta, it.descuento),
    0,
  )
  return Math.round(total * 100) / 100
}

/**
 * Importe (no porcentaje) que se descuenta del bruto de un ítem. Vive aquí y no
 * en el componente para que use exactamente el mismo redondeo que
 * `calcularMontoItem`: si divergen, el desglose no cuadra con el total que
 * muestra al lado.
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
